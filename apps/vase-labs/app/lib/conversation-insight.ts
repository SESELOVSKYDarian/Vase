export const CONVERSATION_INTENT_LABELS = [
  "HOT_LEAD",
  "RESEARCHING",
  "LOW_INTENT",
  "HUMAN_REQUESTED",
  "UNCLASSIFIED",
] as const;

export type ConversationIntentLabel = (typeof CONVERSATION_INTENT_LABELS)[number];

export const CONVERSATION_SCORING_WEIGHT_KEYS = [
  "purchaseIntent",
  "productDefined",
  "budgetAcceptance",
  "urgency",
  "contactOrFulfillmentData",
  "interactionDepth",
  "objectionsOrNegativeSignals",
] as const;

export type ConversationScoringWeightKey = (typeof CONVERSATION_SCORING_WEIGHT_KEYS)[number];
export type ConversationScoringWeights = Record<ConversationScoringWeightKey, number>;

export interface ConversationInsightSettings {
  version: number;
  hotLeadThreshold: number;
  weights: ConversationScoringWeights;
}

export const DEFAULT_CONVERSATION_INSIGHT_SETTINGS: ConversationInsightSettings = {
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
};

const INSIGHT_ARRAY_FIELDS = [
  "productInterests",
  "preferences",
  "objections",
  "budgetSignals",
  "urgencySignals",
  "recommendations",
  "scoreReasons",
  "identitySignals",
] as const;

const INSIGHT_STRING_FIELDS = [
  "summary",
  "currentNeed",
  "nextBestAction",
] as const;

const INSIGHT_FIELDS = new Set<string>([
  ...INSIGHT_ARRAY_FIELDS,
  ...INSIGHT_STRING_FIELDS,
  "leadScore",
  "intentLabel",
]);

