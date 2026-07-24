import { randomUUID } from "node:crypto";
import { labsPrisma, Prisma } from "../../../../lib/db";
import {
  CONVERSATION_SCORING_WEIGHT_KEYS,
  DEFAULT_CONVERSATION_INSIGHT_SETTINGS,
  normalizeConversationInsightSettings,
  type ConversationScoringWeightKey,
  type ConversationScoringWeights,
} from "../../../../lib/conversation-insight";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { createConversationAnalysisQueue } from "../../../../lib/conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../../../../lib/conversation-analysis-repository";

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
  listOpenConversationPage?(input: {
    assistantId: string;
    cursor: string | null;
    limit: number;
  }): Promise<Array<{
    id: string;
    latestInbound: { id: string; createdAt: Date } | null;
  }>>;
  enqueueAnalysis?(input: {
    assistantId: string;
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
    force: boolean;
  }): Promise<void>;
  recalculationPageSize?: number;
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

function errorResponse(error: unknown, operation: "load" | "save" | "recalculate") {
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
        : operation === "save"
          ? "No pudimos guardar la configuración. Intentá de nuevo."
          : "No pudimos iniciar el reanálisis. Intentá de nuevo.",
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

  async function POST(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      if (!dependencies.listOpenConversationPage || !dependencies.enqueueAnalysis) {
        throw new Error("CONVERSATION_RECALCULATION_NOT_CONFIGURED");
      }
      const configuredPageSize = dependencies.recalculationPageSize ?? 50;
      const pageSize = Number.isInteger(configuredPageSize)
        && configuredPageSize >= 1
        && configuredPageSize <= 100
        ? configuredPageSize
        : 50;
      let cursor: string | null = null;
      let queued = 0;
      let skipped = 0;

      while (true) {
        const page = await dependencies.listOpenConversationPage({
          assistantId: resolved.assistant.id,
          cursor,
          limit: pageSize,
        });
        if (page.length === 0) break;

        for (const conversation of page) {
          if (!conversation.latestInbound) {
            skipped += 1;
            continue;
          }
          await dependencies.enqueueAnalysis({
            assistantId: resolved.assistant.id,
            conversationId: conversation.id,
            messageId: conversation.latestInbound.id,
            messageCreatedAt: conversation.latestInbound.createdAt,
            force: true,
          });
          queued += 1;
        }

        const nextCursor = page.at(-1)?.id ?? null;
        if (!nextCursor || nextCursor === cursor) {
          throw new Error("CONVERSATION_RECALCULATION_CURSOR_INVALID");
        }
        cursor = nextCursor;
      }

      return Response.json({
        queued,
        skipped,
        message: "Reanálisis encolado. Las conversaciones se actualizarán en segundo plano.",
      });
    } catch (error) {
      return errorResponse(error, "recalculate");
    }
  }

  return { GET, PATCH, POST };
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

const recalculationQueue = createConversationAnalysisQueue({
  repository: new PrismaConversationAnalysisRepository(labsPrisma),
  clock: () => new Date(),
  tokenFactory: randomUUID,
  maxAttempts: 3,
  leaseDurationMs: 60_000,
});

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
  async listOpenConversationPage({ assistantId, cursor, limit }) {
    const conversations = await labsPrisma.conversation.findMany({
      where: {
        assistantId,
        status: { in: ["OPEN", "ESCALATED"] },
      },
      orderBy: { id: "asc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        messages: {
          where: {
            OR: [
              { direction: "INBOUND" },
              { role: "user" },
            ],
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, createdAt: true },
        },
      },
    });
    return conversations.map((conversation) => ({
      id: conversation.id,
      latestInbound: conversation.messages[0] ?? null,
    }));
  },
  async enqueueAnalysis({
    assistantId,
    conversationId,
    messageId,
    messageCreatedAt,
    force,
  }) {
    const inScope = await labsPrisma.conversation.findFirst({
      where: {
        id: conversationId,
        assistantId,
        status: { in: ["OPEN", "ESCALATED"] },
      },
      select: { id: true },
    });
    if (!inScope) throw new Error("CONVERSATION_RECALCULATION_SCOPE_INVALID");
    await recalculationQueue.enqueue({
      conversationId,
      requestedThroughMessageId: messageId,
      requestedThroughMessageCreatedAt: messageCreatedAt,
      force,
    });
  },
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const POST = handlers.POST;
