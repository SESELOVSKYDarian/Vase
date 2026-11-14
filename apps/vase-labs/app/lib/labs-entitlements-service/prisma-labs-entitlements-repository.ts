// Parte de labs-entitlements-service.ts: prismaLabsEntitlementsRepository, labsEntitlementsService.
import { labsPrisma } from "../db";
import { LabsEntitlementsRepository, createLabsEntitlementsService, mapEntitlementRecord } from "./create-labs-entitlements-service";

export const prismaLabsEntitlementsRepository: LabsEntitlementsRepository = {
  async findByGlobalTenantId(globalTenantId) {
    const record = await (labsPrisma as any).labsEntitlement.findUnique({
      where: { globalTenantId },
    });
    return mapEntitlementRecord(record);
  },

  async upsert(input) {
    const record = await (labsPrisma as any).labsEntitlement.upsert({
      where: { globalTenantId: input.globalTenantId },
      create: {
        ...input,
        enabledChannels: input.enabledChannels,
        channelLimits: input.channelLimits,
          tokensUsed: input.tokensUsed ?? 0,
          aiBudgetUsedMicros: input.aiBudgetUsedMicros ?? 0,
        },
        update: {
        plan: input.plan,
        status: input.status,
        enabledChannels: input.enabledChannels,
        channelLimits: input.channelLimits,
        tokenPack: input.tokenPack,
          tokensIncluded: input.tokensIncluded,
          ...(input.tokensUsed === undefined ? {} : { tokensUsed: input.tokensUsed }),
          extraTokens: input.extraTokens,
          aiBudgetMicros: input.aiBudgetMicros,
          ...(input.aiBudgetUsedMicros === undefined ? {} : { aiBudgetUsedMicros: input.aiBudgetUsedMicros }),
          extraAiBudgetMicros: input.extraAiBudgetMicros,
          currentPeriodStart: input.currentPeriodStart,
          renewsAt: input.renewsAt,
      },
    });
    const mapped = mapEntitlementRecord(record);
    if (!mapped) {
      throw new Error("LABS_ENTITLEMENT_PERSIST_FAILED");
    }
    return mapped;
  },

  async registerUsage(globalTenantId, usage) {
    return (labsPrisma as any).$transaction(async (tx: any) => {
      const entitlement = await tx.labsEntitlement.update({
        where: { globalTenantId },
        data: {
          tokensUsed: {
            increment: usage.totalTokens,
          },
          aiBudgetUsedMicros: {
            increment: usage.costMicros ?? 0,
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
          costMicros: usage.costMicros ?? 0,
          model: usage.model ?? null,
          profile: usage.profile ?? null,
          source: usage.source ?? "assistant",
        },
      });

      const mappedEntitlement = mapEntitlementRecord(entitlement);
      if (!mappedEntitlement) {
        throw new Error("LABS_ENTITLEMENT_USAGE_FAILED");
      }

      return { entitlement: mappedEntitlement, usage: persistedUsage };
    });
  },
};

export const labsEntitlementsService = createLabsEntitlementsService(prismaLabsEntitlementsRepository);
