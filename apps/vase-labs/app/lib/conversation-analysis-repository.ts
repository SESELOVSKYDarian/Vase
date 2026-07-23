import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { ConversationAnalysisQueueRepository, ConversationAnalysisJob } from "./conversation-analysis-queue";
import type {
  ConversationAnalysisContext,
  ConversationInsightPublication,
  FailedConversationAnalysisEnqueue,
} from "./conversation-analysis-worker";
import { normalizeConversationInsightSettings } from "./conversation-insight";
import { decryptChannelSecret } from "./channel-secrets";
import { labsPrisma, type PrismaClient } from "./db";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

const MAX_ANALYSIS_MESSAGES = 200;
const MAX_ANALYSIS_CHARACTERS = 80_000;

export class PrismaConversationAnalysisRepository
implements ConversationAnalysisQueueRepository {
  private readonly transactionContext = new AsyncLocalStorage<TransactionClient>();

  constructor(
    private readonly prisma: PrismaClient = labsPrisma,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async listClaimableConversationIds(input: {
    now: Date;
    maxAttempts: number;
    limit: number;
  }): Promise<string[]> {
    const rows = await this.prisma.conversationAnalysisJob.findMany({
      where: {
        OR: [
          { status: "QUEUED", attempts: { lt: input.maxAttempts } },
          { status: "PROCESSING", leaseExpiresAt: { lte: input.now } },
        ],
      },
      orderBy: [{ updatedAt: "asc" }, { conversationId: "asc" }],
      take: input.limit,
      select: { conversationId: true },
    });
    return rows.map((row) => row.conversationId);
  }

  async withJob<TResult>(
    conversationId: string,
    operation: (
      current: ConversationAnalysisJob | null,
    ) => Promise<{ job: ConversationAnalysisJob; result: TResult }>
      | { job: ConversationAnalysisJob; result: TResult },
  ): Promise<TResult> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id
        FROM Conversation
        WHERE id = ${conversationId}
        FOR UPDATE
      `;
      const currentRecord = await transaction.conversationAnalysisJob.findUnique({
        where: { conversationId },
      });
      const outcome = await this.transactionContext.run(
        transaction,
        () => operation(currentRecord ? mapJob(currentRecord) : null),
      );
      await transaction.conversationAnalysisJob.upsert({
        where: { conversationId },
        create: {
          id: randomUUID(),
          conversationId,
          requestedThroughMessageId: outcome.job.requestedThroughMessageId,
          requestedThroughMessageCreatedAt: outcome.job.requestedThroughMessageCreatedAt,
          requestedAt: outcome.job.requestedAt,
          status: outcome.job.status,
          attempts: outcome.job.attempts,
          leaseToken: outcome.job.leaseToken,
          leaseExpiresAt: outcome.job.leaseExpiresAt,
          lastError: outcome.job.lastError,
          createdAt: outcome.job.createdAt,
          updatedAt: outcome.job.updatedAt,
        },
        update: {
          requestedThroughMessageId: outcome.job.requestedThroughMessageId,
          requestedThroughMessageCreatedAt: outcome.job.requestedThroughMessageCreatedAt,
          requestedAt: outcome.job.requestedAt,
          status: outcome.job.status,
          attempts: outcome.job.attempts,
          leaseToken: outcome.job.leaseToken,
          leaseExpiresAt: outcome.job.leaseExpiresAt,
          lastError: outcome.job.lastError,
          updatedAt: outcome.job.updatedAt,
        },
      });
      return outcome.result;
    }, { maxWait: 5_000, timeout: 10_000 });
  }

  async loadAnalysisContext(input: {
    conversationId: string;
    requestedThroughMessageId: string;
  }): Promise<ConversationAnalysisContext | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId },
      select: {
        id: true,
        assistantId: true,
        channel: true,
        status: true,
        escalatedToHuman: true,
        assistant: {
          select: {
            globalTenantId: true,
            model: true,
            secrets: {
              where: { kind: "OPENAI_API_KEY" },
              take: 1,
              select: { encryptedValue: true },
            },
            conversationInsightSettings: true,
          },
        },
      },
    });
    if (!conversation) return null;

    const boundary = await this.prisma.message.findFirst({
      where: {
        id: input.requestedThroughMessageId,
        conversationId: input.conversationId,
        conversation: { assistantId: conversation.assistantId },
      },
      select: { id: true, createdAt: true, metadata: true },
    });
    if (!boundary) return null;

    const [messages, activeHandoff] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId: input.conversationId,
          conversation: {
            assistantId: conversation.assistantId,
            assistant: { globalTenantId: conversation.assistant.globalTenantId },
          },
          OR: [
            { createdAt: { lt: boundary.createdAt } },
            { createdAt: boundary.createdAt, id: { lte: boundary.id } },
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX_ANALYSIS_MESSAGES,
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.handoff.findFirst({
        where: {
          conversationId: input.conversationId,
          status: { in: ["PENDING", "ASSIGNED"] },
          conversation: {
            assistantId: conversation.assistantId,
            assistant: { globalTenantId: conversation.assistant.globalTenantId },
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      conversationId: conversation.id,
      assistantId: conversation.assistantId,
      globalTenantId: conversation.assistant.globalTenantId,
      channel: conversation.channel,
      assistantModel: conversation.assistant.model,
      openAiApiKey: resolveAssistantOpenAiApiKey({
        encryptedValue: conversation.assistant.secrets[0]?.encryptedValue,
        env: this.env,
      }),
      settings: normalizeConversationInsightSettings(mapSettings(
        conversation.assistant.conversationInsightSettings,
      )),
      activeHandoff: Boolean(activeHandoff),
      requestedHandoff:
        conversation.escalatedToHuman
        || conversation.status === "ESCALATED"
        || readMetadataString(boundary.metadata, "aiBlockedReason") === "HANDOFF_REQUESTED",
      messages: boundConversationMessages([...messages].reverse()),
    };
  }

  async listFailedEnqueueCandidates(
    limit: number,
  ): Promise<FailedConversationAnalysisEnqueue[]> {
    const boundedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    return this.prisma.$queryRaw<FailedConversationAnalysisEnqueue[]>`
      SELECT
        c.id AS conversationId,
        c.assistantId,
        m.id AS messageId,
        m.createdAt AS messageCreatedAt
      FROM Conversation c
      JOIN Assistant a ON a.id = c.assistantId
      JOIN Message m ON m.conversationId = c.id
      WHERE m.analysisPendingAt IS NOT NULL
      ORDER BY m.analysisPendingAt ASC, m.id ASC
      LIMIT ${boundedLimit}
    `;
  }

  async clearFailedEnqueueMarker(input: {
    conversationId: string;
    assistantId: string;
    messageId: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE Message m
      JOIN Conversation c ON c.id = m.conversationId
      SET
        m.analysisPendingAt = NULL,
        m.metadata = JSON_REMOVE(
          m.metadata,
          '$.conversationAnalysisPending'
        )
      WHERE m.id = ${input.messageId}
        AND m.conversationId = ${input.conversationId}
        AND c.assistantId = ${input.assistantId}
    `;
    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET metadata = JSON_REMOVE(
        metadata,
        '$.context.conversationAnalysisEnqueueError',
        '$.context.conversationAnalysisEnqueueFailedMessageId'
      )
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.assistantId}
        AND JSON_UNQUOTE(
          JSON_EXTRACT(metadata, '$.context.conversationAnalysisEnqueueFailedMessageId')
        ) = ${input.messageId}
    `;
  }

  async publishInsight(input: ConversationInsightPublication): Promise<void> {
    const activeTransaction = this.transactionContext.getStore();
    if (activeTransaction) {
      await publishWithTransaction(activeTransaction, input);
      return;
    }
    await this.prisma.$transaction((transaction) =>
      publishWithTransaction(transaction, input),
    );
  }
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function boundConversationMessages<
  TMessage extends { content: string }
>(messages: TMessage[]): TMessage[] {
  const selected: TMessage[] = [];
  let remainingCharacters = MAX_ANALYSIS_CHARACTERS;
  for (let index = messages.length - 1; index >= 0 && remainingCharacters > 0; index -= 1) {
    const message = messages[index];
    const content = message.content.length <= remainingCharacters
      ? message.content
      : message.content.slice(-remainingCharacters);
    selected.push({ ...message, content });
    remainingCharacters -= content.length;
  }
  return selected.reverse();
}

function mapJob(record: {
  conversationId: string;
  requestedThroughMessageId: string;
  requestedThroughMessageCreatedAt: Date;
  requestedAt: Date;
  status: ConversationAnalysisJob["status"];
  attempts: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ConversationAnalysisJob {
  return { ...record };
}

function mapSettings(record: null | {
  version: number;
  hotLeadThreshold: number;
  purchaseIntentWeight: number;
  productDefinedWeight: number;
  budgetAcceptanceWeight: number;
  urgencyWeight: number;
  contactFulfillmentWeight: number;
  interactionDepthWeight: number;
  negativeSignalsWeight: number;
}) {
  if (!record) return null;
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

export function resolveAssistantOpenAiApiKey(input: {
  encryptedValue: string | null | undefined;
  env?: NodeJS.ProcessEnv;
  decrypt?: typeof decryptChannelSecret;
}): string | null {
  const env = input.env ?? process.env;
  if (input.encryptedValue === null || input.encryptedValue === undefined) {
    return env.OPENAI_API_KEY?.trim() || null;
  }
  if (!input.encryptedValue) {
    throw new Error("OPENAI_ASSISTANT_KEY_DECRYPT_FAILED");
  }
  const encryptionSecret = env.TOKEN_ENCRYPTION_SECRET?.trim();
  if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
  try {
    return (input.decrypt ?? decryptChannelSecret)(
      input.encryptedValue,
      encryptionSecret,
    );
  } catch {
    throw new Error("OPENAI_ASSISTANT_KEY_DECRYPT_FAILED");
  }
}

async function publishWithTransaction(
  transaction: TransactionClient,
  input: ConversationInsightPublication,
) {
  await transaction.$queryRaw`
    SELECT c.id
    FROM Conversation c
    JOIN Assistant a ON a.id = c.assistantId
    WHERE c.id = ${input.conversationId}
      AND c.assistantId = ${input.assistantId}
      AND a.globalTenantId = ${input.globalTenantId}
    FOR UPDATE
  `;
  const conversation = await transaction.conversation.findFirst({
    where: {
      id: input.conversationId,
      assistantId: input.assistantId,
      assistant: { globalTenantId: input.globalTenantId },
    },
    select: { id: true, status: true, escalatedToHuman: true },
  });
  if (!conversation) throw new Error("CONVERSATION_ANALYSIS_CONTEXT_NOT_FOUND");
  const activeHandoff = await transaction.handoff.findFirst({
    where: {
      conversationId: input.conversationId,
      status: { in: ["PENDING", "ASSIGNED"] },
      conversation: {
        assistantId: input.assistantId,
        assistant: { globalTenantId: input.globalTenantId },
      },
    },
    select: { id: true },
  });
  const latestInbound = await transaction.message.findFirst({
    where: {
      conversationId: input.conversationId,
      direction: "INBOUND",
      conversation: {
        assistantId: input.assistantId,
        assistant: { globalTenantId: input.globalTenantId },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  if (latestInbound?.id !== input.analyzedThroughMessageId) {
    throw new Error("CONVERSATION_ANALYSIS_STALE");
  }

  const intentLabel = conversation.escalatedToHuman
    || conversation.status === "ESCALATED"
    || Boolean(activeHandoff)
    ? "HUMAN_REQUESTED" as const
    : input.insight.intentLabel;
  const data = {
    analysisVersion: input.analysisVersion,
    summary: input.insight.summary,
    currentNeed: input.insight.currentNeed,
    productInterests: input.insight.productInterests,
    preferences: input.insight.preferences,
    objections: input.insight.objections,
    budgetSignals: input.insight.budgetSignals,
    urgencySignals: input.insight.urgencySignals,
    recommendations: input.insight.recommendations,
    nextBestAction: input.insight.nextBestAction,
    scoreReasons: input.insight.scoreReasons,
    leadScore: input.insight.leadScore,
    intentLabel,
    identitySignals: input.insight.identitySignals,
    analyzedThroughMessageId: input.analyzedThroughMessageId,
    analyzedAt: input.analyzedAt,
  };
  await transaction.conversationInsight.upsert({
    where: { conversationId: input.conversationId },
    create: {
      id: randomUUID(),
      conversationId: input.conversationId,
      ...data,
    },
    update: data,
  });
  const projected = await transaction.conversation.updateMany({
    where: { id: input.conversationId, assistantId: input.assistantId },
    data: {
      summary: input.insight.summary,
      intentLabel,
      intentScore: input.insight.leadScore,
    },
  });
  if (projected.count !== 1) {
    throw new Error("CONVERSATION_ANALYSIS_PROJECTION_FAILED");
  }
}
