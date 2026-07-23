import { describe, expect, it, vi } from "vitest";
import {
  createConversationInsightSettingsHandlers,
  type ConversationInsightSettingsRecord,
} from "../apps/vase-labs/app/api/labs/settings/conversation-insights/route";

const defaultWeights = {
  purchaseIntent: 25,
  productDefined: 15,
  budgetAcceptance: 15,
  urgency: 15,
  contactOrFulfillmentData: 10,
  interactionDepth: 10,
  objectionsOrNegativeSignals: -10,
};

function patchRequest(body: unknown) {
  return new Request("https://labs.vase.ar/api/labs/settings/conversation-insights", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: "vase_labs_session=signed",
    },
    body: JSON.stringify(body),
  });
}

function getRequest() {
  return new Request("https://labs.vase.ar/api/labs/settings/conversation-insights", {
    headers: { cookie: "vase_labs_session=signed" },
  });
}

function persistedSettings(overrides: Partial<ConversationInsightSettingsRecord> = {}) {
  return {
    version: 1,
    hotLeadThreshold: 75,
    weights: { ...defaultWeights },
    ...overrides,
  };
}

function handlers(input?: {
  assistantId?: string;
  current?: ConversationInsightSettingsRecord | null;
}) {
  const assistantId = input?.assistantId ?? "assistant_resolved";
  const findSettings = vi.fn(async () => input?.current ?? null);
  const upsertSettings = vi.fn(async (
    _resolvedAssistantId: string,
    settings: ConversationInsightSettingsRecord,
  ) => settings);
  const result = createConversationInsightSettingsHandlers({
    resolveContext: vi.fn(async () => ({ assistant: { id: assistantId } })),
    findSettings,
    upsertSettings,
  });
  return { ...result, findSettings, upsertSettings };
}

describe("conversation insight settings route", () => {
  it("requires an authenticated Labs request context", async () => {
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => {
        throw new Error("LABS_SESSION_REQUIRED");
      }),
      findSettings: vi.fn(),
      upsertSettings: vi.fn(),
    });

    const response = await route.GET(getRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Necesitás iniciar sesión para continuar.",
    });
  });

  it("returns defaults for the resolved assistant when no record exists", async () => {
    const route = handlers();

    const response = await route.GET(getRequest());

    expect(response.status).toBe(200);
    expect(route.findSettings).toHaveBeenCalledWith("assistant_resolved");
    expect(await response.json()).toEqual({
      settings: {
        version: 1,
        hotLeadThreshold: 75,
        weights: defaultWeights,
      },
    });
  });

  it("upserts only the resolved assistant and advances the settings version", async () => {
    const route = handlers({ current: persistedSettings() });

    const response = await route.PATCH(patchRequest({
      assistantId: "assistant_attacker",
      globalTenantId: "tenant_attacker",
      version: 1,
      hotLeadThreshold: 82,
      weights: {
        purchaseIntent: 30,
        productDefined: 15,
        budgetAcceptance: 15,
        urgency: 15,
        contactOrFulfillmentData: 10,
        interactionDepth: 10,
        objectionsOrNegativeSignals: -5,
      },
    }));

    expect(response.status).toBe(200);
    expect(route.upsertSettings).toHaveBeenCalledWith("assistant_resolved", {
      version: 2,
      hotLeadThreshold: 82,
      weights: {
        purchaseIntent: 30,
        productDefined: 15,
        budgetAcceptance: 15,
        urgency: 15,
        contactOrFulfillmentData: 10,
        interactionDepth: 10,
        objectionsOrNegativeSignals: -5,
      },
    });
    expect(await response.json()).toEqual({
      settings: {
        version: 2,
        hotLeadThreshold: 82,
        weights: {
          purchaseIntent: 30,
          productDefined: 15,
          budgetAcceptance: 15,
          urgency: 15,
          contactOrFulfillmentData: 10,
          interactionDepth: 10,
          objectionsOrNegativeSignals: -5,
        },
      },
      message: "Configuración guardada. Se aplicará en los próximos análisis.",
    });
  });

  it("normalizes valid named weights before persisting them", async () => {
    const route = handlers({ current: persistedSettings() });

    const response = await route.PATCH(patchRequest({
      version: 1,
      hotLeadThreshold: 80,
      weights: {
        purchaseIntent: 40,
        productDefined: 20,
        budgetAcceptance: 20,
        urgency: 20,
        contactOrFulfillmentData: 20,
        interactionDepth: 20,
        objectionsOrNegativeSignals: -20,
      },
    }));

    expect(response.status).toBe(200);
    expect(route.upsertSettings).toHaveBeenCalledWith("assistant_resolved", {
      version: 2,
      hotLeadThreshold: 80,
      weights: {
        purchaseIntent: 25,
        productDefined: 13,
        budgetAcceptance: 13,
        urgency: 13,
        contactOrFulfillmentData: 12,
        interactionDepth: 12,
        objectionsOrNegativeSignals: -12,
      },
    });
  });

  it.each([
    ["threshold below range", { version: 1, hotLeadThreshold: 0, weights: defaultWeights }],
    ["threshold above range", { version: 1, hotLeadThreshold: 101, weights: defaultWeights }],
    ["fractional threshold", { version: 1, hotLeadThreshold: 75.5, weights: defaultWeights }],
    ["missing named weight", {
      version: 1,
      hotLeadThreshold: 75,
      weights: { ...defaultWeights, urgency: undefined },
    }],
    ["weight above bound", {
      version: 1,
      hotLeadThreshold: 75,
      weights: { ...defaultWeights, purchaseIntent: 101 },
    }],
    ["wrong negative-signal sign", {
      version: 1,
      hotLeadThreshold: 75,
      weights: { ...defaultWeights, objectionsOrNegativeSignals: 10 },
    }],
    ["invalid version", { version: 0, hotLeadThreshold: 75, weights: defaultWeights }],
  ])("rejects invalid settings: %s", async (_name, body) => {
    const route = handlers({ current: persistedSettings() });

    const response = await route.PATCH(patchRequest(body));

    expect(response.status).toBe(400);
    expect(route.upsertSettings).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Revisá el umbral, la versión y los pesos antes de guardar.",
    });
  });

  it("rejects stale versions without overwriting newer settings", async () => {
    const route = handlers({ current: persistedSettings({ version: 3 }) });

    const response = await route.PATCH(patchRequest({
      version: 2,
      hotLeadThreshold: 80,
      weights: defaultWeights,
    }));

    expect(response.status).toBe(409);
    expect(route.upsertSettings).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "La configuración cambió. Actualizá la página e intentá de nuevo.",
    });
  });

  it("returns a conflict when a concurrent save advances the version", async () => {
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => ({ assistant: { id: "assistant_resolved" } })),
      findSettings: vi.fn(async () => persistedSettings()),
      upsertSettings: vi.fn(async () => {
        throw new Error("CONVERSATION_INSIGHT_SETTINGS_VERSION_CONFLICT");
      }),
    });

    const response = await route.PATCH(patchRequest({
      version: 1,
      hotLeadThreshold: 80,
      weights: defaultWeights,
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "La configuración cambió. Actualizá la página e intentá de nuevo.",
    });
  });

  it("returns a generic Spanish error without exposing persistence details", async () => {
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => ({ assistant: { id: "assistant_resolved" } })),
      findSettings: vi.fn(async () => {
        throw new Error("mysql://root:secret@database/internal");
      }),
      upsertSettings: vi.fn(),
    });

    const response = await route.GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "No pudimos cargar la configuración. Intentá de nuevo.",
    });
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