export interface ParsedConversationInsight {
  summary: string;
  currentNeed: string;
  productInterests: string[];
  preferences: string[];
  objections: string[];
  budgetSignals: string[];
  urgencySignals: string[];
  recommendations: string[];
  nextBestAction: string;
  scoreReasons: string[];
  leadScore: number;
  intentLabel: ConversationIntentLabel;
  identitySignals: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConversationIntentLabel(value: unknown): value is ConversationIntentLabel {
  return typeof value === "string"
    && (CONVERSATION_INTENT_LABELS as readonly string[]).includes(value);
}

function invalidInsight(): never {
  throw new Error("INVALID_CONVERSATION_INSIGHT");
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

export function parseConversationInsight(value: unknown): ParsedConversationInsight {
  if (!isRecord(value) || Object.keys(value).some((key) => !INSIGHT_FIELDS.has(key))) {
    return invalidInsight();
  }
  const summary = value.summary;
  const currentNeed = value.currentNeed;
  const nextBestAction = value.nextBestAction;
  if (typeof summary !== "string" || !summary.trim()) return invalidInsight();
  if (typeof currentNeed !== "string" || !currentNeed.trim()) return invalidInsight();
  if (typeof nextBestAction !== "string" || !nextBestAction.trim()) return invalidInsight();
  for (const field of INSIGHT_ARRAY_FIELDS) {
    if (!Array.isArray(value[field])) return invalidInsight();
  }
  if (!Number.isFinite(value.leadScore) || typeof value.leadScore !== "number") {
    return invalidInsight();
  }
  if (!isConversationIntentLabel(value.intentLabel)) return invalidInsight();

  return {
    summary: summary.trim(),
    currentNeed: currentNeed.trim(),
    productInterests: normalizeStringArray(value.productInterests),
    preferences: normalizeStringArray(value.preferences),
    objections: normalizeStringArray(value.objections),
    budgetSignals: normalizeStringArray(value.budgetSignals),
    urgencySignals: normalizeStringArray(value.urgencySignals),
    recommendations: normalizeStringArray(value.recommendations),
    nextBestAction: nextBestAction.trim(),
    scoreReasons: normalizeStringArray(value.scoreReasons),
    leadScore: Math.min(100, Math.max(1, Math.round(value.leadScore))),
    intentLabel: value.intentLabel,
    identitySignals: normalizeStringArray(value.identitySignals),
  };
}

function defaultSettings(): ConversationInsightSettings {
  return {
    ...DEFAULT_CONVERSATION_INSIGHT_SETTINGS,
    weights: { ...DEFAULT_CONVERSATION_INSIGHT_SETTINGS.weights },
  };
}

function normalizeWeightSigns(weights: ConversationScoringWeights): ConversationScoringWeights {
  return {
    purchaseIntent: Math.abs(weights.purchaseIntent),
    productDefined: Math.abs(weights.productDefined),
    budgetAcceptance: Math.abs(weights.budgetAcceptance),
    urgency: Math.abs(weights.urgency),
    contactOrFulfillmentData: Math.abs(weights.contactOrFulfillmentData),
    interactionDepth: Math.abs(weights.interactionDepth),
    objectionsOrNegativeSignals: -Math.abs(weights.objectionsOrNegativeSignals),
  };
}

function normalizeWeights(weights: ConversationScoringWeights): ConversationScoringWeights | null {
  const signedWeights = normalizeWeightSigns(weights);
  const maximumMagnitude = Math.max(
    ...CONVERSATION_SCORING_WEIGHT_KEYS.map((key) => Math.abs(signedWeights[key])),
  );
  if (!Number.isFinite(maximumMagnitude) || maximumMagnitude <= 0) return null;
  const scaledMagnitudes = Object.fromEntries(
    CONVERSATION_SCORING_WEIGHT_KEYS.map((key) => [
      key,
      Math.abs(signedWeights[key]) / maximumMagnitude,
    ]),
  ) as ConversationScoringWeights;
  const scaledTotal = CONVERSATION_SCORING_WEIGHT_KEYS.reduce(
    (sum, key) => sum + scaledMagnitudes[key],
    0,
  );
  if (!Number.isFinite(scaledTotal) || scaledTotal <= 0) return null;

  const exact = CONVERSATION_SCORING_WEIGHT_KEYS.map((key) => ({
    key,
    value: scaledMagnitudes[key] / scaledTotal * 100,
  }));
  if (exact.some(({ value }) => !Number.isFinite(value))) return null;
  const allocated = Object.fromEntries(
    exact.map(({ key, value }) => [key, Math.floor(value)]),
  ) as ConversationScoringWeights;
  let remaining = 100 - CONVERSATION_SCORING_WEIGHT_KEYS.reduce(
    (sum, key) => sum + allocated[key],
    0,
  );
  const remainderOrder = exact
    .map(({ key, value }, index) => ({ key, remainder: value - Math.floor(value), index }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) {
    allocated[remainderOrder[index].key] += 1;
  }
  allocated.objectionsOrNegativeSignals = -allocated.objectionsOrNegativeSignals;
  if (CONVERSATION_SCORING_WEIGHT_KEYS.some((key) => !Number.isFinite(allocated[key]))) return null;
  return allocated;
}

export function normalizeConversationInsightSettings(value: unknown): ConversationInsightSettings {
  if (!isRecord(value)) return defaultSettings();
  const rawWeights = isRecord(value.weights) ? value.weights : {};
  const weights = {} as ConversationScoringWeights;
  for (const key of CONVERSATION_SCORING_WEIGHT_KEYS) {
    const candidate = rawWeights[key] ?? DEFAULT_CONVERSATION_INSIGHT_SETTINGS.weights[key];
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) return defaultSettings();
    weights[key] = candidate;
  }
  const normalizedWeights = normalizeWeights(weights);
  if (!normalizedWeights) return defaultSettings();

  const version = typeof value.version === "number"
    && Number.isFinite(value.version)
    && value.version >= 1
    ? Math.floor(value.version)
    : DEFAULT_CONVERSATION_INSIGHT_SETTINGS.version;
  const threshold = typeof value.hotLeadThreshold === "number"
    && Number.isFinite(value.hotLeadThreshold)
    ? Math.min(100, Math.max(1, Math.round(value.hotLeadThreshold)))
    : DEFAULT_CONVERSATION_INSIGHT_SETTINGS.hotLeadThreshold;
  return { version, hotLeadThreshold: threshold, weights: normalizedWeights };
}

export function resolveConversationIntentLabel(input: {
  modelLabel: unknown;
  leadScore: number;
  hotLeadThreshold?: number;
  activeHandoff?: boolean;
  requestedHandoff?: boolean;
}): ConversationIntentLabel {
  if (input.activeHandoff || input.requestedHandoff) return "HUMAN_REQUESTED";
  const threshold = Number.isFinite(input.hotLeadThreshold)
    ? Math.min(100, Math.max(1, Math.round(input.hotLeadThreshold!)))
    : DEFAULT_CONVERSATION_INSIGHT_SETTINGS.hotLeadThreshold;
  if (Number.isFinite(input.leadScore) && input.leadScore >= threshold) return "HOT_LEAD";
  if (input.modelLabel === "HOT_LEAD") return "RESEARCHING";
  return isConversationIntentLabel(input.modelLabel) ? input.modelLabel : "UNCLASSIFIED";
}
