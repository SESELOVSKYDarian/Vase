import { describe, expect, it, vi } from "vitest";
import {
  createConversationInsightSettingsHandlers,
  type ConversationInsightSettingsRecord,
} from "../apps/vase-labs/app/api/labs/settings/conversation-insights/route";
import {
  createConversationAnalysisQueue,
  type ConversationAnalysisJob,
} from "../apps/vase-labs/app/lib/conversation-analysis-queue";

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

function postRequest(body: unknown = {}) {
  return new Request("https://labs.vase.ar/api/labs/settings/conversation-insights", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "vase_labs_session=signed",
    },
    body: JSON.stringify(body),
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

  it("requires authentication before PATCH validation or persistence", async () => {
    const findSettings = vi.fn();
    const upsertSettings = vi.fn();
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => {
        throw new Error("LABS_SESSION_EXPIRED");
      }),
      findSettings,
      upsertSettings,
    });

    const response = await route.PATCH(patchRequest({
      assistantId: "assistant_attacker",
      version: 1,
      hotLeadThreshold: 80,
      weights: defaultWeights,
    }));

    expect(response.status).toBe(401);
    expect(findSettings).not.toHaveBeenCalled();
    expect(upsertSettings).not.toHaveBeenCalled();
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

  it("requires authentication before recalculating conversations", async () => {
    const listOpenConversationPage = vi.fn();
    const enqueueAnalysis = vi.fn();
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => {
        throw new Error("LABS_SESSION_REQUIRED");
      }),
      findSettings: vi.fn(),
      upsertSettings: vi.fn(),
      listOpenConversationPage,
      enqueueAnalysis,
    });

    const response = await route.POST(postRequest({
      assistantId: "assistant_attacker",
      globalTenantId: "tenant_attacker",
    }));

    expect(response.status).toBe(401);
    expect(listOpenConversationPage).not.toHaveBeenCalled();
    expect(enqueueAnalysis).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Necesitás iniciar sesión para continuar.",
    });
  });

  it("paginates only the resolved assistant's open conversations and skips those without inbound messages", async () => {
    const listOpenConversationPage = vi.fn(async (input: {
      assistantId: string;
      cursor: string | null;
      limit: number;
    }) => {
      expect(input.assistantId).toBe("assistant_resolved");
      expect(input.limit).toBe(2);
      if (input.cursor === null) {
        return [
          {
            id: "conversation_1",
            latestInbound: {
              id: "message_1",
              createdAt: new Date("2026-07-23T10:00:00.000Z"),
            },
          },
          { id: "conversation_2", latestInbound: null },
        ];
      }
      if (input.cursor === "conversation_2") {
        return [
          {
            id: "conversation_3",
            latestInbound: {
              id: "message_3",
              createdAt: new Date("2026-07-23T11:00:00.000Z"),
            },
          },
          {
            id: "conversation_4",
            latestInbound: {
              id: "message_4",
              createdAt: new Date("2026-07-23T12:00:00.000Z"),
            },
          },
        ];
      }
      return [];
    });
    const enqueueAnalysis = vi.fn(async () => undefined);
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => ({ assistant: { id: "assistant_resolved" } })),
      findSettings: vi.fn(),
      upsertSettings: vi.fn(),
      listOpenConversationPage,
      enqueueAnalysis,
      recalculationPageSize: 2,
    });

    const response = await route.POST(postRequest({
      assistantId: "assistant_attacker",
      globalTenantId: "tenant_attacker",
      conversationIds: ["conversation_attacker"],
    }));

    expect(response.status).toBe(200);
    expect(listOpenConversationPage.mock.calls.map(([input]) => input.cursor)).toEqual([
      null,
      "conversation_2",
      "conversation_4",
    ]);
    expect(enqueueAnalysis.mock.calls.map(([input]) => input)).toEqual([
      {
        assistantId: "assistant_resolved",
        conversationId: "conversation_1",
        messageId: "message_1",
        messageCreatedAt: new Date("2026-07-23T10:00:00.000Z"),
        force: true,
      },
      {
        assistantId: "assistant_resolved",
        conversationId: "conversation_3",
        messageId: "message_3",
        messageCreatedAt: new Date("2026-07-23T11:00:00.000Z"),
        force: true,
      },
      {
        assistantId: "assistant_resolved",
        conversationId: "conversation_4",
        messageId: "message_4",
        messageCreatedAt: new Date("2026-07-23T12:00:00.000Z"),
        force: true,
      },
    ]);
    expect(await response.json()).toEqual({
      queued: 3,
      skipped: 1,
      message: "Reanálisis encolado. Las conversaciones se actualizarán en segundo plano.",
    });
  });

  it("coalesces repeated recalculation requests through the durable queue contract", async () => {
    const jobs = new Map<string, ConversationAnalysisJob>();
    jobs.set("conversation_1", {
      conversationId: "conversation_1",
      requestedThroughMessageId: "message_latest",
      requestedThroughMessageCreatedAt: new Date("2026-07-23T12:00:00.000Z"),
      requestedAt: new Date("2026-07-23T12:00:00.000Z"),
      status: "COMPLETED",
      attempts: 1,
      leaseToken: null,
      leaseExpiresAt: null,
      lastError: null,
      createdAt: new Date("2026-07-23T12:00:00.000Z"),
      updatedAt: new Date("2026-07-23T12:00:00.000Z"),
    });
    const queue = createConversationAnalysisQueue({
      repository: {
        async listClaimableConversationIds() {
          return [];
        },
        async withJob<TResult>(conversationId: string, operation: (
          current: ConversationAnalysisJob | null,
        ) => Promise<{ job: ConversationAnalysisJob; result: TResult }>
          | { job: ConversationAnalysisJob; result: TResult }) {
          const outcome = await operation(jobs.get(conversationId) ?? null);
          jobs.set(conversationId, outcome.job);
          return outcome.result;
        },
      },
      clock: () => new Date("2026-07-23T13:00:00.000Z"),
      tokenFactory: () => "lease",
      maxAttempts: 3,
      leaseDurationMs: 60_000,
    });
    const listOpenConversationPage = vi.fn(async (input: { cursor: string | null }) =>
      input.cursor === null
        ? [{
            id: "conversation_1",
            latestInbound: {
              id: "message_latest",
              createdAt: new Date("2026-07-23T12:00:00.000Z"),
            },
          }]
        : []);
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => ({ assistant: { id: "assistant_resolved" } })),
      findSettings: vi.fn(),
      upsertSettings: vi.fn(),
      listOpenConversationPage,
      enqueueAnalysis(input) {
        return queue.enqueue({
          conversationId: input.conversationId,
          requestedThroughMessageId: input.messageId,
          requestedThroughMessageCreatedAt: input.messageCreatedAt,
          force: input.force,
        }).then(() => undefined);
      },
      recalculationPageSize: 2,
    });

    const first = await route.POST(postRequest());
    const second = await route.POST(postRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(jobs).toHaveLength(1);
    expect(jobs.get("conversation_1")).toMatchObject({
      status: "QUEUED",
      requestedThroughMessageId: "message_latest",
      attempts: 0,
      requestedAt: new Date("2026-07-23T13:00:00.000Z"),
    });
  });

  it("returns a safe error when recalculation cannot be enqueued", async () => {
    const route = createConversationInsightSettingsHandlers({
      resolveContext: vi.fn(async () => ({ assistant: { id: "assistant_resolved" } })),
      findSettings: vi.fn(),
      upsertSettings: vi.fn(),
      listOpenConversationPage: vi.fn(async () => {
        throw new Error("mysql://root:secret@database/internal");
      }),
      enqueueAnalysis: vi.fn(),
    });

    const response = await route.POST(postRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "No pudimos iniciar el reanálisis. Intentá de nuevo.",
    });
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
