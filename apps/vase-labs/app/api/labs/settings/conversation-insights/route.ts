import { labsPrisma, Prisma } from "../../../../lib/db";
import {
  CONVERSATION_SCORING_WEIGHT_KEYS,
  DEFAULT_CONVERSATION_INSIGHT_SETTINGS,
  normalizeConversationInsightSettings,
  type ConversationScoringWeightKey,
  type ConversationScoringWeights,
} from "../../../../lib/conversation-insight";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

export type ConversationInsightSettingsRecord = {
  version: number;
  hotLeadThreshold: number;
  weights: ConversationScoringWeights;
};

type ConversationInsightSettingsDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ assistant: { id: string } }>;
  findSettings(assistantId: string): Promise<ConversationInsightSettingsRecord | null>;
  upsertSettings(
    assistantId: string,
    settings: ConversationInsightSettingsRecord,
  ): Promise<ConversationInsightSettingsRecord>;
};

const AUTHENTICATION_ERRORS = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);

const POSITIVE_WEIGHT_KEYS = new Set<ConversationScoringWeightKey>(
  CONVERSATION_SCORING_WEIGHT_KEYS.filter((key) => key !== "objectionsOrNegativeSignals"),
);

const INVALID_SETTINGS_MESSAGE =
  "Revisá el umbral, la versión y los pesos antes de guardar.";
const SETTINGS_VERSION_CONFLICT =
  "CONVERSATION_INSIGHT_SETTINGS_VERSION_CONFLICT";

function versionConflictResponse() {
  return Response.json(
    {
      error: "La configuración cambió. Actualizá la página e intentá de nuevo.",
    },
    { status: 409 },
  );
}

function copyDefaultSettings(): ConversationInsightSettingsRecord {
  return {
    ...DEFAULT_CONVERSATION_INSIGHT_SETTINGS,
    weights: { ...DEFAULT_CONVERSATION_INSIGHT_SETTINGS.weights },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSettings(value: unknown): ConversationInsightSettingsRecord | null {
  if (!isRecord(value) || !isRecord(value.weights)) return null;
  if (
    !Number.isInteger(value.version)
    || typeof value.version !== "number"
    || value.version < 1
    || !Number.isInteger(value.hotLeadThreshold)
    || typeof value.hotLeadThreshold !== "number"
    || value.hotLeadThreshold < 1
    || value.hotLeadThreshold > 100
  ) {
    return null;
  }

  const suppliedWeightKeys = Object.keys(value.weights);
  if (
    suppliedWeightKeys.length !== CONVERSATION_SCORING_WEIGHT_KEYS.length
    || suppliedWeightKeys.some(
      (key) => !(CONVERSATION_SCORING_WEIGHT_KEYS as readonly string[]).includes(key),
    )
  ) {
    return null;
  }

  const weights = {} as ConversationScoringWeights;
  for (const key of CONVERSATION_SCORING_WEIGHT_KEYS) {
    const weight = value.weights[key];
    if (
      typeof weight !== "number"
      || !Number.isFinite(weight)
      || !Number.isInteger(weight)
      || Math.abs(weight) > 100
      || (POSITIVE_WEIGHT_KEYS.has(key) && weight < 0)
      || (key === "objectionsOrNegativeSignals" && weight > 0)
    ) {
      return null;
    }
    weights[key] = weight;
  }

  if (CONVERSATION_SCORING_WEIGHT_KEYS.every((key) => weights[key] === 0)) return null;

  return normalizeConversationInsightSettings({
    version: value.version,
    hotLeadThreshold: value.hotLeadThreshold,
    weights,
  });
}

function errorResponse(error: unknown, operation: "load" | "save") {
  const message = error instanceof Error ? error.message : "";
  if (AUTHENTICATION_ERRORS.has(message)) {
    return Response.json(
      { error: "Necesitás iniciar sesión para continuar." },
      { status: 401 },
    );
  }
  return Response.json(
    {
      error: operation === "load"
        ? "No pudimos cargar la configuración. Intentá de nuevo."
        : "No pudimos guardar la configuración. Intentá de nuevo.",
    },
    { status: 500 },
  );
}

export function createConversationInsightSettingsHandlers(
  dependencies: ConversationInsightSettingsDependencies,
) {
  async function GET(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const settings = await dependencies.findSettings(resolved.assistant.id);
      return Response.json({ settings: settings ?? copyDefaultSettings() });
    } catch (error) {
      return errorResponse(error, "load");
    }
  }

  async function PATCH(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      const requested = parseSettings(body);
      if (!requested) {
        return Response.json({ error: INVALID_SETTINGS_MESSAGE }, { status: 400 });
      }

      const current = await dependencies.findSettings(resolved.assistant.id)
        ?? copyDefaultSettings();
      if (requested.version !== current.version) {
        return versionConflictResponse();
      }

      const settings = await dependencies.upsertSettings(resolved.assistant.id, {
        ...requested,
        version: current.version + 1,
      });
      return Response.json({
        settings,
        message: "Configuración guardada. Se aplicará en los próximos análisis.",
      });
    } catch (error) {
      if (error instanceof Error && error.message === SETTINGS_VERSION_CONFLICT) {
        return versionConflictResponse();
      }
      return errorResponse(error, "save");
    }
  }

  return { GET, PATCH };
}

