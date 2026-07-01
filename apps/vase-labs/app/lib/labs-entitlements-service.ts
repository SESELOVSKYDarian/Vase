import {
  createTokenUsage,
  getLabsPlanLimits,
  type LabsChannel,
  type LabsPlan,
  type TokenPack,
  type TokenUsage,
} from "@vase/contracts";
import {
  calculateRemainingMessages,
  calculateRemainingTokens,
  createRuntimeEntitlement,
  type LabsRuntimeEntitlement,
  type LabsRuntimeStatus,
} from "./billing";
import { labsPrisma } from "./db";

export interface LabsEntitlementRecord {
  id: string;
  globalTenantId: string;
  plan: LabsPlan;
  status: LabsRuntimeStatus;
  enabledChannels: LabsChannel[];
  tokenPack: TokenPack | null;
  tokensIncluded: number;
  tokensUsed: number;
  extraTokens: number;
  currentPeriodStart: Date | null;
  renewsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertLabsEntitlementInput {
  globalTenantId: string;
  plan: LabsPlan;
  status: LabsRuntimeStatus;
  enabledChannels?: LabsChannel[];
  tokenPack?: TokenPack | null;
  tokensIncluded?: number;
  tokensUsed?: number;
  extraTokens?: number;
  currentPeriodStart?: string | Date | null;
  renewsAt?: string | Date | null;
}

interface PersistedTokenUsageInput {
  channel: LabsChannel;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  conversationId?: string;
  messageId?: string;
  assistantId?: string;
  costCents?: number | null;
  source?: string;
}

interface PersistedTokenUsageRecord extends PersistedTokenUsageInput {
  id: string;
  globalTenantId: string;
  createdAt: Date;
}

export interface LabsEntitlementsRepository {
  findByGlobalTenantId(globalTenantId: string): Promise<LabsEntitlementRecord | null>;
  upsert(input: Required<Pick<UpsertLabsEntitlementInput, "globalTenantId" | "plan" | "status">> & {
    enabledChannels: LabsChannel[];
    tokenPack: TokenPack | null;
    tokensIncluded: number;
    tokensUsed?: number;
    extraTokens: number;
    currentPeriodStart: Date | null;
    renewsAt: Date | null;
  }): Promise<LabsEntitlementRecord>;
  registerUsage(globalTenantId: string, usage: PersistedTokenUsageInput): Promise<{
    entitlement: LabsEntitlementRecord;
    usage: PersistedTokenUsageRecord;
  }>;
}

export interface RegisterPersistedTokenUsageInput {
  channel: LabsChannel;
  inputTokens: number;
  outputTokens: number;
  conversationId?: string;
  messageId?: string;
  assistantId?: string;
  costCents?: number | null;
  source?: string;
}

function parseNullableDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function toRuntimeEntitlement(record: LabsEntitlementRecord): LabsRuntimeEntitlement {
  return createRuntimeEntitlement({
    globalTenantId: record.globalTenantId,
    plan: record.plan,
    status: record.status,
    enabledChannels: record.enabledChannels,
    tokenPack: record.tokenPack,
    tokensIncluded: record.tokensIncluded,
    tokensUsed: record.tokensUsed,
    extraTokens: record.extraTokens,
    currentPeriodStart: record.currentPeriodStart?.toISOString() ?? null,
    renewsAt: record.renewsAt?.toISOString() ?? null,
  });
}

export function createLabsEntitlementsService(repository: LabsEntitlementsRepository) {
  return {
    async getEntitlement(globalTenantId: string): Promise<LabsRuntimeEntitlement | null> {
      const record = await repository.findByGlobalTenantId(globalTenantId);
      return record ? toRuntimeEntitlement(record) : null;
    },

    async upsertEntitlement(input: UpsertLabsEntitlementInput): Promise<LabsRuntimeEntitlement> {
      const defaults = getLabsPlanLimits(input.plan);
      const record = await repository.upsert({
        globalTenantId: input.globalTenantId,
        plan: input.plan,
        status: input.status,
        enabledChannels: input.enabledChannels ?? [...defaults.includedChannels],
        tokenPack: input.tokenPack ?? null,
        tokensIncluded: input.tokensIncluded ?? defaults.monthlyTokenLimit,
        tokensUsed: input.tokensUsed,
        extraTokens: input.extraTokens ?? 0,
        currentPeriodStart: parseNullableDate(input.currentPeriodStart),
        renewsAt: parseNullableDate(input.renewsAt),
      });

      return toRuntimeEntitlement(record);
    },

    async registerTokenUsage(globalTenantId: string, input: RegisterPersistedTokenUsageInput) {
      const usage = createTokenUsage({
        globalTenantId,
        channel: input.channel,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        conversationId: input.conversationId,
        messageId: input.messageId,
        assistantId: input.assistantId,
      });
      const persisted = await repository.registerUsage(globalTenantId, {
        channel: usage.channel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        conversationId: usage.conversationId,
        messageId: usage.messageId,
        assistantId: usage.assistantId,
        costCents: input.costCents ?? null,
        source: input.source ?? "assistant",
      });
      const entitlement = toRuntimeEntitlement(persisted.entitlement);

      return {
        entitlement,
        usage: {
          ...usage,
          occurredAt: persisted.usage.createdAt.toISOString(),
        } satisfies TokenUsage,
        remainingTokens: calculateRemainingTokens(entitlement),
        remainingMessages: calculateRemainingMessages(entitlement),
      };
    },
  };
}

export const prismaLabsEntitlementsRepository: LabsEntitlementsRepository = {
  async findByGlobalTenantId(globalTenantId) {
    return (labsPrisma as any).labsEntitlement.findUnique({
      where: { globalTenantId },
    });
  },

  async upsert(input) {
    return (labsPrisma as any).labsEntitlement.upsert({
      where: { globalTenantId: input.globalTenantId },
      create: {
        ...input,
        tokensUsed: input.tokensUsed ?? 0,
      },
      update: {
        plan: input.plan,
        status: input.status,
        enabledChannels: input.enabledChannels,
        tokenPack: input.tokenPack,
        tokensIncluded: input.tokensIncluded,
        ...(input.tokensUsed === undefined ? {} : { tokensUsed: input.tokensUsed }),
        extraTokens: input.extraTokens,
        currentPeriodStart: input.currentPeriodStart,
        renewsAt: input.renewsAt,
      },
    });
  },

  async registerUsage(globalTenantId, usage) {
    return (labsPrisma as any).$transaction(async (tx: any) => {
      const entitlement = await tx.labsEntitlement.update({
        where: { globalTenantId },
        data: {
          tokensUsed: {
            increment: usage.totalTokens,
          },
        },
      });
      const persistedUsage = await tx.tokenUsage.create({
        data: {
          globalTenantId,
          channel: usage.channel,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          conversationId: usage.conversationId,
          messageId: usage.messageId,
          assistantId: usage.assistantId,
          costCents: usage.costCents,
          source: usage.source ?? "assistant",
        },
      });

      return { entitlement, usage: persistedUsage };
    });
  },
};

export const labsEntitlementsService = createLabsEntitlementsService(prismaLabsEntitlementsRepository);
