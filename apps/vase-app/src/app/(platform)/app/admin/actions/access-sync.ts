// Mantiene alineados los accesos de un usuario con los módulos y el plan de su cuenta.
import { Prisma } from "@prisma/client";
import { buildLabsWorkspaceProvisioning, userAccessModuleIds } from "@/lib/admin/user-access";
import { clientProductAccessEnvelopeSchema, type ClientProductAccess } from "@/lib/admin/client-product-access";

export function parseModuleIds(rawValue: FormDataEntryValue | null) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export type ParsedClientAccessPayload =
  | { kind: "v2"; access: ClientProductAccess }
  | { kind: "legacy"; rawConfig: unknown };

export function parseClientAccessPayload(rawValue: FormDataEntryValue | null): ParsedClientAccessPayload | null {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return null;
  try {
    const parsedJson: unknown = JSON.parse(rawValue);
    if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) return null;
    if ("version" in parsedJson) {
      const parsed = clientProductAccessEnvelopeSchema.safeParse(parsedJson);
      return parsed.success ? { kind: "v2", access: parsed.data.productAccess } : null;
    }
    return { kind: "legacy", rawConfig: parsedJson };
  } catch {
    return null;
  }
}

export type TenantPlanForProvisioning = "TRIAL" | "PRO";
export type TenantSubscriptionPlanSource = {
  plan: "START" | "PREMIUM";
  premiumEnabled: boolean;
} | null | undefined;

export function buildActiveAccessModuleIds(input: { businessAccess: boolean; labsAccess: boolean }) {
  const moduleIds: string[] = [];
  if (input.businessAccess) moduleIds.push(userAccessModuleIds.business);
  if (input.labsAccess) moduleIds.push(userAccessModuleIds.labs);
  return moduleIds;
}

export function resolveTenantPlanFromSubscription(subscription: TenantSubscriptionPlanSource): TenantPlanForProvisioning {
  return subscription?.plan === "PREMIUM" || subscription?.premiumEnabled ? "PRO" : "TRIAL";
}

export function resolveOnboardingProductFromActiveModules(moduleIds: string[]) {
  const hasBusiness = moduleIds.includes(userAccessModuleIds.business);
  const hasLabs = moduleIds.includes(userAccessModuleIds.labs);

  if (hasBusiness && hasLabs) return "BOTH";
  if (hasLabs) return "LABS";
  return "BUSINESS";
}

export async function syncUserModuleAccess(params: {
  tx: Prisma.TransactionClient;
  userId: string;
  moduleIds: string[];
}) {
  const activeModuleIds = new Set(params.moduleIds);

  for (const moduleId of [userAccessModuleIds.business, userAccessModuleIds.labs]) {
    const isActive = activeModuleIds.has(moduleId);

    await params.tx.userModuleAccess.upsert({
      where: {
        userId_moduleId: {
          userId: params.userId,
          moduleId,
        },
      },
      update: {
        isActive,
      },
      create: {
        userId: params.userId,
        moduleId,
        isActive,
      },
    });
  }
}

export async function syncTenantProductAndLabsWorkspace(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  moduleIds: string[];
  tenantPlan: TenantPlanForProvisioning;
  labsSubmodules?: Array<{ moduleId: string; key: string | null; isActive?: boolean }>;
  tenantName: string;
  userEmail: string;
}) {
  await params.tx.tenant.update({
    where: { id: params.tenantId },
    data: {
      onboardingProduct: resolveOnboardingProductFromActiveModules(params.moduleIds),
    },
  });

  const labsWorkspace = buildLabsWorkspaceProvisioning({
    moduleIds: params.moduleIds,
    tenantPlan: params.tenantPlan,
    labsSubmodules: params.labsSubmodules,
    tenantName: params.tenantName,
    userEmail: params.userEmail,
  });

  if (!labsWorkspace) return;

  await params.tx.tenantAiWorkspace.upsert({
    where: { tenantId: params.tenantId },
    update: {
      plan: labsWorkspace.plan,
      monthlyConversationLimit: labsWorkspace.monthlyConversationLimit,
      monthlyKnowledgeItemLimit: labsWorkspace.monthlyKnowledgeItemLimit,
      maxChannels: labsWorkspace.maxChannels,
      maxFiles: labsWorkspace.maxFiles,
      maxUrls: labsWorkspace.maxUrls,
    },
    create: {
      tenantId: params.tenantId,
      plan: labsWorkspace.plan,
      assistantDisplayName: labsWorkspace.assistantDisplayName,
      tone: labsWorkspace.tone,
      trainingStatus: labsWorkspace.trainingStatus,
      timezone: labsWorkspace.timezone,
      businessHours: labsWorkspace.businessHours as Prisma.InputJsonValue,
      humanEscalationEnabled: labsWorkspace.humanEscalationEnabled,
      escalationDestination: labsWorkspace.escalationDestination,
      escalationContact: labsWorkspace.escalationContact || null,
      scrapingEnabled: labsWorkspace.scrapingEnabled,
      monthlyConversationLimit: labsWorkspace.monthlyConversationLimit,
      monthlyKnowledgeItemLimit: labsWorkspace.monthlyKnowledgeItemLimit,
      maxChannels: labsWorkspace.maxChannels,
      maxFiles: labsWorkspace.maxFiles,
      maxUrls: labsWorkspace.maxUrls,
    },
  });
}
