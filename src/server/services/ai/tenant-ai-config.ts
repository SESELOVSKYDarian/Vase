import { getTenantAiWorkspaceConfig } from "@/server/queries/ai";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

export async function getTenantAiRuntimeConfig(tenantId: string): Promise<TenantAiRuntimeConfig> {
  const workspace = await getTenantAiWorkspaceConfig(tenantId);

  if (!workspace) {
    throw new Error(`AI workspace not configured for tenant ${tenantId}`);
  }

  return {
    tenantId,
    workspaceId: workspace.id,
    displayName: workspace.assistantDisplayName,
    tone: workspace.tone,
    model: workspace.modelSlug || "",
    temperature: workspace.temperature == null ? 0.4 : Number(workspace.temperature),
    timezone: workspace.timezone,
    bookingEnabled: workspace.bookingEnabled,
    businessContext:
      workspace.businessContext && typeof workspace.businessContext === "object"
        ? (workspace.businessContext as Record<string, unknown>)
        : {},
    systemPrompt: workspace.systemPrompt,
    escalation: {
      enabled: workspace.humanEscalationEnabled,
      destination: workspace.escalationDestination,
      contact: workspace.escalationContact,
    },
  };
}
