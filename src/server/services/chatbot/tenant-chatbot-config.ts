import { AiChannelType } from "@prisma/client";
import { getConnectedChannelByTenant } from "@/server/queries/chatbot";
import { getTenantAiRuntimeConfig } from "@/server/services/ai";

export type TenantChatbotConfig = {
  tenantId: string;
  workspaceId: string;
  displayName: string;
  channelType: AiChannelType;
  bookingEnabled: boolean;
  bookingConfiguration: Record<string, unknown>;
  businessContext: Record<string, unknown>;
  channelConfig: Record<string, unknown>;
  escalation: {
    enabled: boolean;
    destination: string;
    contact?: string | null;
  };
};

export async function getTenantChatbotConfig(
  tenantId: string,
  channelType: AiChannelType,
  accountLabel?: string | null,
): Promise<TenantChatbotConfig> {
  const runtimeConfig = await getTenantAiRuntimeConfig(tenantId);
  const channel = await getConnectedChannelByTenant(tenantId, channelType, accountLabel);

  if (!channel) {
    throw new Error(`Channel ${channelType} not configured for tenant ${tenantId}`);
  }

  return {
    tenantId,
    workspaceId: runtimeConfig.workspaceId,
    displayName: runtimeConfig.displayName,
    channelType,
    bookingEnabled: runtimeConfig.bookingEnabled,
    bookingConfiguration:
      runtimeConfig.businessContext.bookingConfiguration &&
      typeof runtimeConfig.businessContext.bookingConfiguration === "object"
        ? (runtimeConfig.businessContext.bookingConfiguration as Record<string, unknown>)
        : {},
    businessContext: runtimeConfig.businessContext,
    channelConfig:
      channel.config && typeof channel.config === "object"
        ? (channel.config as Record<string, unknown>)
        : {},
    escalation: runtimeConfig.escalation,
  };
}