function mapPersistedSettings(record: {
  version: number;
  hotLeadThreshold: number;
  purchaseIntentWeight: number;
  productDefinedWeight: number;
  budgetAcceptanceWeight: number;
  urgencyWeight: number;
  contactFulfillmentWeight: number;
  interactionDepthWeight: number;
  negativeSignalsWeight: number;
}): ConversationInsightSettingsRecord {
  return {
    version: record.version,
    hotLeadThreshold: record.hotLeadThreshold,
    weights: {
      purchaseIntent: record.purchaseIntentWeight,
      productDefined: record.productDefinedWeight,
      budgetAcceptance: record.budgetAcceptanceWeight,
      urgency: record.urgencyWeight,
      contactOrFulfillmentData: record.contactFulfillmentWeight,
      interactionDepth: record.interactionDepthWeight,
      objectionsOrNegativeSignals: record.negativeSignalsWeight,
    },
  };
}

const handlers = createConversationInsightSettingsHandlers({
  resolveContext: resolveLabsRequestContext,
  async findSettings(assistantId) {
    const settings = await labsPrisma.conversationInsightSettings.findUnique({
      where: { assistantId },
      select: {
        version: true,
        hotLeadThreshold: true,
        purchaseIntentWeight: true,
        productDefinedWeight: true,
        budgetAcceptanceWeight: true,
        urgencyWeight: true,
        contactFulfillmentWeight: true,
        interactionDepthWeight: true,
        negativeSignalsWeight: true,
      },
    });
    return settings ? mapPersistedSettings(settings) : null;
  },
  async upsertSettings(assistantId, settings) {
    return labsPrisma.$transaction(async (transaction) => {
      const expectedVersion = settings.version - 1;
      const data = {
        version: settings.version,
        hotLeadThreshold: settings.hotLeadThreshold,
        purchaseIntentWeight: settings.weights.purchaseIntent,
        productDefinedWeight: settings.weights.productDefined,
        budgetAcceptanceWeight: settings.weights.budgetAcceptance,
        urgencyWeight: settings.weights.urgency,
        contactFulfillmentWeight: settings.weights.contactOrFulfillmentData,
        interactionDepthWeight: settings.weights.interactionDepth,
        negativeSignalsWeight: settings.weights.objectionsOrNegativeSignals,
      };
      const select = {
        version: true,
        hotLeadThreshold: true,
        purchaseIntentWeight: true,
        productDefinedWeight: true,
        budgetAcceptanceWeight: true,
        urgencyWeight: true,
        contactFulfillmentWeight: true,
        interactionDepthWeight: true,
        negativeSignalsWeight: true,
      } as const;
      const current = await transaction.conversationInsightSettings.findUnique({
        where: { assistantId },
        select: { version: true },
      });

      if (!current) {
        if (expectedVersion !== DEFAULT_CONVERSATION_INSIGHT_SETTINGS.version) {
          throw new Error(SETTINGS_VERSION_CONFLICT);
        }
        try {
          const created = await transaction.conversationInsightSettings.create({
            data: { assistantId, ...data },
            select,
          });
          return mapPersistedSettings(created);
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError
            && error.code === "P2002"
          ) {
            throw new Error(SETTINGS_VERSION_CONFLICT);
          }
          throw error;
        }
      }

      const updated = await transaction.conversationInsightSettings.updateMany({
        where: { assistantId, version: expectedVersion },
        data,
      });
      if (updated.count !== 1) throw new Error(SETTINGS_VERSION_CONFLICT);

      const saved = await transaction.conversationInsightSettings.findUnique({
        where: { assistantId },
        select,
      });
      if (!saved) throw new Error(SETTINGS_VERSION_CONFLICT);
      return mapPersistedSettings(saved);
    });
  },
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
