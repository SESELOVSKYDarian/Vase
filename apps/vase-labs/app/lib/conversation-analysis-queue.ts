export const CONVERSATION_ANALYSIS_JOB_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export type ConversationAnalysisJobStatus = (typeof CONVERSATION_ANALYSIS_JOB_STATUSES)[number];

export interface ConversationAnalysisJob {
  conversationId: string;
  requestedThroughMessageId: string;
  requestedThroughMessageCreatedAt: Date;
  status: ConversationAnalysisJobStatus;
  attempts: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationAnalysisQueueRepository {
  listClaimableConversationIds(input: {
    now: Date;
    maxAttempts: number;
    limit: number;
  }): Promise<string[]>;
  withJob<TResult>(
    conversationId: string,
    operation: (
      current: ConversationAnalysisJob | null,
    ) => Promise<{ job: ConversationAnalysisJob; result: TResult }>
      | { job: ConversationAnalysisJob; result: TResult },
  ): Promise<TResult>;
}

export interface ConversationAnalysisQueueDependencies {
  repository: ConversationAnalysisQueueRepository;
  clock: () => Date;
  tokenFactory: () => string;
  maxAttempts: number;
  leaseDurationMs: number;
  claimBatchSize?: number;
}

export type ConversationAnalysisCompletion = "COMPLETED" | "REQUEUED" | "LEASE_LOST";
export type ConversationAnalysisFailure = "RETRY_QUEUED" | "FAILED" | "LEASE_LOST";

function isClaimable(job: ConversationAnalysisJob, now: Date, maxAttempts: number) {
  if (job.attempts >= maxAttempts) return false;
  if (job.status === "QUEUED") return true;
  return job.status === "PROCESSING"
    && job.leaseExpiresAt !== null
    && job.leaseExpiresAt.getTime() <= now.getTime();
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (message.trim() || "Conversation analysis failed").slice(0, 2_000);
}

function isNewerRequest(input: {
  messageId: string;
  messageCreatedAt: Date;
}, current: ConversationAnalysisJob) {
  const timeDifference = input.messageCreatedAt.getTime()
    - current.requestedThroughMessageCreatedAt.getTime();
  return timeDifference > 0
    || (timeDifference === 0 && input.messageId.localeCompare(current.requestedThroughMessageId) > 0);
}

export function createConversationAnalysisQueue(dependencies: ConversationAnalysisQueueDependencies) {
  const maxAttempts = Math.floor(dependencies.maxAttempts);
  const leaseDurationMs = Math.floor(dependencies.leaseDurationMs);
  const claimBatchSize = Math.floor(dependencies.claimBatchSize ?? 25);
  if (
    !Number.isFinite(maxAttempts)
    || !Number.isFinite(leaseDurationMs)
    || !Number.isFinite(claimBatchSize)
    || maxAttempts < 1
    || leaseDurationMs < 1
    || claimBatchSize < 1
  ) {
    throw new Error("INVALID_CONVERSATION_ANALYSIS_QUEUE_CONFIG");
  }

  return {
    enqueue(input: {
      conversationId: string;
      requestedThroughMessageId: string;
      requestedThroughMessageCreatedAt: Date;
    }) {
      const now = dependencies.clock();
      return dependencies.repository.withJob(input.conversationId, (current) => {
        if (!current) {
          const created: ConversationAnalysisJob = {
            conversationId: input.conversationId,
            requestedThroughMessageId: input.requestedThroughMessageId,
            requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
            status: "QUEUED",
            attempts: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          };
          return { job: created, result: created };
        }
        if (current.requestedThroughMessageId === input.requestedThroughMessageId) {
          return { job: current, result: current };
        }
        if (!isNewerRequest({
          messageId: input.requestedThroughMessageId,
          messageCreatedAt: input.requestedThroughMessageCreatedAt,
        }, current)) {
          return { job: current, result: current };
        }
        const next: ConversationAnalysisJob = current.status === "PROCESSING"
          ? {
              ...current,
              requestedThroughMessageId: input.requestedThroughMessageId,
              requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
              attempts: 0,
              updatedAt: now,
            }
          : {
              ...current,
              requestedThroughMessageId: input.requestedThroughMessageId,
              requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
              status: "QUEUED",
              attempts: 0,
              leaseToken: null,
              leaseExpiresAt: null,
              lastError: null,
              updatedAt: now,
            };
        return { job: next, result: next };
      });
    },

    async claimNext(): Promise<ConversationAnalysisJob | null> {
      const now = dependencies.clock();
      const conversationIds = await dependencies.repository.listClaimableConversationIds({
        now,
        maxAttempts,
        limit: claimBatchSize,
      });
      for (const conversationId of conversationIds) {
        const claimed = await dependencies.repository.withJob<ConversationAnalysisJob | null>(
          conversationId,
          (current) => {
            if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
            if (!isClaimable(current, now, maxAttempts)) {
              return { job: current, result: null };
            }
            const next: ConversationAnalysisJob = {
              ...current,
              status: "PROCESSING",
              attempts: current.attempts + 1,
              leaseToken: dependencies.tokenFactory(),
              leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
              lastError: null,
              updatedAt: now,
            };
            return { job: next, result: next };
          },
        );
        if (claimed) return claimed;
      }
      return null;
    },

    fail(input: {
      conversationId: string;
      leaseToken: string;
      error: unknown;
    }): Promise<ConversationAnalysisFailure> {
      const now = dependencies.clock();
      return dependencies.repository.withJob(input.conversationId, (current) => {
        if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
        if (current.status !== "PROCESSING" || current.leaseToken !== input.leaseToken) {
          return { job: current, result: "LEASE_LOST" as const };
        }
        const exhausted = current.attempts >= maxAttempts;
        const next: ConversationAnalysisJob = {
          ...current,
          status: exhausted ? "FAILED" : "QUEUED",
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: errorMessage(input.error),
          updatedAt: now,
        };
        return {
          job: next,
          result: exhausted ? "FAILED" as const : "RETRY_QUEUED" as const,
        };
      });
    },

    complete(input: {
      conversationId: string;
      leaseToken: string;
      analyzedThroughMessageId: string;
      publish: () => Promise<void>;
    }): Promise<ConversationAnalysisCompletion> {
      const now = dependencies.clock();
      return dependencies.repository.withJob(input.conversationId, async (current) => {
        if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
        if (current.status !== "PROCESSING" || current.leaseToken !== input.leaseToken) {
          return { job: current, result: "LEASE_LOST" as const };
        }
        if (current.requestedThroughMessageId !== input.analyzedThroughMessageId) {
          const requeued: ConversationAnalysisJob = {
            ...current,
            status: "QUEUED",
            attempts: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: null,
            updatedAt: now,
          };
          return { job: requeued, result: "REQUEUED" as const };
        }

        await input.publish();
        const completed: ConversationAnalysisJob = {
          ...current,
          status: "COMPLETED",
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: null,
          updatedAt: now,
        };
        return { job: completed, result: "COMPLETED" as const };
      });
    },
  };
}
