import { describe, expect, it } from "vitest";
import {
  CONVERSATION_INTENT_LABELS,
  DEFAULT_CONVERSATION_INSIGHT_SETTINGS,
  normalizeConversationInsightSettings,
  normalizeStringArray,
  parseConversationInsight,
  resolveConversationIntentLabel,
} from "../apps/vase-labs/app/lib/conversation-insight";

const validInsight = {
  summary: "Busca un florero para regalar.",
  currentNeed: "Un regalo disponible esta semana.",
  productInterests: ["Florero Roma"],
  preferences: ["azul"],
  objections: ["consulta por cambios"],
  budgetSignals: ["acepta hasta ARS 80.000"],
  urgencySignals: ["lo necesita el viernes"],
  recommendations: ["Confirmar stock del Florero Roma"],
  nextBestAction: "Pedir localidad de entrega.",
  scoreReasons: ["producto definido", "plazo concreto"],
  leadScore: 82,
  intentLabel: "HOT_LEAD",
  identitySignals: ["nombre: Ana"],
};

describe("Labs conversation insight domain", () => {
  it("exposes only the supported intent labels", () => {
    expect(CONVERSATION_INTENT_LABELS).toEqual([
      "HOT_LEAD",
      "RESEARCHING",
      "LOW_INTENT",
      "HUMAN_REQUESTED",
      "UNCLASSIFIED",
    ]);
  });

  it("parses the complete required model shape", () => {
    expect(parseConversationInsight(validInsight)).toEqual(validInsight);
  });

  it("rejects malformed or incomplete model output", () => {
    expect(() => parseConversationInsight({ ...validInsight, summary: 42 })).toThrow(
      "INVALID_CONVERSATION_INSIGHT",
    );
    const incomplete: Record<string, unknown> = { ...validInsight };
    delete incomplete.currentNeed;
    expect(() => parseConversationInsight(incomplete)).toThrow("INVALID_CONVERSATION_INSIGHT");
    expect(() => parseConversationInsight({ ...validInsight, intentLabel: "READY_TO_BUY" })).toThrow(
      "INVALID_CONVERSATION_INSIGHT",
    );
  });

  it("clamps finite model scores into the supported 1..100 range", () => {
    expect(parseConversationInsight({ ...validInsight, leadScore: -12 }).leadScore).toBe(1);
    expect(parseConversationInsight({ ...validInsight, leadScore: 140 }).leadScore).toBe(100);
    expect(() => parseConversationInsight({ ...validInsight, leadScore: Number.NaN })).toThrow(
      "INVALID_CONVERSATION_INSIGHT",
    );
  });

  it("normalizes JSON arrays without allowing non-string values through", () => {
    expect(normalizeStringArray(["  azul ", null, 7, "", "azul", " mate "])).toEqual([
      "azul",
      "mate",
    ]);
    expect(normalizeStringArray({ value: "not-an-array" })).toEqual([]);
    expect(parseConversationInsight({
      ...validInsight,
      preferences: [" azul ", null, "azul", 9],
    }).preferences).toEqual(["azul"]);
  });

  it.each(["summary", "currentNeed", "nextBestAction"] as const)(
    "rejects an overlong %s without exposing its content",
    (field) => {
      const secret = `private-${"x".repeat(2_000)}`;
      const error = (() => {
        try {
          parseConversationInsight({ ...validInsight, [field]: secret });
        } catch (caught) {
          return caught as Error;
        }
        throw new Error("EXPECTED_INVALID_CONVERSATION_INSIGHT");
      })();

      expect(error.message).toBe("INVALID_CONVERSATION_INSIGHT");
      expect(error.message).not.toContain(secret);
    },
  );

  it.each([
    "productInterests",
    "preferences",
    "objections",
    "budgetSignals",
    "urgencySignals",
    "recommendations",
    "scoreReasons",
    "identitySignals",
  ] as const)("rejects too many %s entries", (field) => {
    expect(() => parseConversationInsight({
      ...validInsight,
      [field]: Array.from({ length: 21 }, (_, index) => `item-${index}`),
    })).toThrow("INVALID_CONVERSATION_INSIGHT");
  });

  it.each([
    "productInterests",
    "preferences",
    "objections",
    "budgetSignals",
    "urgencySignals",
    "recommendations",
    "scoreReasons",
    "identitySignals",
  ] as const)("rejects an overlong %s item", (field) => {
    expect(() => parseConversationInsight({
      ...validInsight,
      [field]: ["x".repeat(501)],
    })).toThrow("INVALID_CONVERSATION_INSIGHT");
  });

  it("accepts insight values at every output boundary", () => {
    const boundedItems = Array.from(
      { length: 20 },
      (_, index) => `${index}`.padEnd(500, "x"),
    );

    expect(parseConversationInsight({
      ...validInsight,
      summary: "s".repeat(2_000),
      currentNeed: "n".repeat(2_000),
      nextBestAction: "a".repeat(2_000),
      productInterests: boundedItems,
      preferences: boundedItems,
      objections: boundedItems,
      budgetSignals: boundedItems,
      urgencySignals: boundedItems,
      recommendations: boundedItems,
      scoreReasons: boundedItems,
      identitySignals: boundedItems,
    })).toMatchObject({
      summary: "s".repeat(2_000),
      productInterests: boundedItems,
    });
  });

  it("measures output limits in Unicode characters like JSON Schema", () => {
    const boundedNarrative = "🌷".repeat(2_000);
    const boundedItem = "🌷".repeat(500);

    expect(parseConversationInsight({
      ...validInsight,
      summary: boundedNarrative,
      productInterests: [boundedItem],
    })).toMatchObject({
      summary: boundedNarrative,
      productInterests: [boundedItem],
    });
  });

  it("provides versioned defaults with a hot lead threshold of 75", () => {
    expect(DEFAULT_CONVERSATION_INSIGHT_SETTINGS).toEqual({
      version: 1,
      hotLeadThreshold: 75,
      weights: {
        purchaseIntent: 25,
        productDefined: 15,
        budgetAcceptance: 15,
        urgency: 15,
        contactOrFulfillmentData: 10,
        interactionDepth: 10,
        objectionsOrNegativeSignals: -10,
      },
    });
  });

  it("normalizes configurable weights deterministically to 100 absolute points", () => {
    const raw = {
      version: 4,
      hotLeadThreshold: 88,
      weights: {
        purchaseIntent: 1,
        productDefined: 1,
        budgetAcceptance: 1,
        urgency: 1,
        contactOrFulfillmentData: 1,
        interactionDepth: 1,
        objectionsOrNegativeSignals: -1,
      },
    };

    expect(normalizeConversationInsightSettings(raw)).toEqual({
      version: 4,
      hotLeadThreshold: 88,
      weights: {
        purchaseIntent: 15,
        productDefined: 15,
        budgetAcceptance: 14,
        urgency: 14,
        contactOrFulfillmentData: 14,
        interactionDepth: 14,
        objectionsOrNegativeSignals: -14,
      },
    });
    expect(normalizeConversationInsightSettings(raw)).toEqual(normalizeConversationInsightSettings(raw));
  });

  it("normalizes maximum finite weights without overflowing", () => {
    expect(normalizeConversationInsightSettings({
      version: 2,
      hotLeadThreshold: 75,
      weights: {
        purchaseIntent: Number.MAX_VALUE,
        productDefined: Number.MAX_VALUE,
        budgetAcceptance: Number.MAX_VALUE,
        urgency: Number.MAX_VALUE,
        contactOrFulfillmentData: Number.MAX_VALUE,
        interactionDepth: Number.MAX_VALUE,
        objectionsOrNegativeSignals: -Number.MAX_VALUE,
      },
    }).weights).toEqual({
      purchaseIntent: 15,
      productDefined: 15,
      budgetAcceptance: 14,
      urgency: 14,
      contactOrFulfillmentData: 14,
      interactionDepth: 14,
      objectionsOrNegativeSignals: -14,
    });
  });

  it("falls back safely when settings are malformed", () => {
    expect(normalizeConversationInsightSettings({
      version: 0,
      hotLeadThreshold: 300,
      weights: {
        purchaseIntent: Number.NaN,
        productDefined: 0,
        budgetAcceptance: 0,
        urgency: 0,
        contactOrFulfillmentData: 0,
        interactionDepth: 0,
        objectionsOrNegativeSignals: 0,
      },
    })).toEqual(DEFAULT_CONVERSATION_INSIGHT_SETTINGS);
  });

  it("makes an active or requested human handoff override every score and model label", () => {
    expect(resolveConversationIntentLabel({
      modelLabel: "LOW_INTENT",
      leadScore: 5,
      hotLeadThreshold: 75,
      activeHandoff: true,
      requestedHandoff: false,
    })).toBe("HUMAN_REQUESTED");
    expect(resolveConversationIntentLabel({
      modelLabel: "HOT_LEAD",
      leadScore: 99,
      hotLeadThreshold: 75,
      activeHandoff: false,
      requestedHandoff: true,
    })).toBe("HUMAN_REQUESTED");
  });

  it("uses the configured threshold before preserving a valid model label", () => {
    expect(resolveConversationIntentLabel({
      modelLabel: "RESEARCHING",
      leadScore: 86,
      hotLeadThreshold: 85,
    })).toBe("HOT_LEAD");
    expect(resolveConversationIntentLabel({
      modelLabel: "RESEARCHING",
      leadScore: 84,
      hotLeadThreshold: 85,
    })).toBe("RESEARCHING");
    expect(resolveConversationIntentLabel({
      modelLabel: "HOT_LEAD",
      leadScore: 84,
      hotLeadThreshold: 85,
    })).toBe("RESEARCHING");
  });
});
