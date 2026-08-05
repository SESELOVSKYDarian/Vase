import {
  getEffectiveLabsEntitlement,
  getLabsPlanLimits,
  labsChannelLimitsSchema,
  labsPlanSchema,
} from "@vase/contracts";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { resolveLabsEntitlementPlanFromSubmoduleAccess } from "@/lib/admin/user-access";
import { resolveLabsWorkspaceEntitlement } from "@/server/services/labs-entitlement-state";

export const resolveLabsAdminWorkspaceEntitlement = resolveLabsWorkspaceEntitlement;

export const labsAdminUpdateSchema = z.object({
  globalTenantId: z.string().min(1),
  channelLimits: labsChannelLimitsSchema.nullable(),
  reason: z.string().trim().min(8),
});

function paidPlan(
  plan: string | null | undefined,
  submodules: Array<{ moduleId: string; key: string | null; isActive?: boolean }> = [],
) {
  return labsPlanSchema.parse(
    resolveLabsEntitlementPlanFromSubmoduleAccess(
      submodules,
      plan === "PREMIUM" ? "PRO" : "STARTER",
    ),
  );
}

export async function listLabsAdminTenants() {
  const tenants = await prisma.tenant.findMany({
    include: {
      aiWorkspace: true,
      tenantModules: { where: { moduleId: "vase_labs" }, select: { isActive: true } },
      tenantSubmodules: {
        where: { isActive: true, submodule: { moduleId: "vase_labs" } },
        select: { isActive: true, submodule: { select: { moduleId: true, key: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return tenants.map((tenant) => {
    const workspace = tenant.aiWorkspace;
    const plan = paidPlan(workspace?.plan, tenant.tenantSubmodules.map((item) => ({
      moduleId: item.submodule.moduleId,
      key: item.submodule.key,
      isActive: item.isActive,
    })));
    const resolved = resolveLabsAdminWorkspaceEntitlement({
      paidPlan: plan,
      channelLimits: workspace?.channelLimits,
      channelOverrideReason: workspace?.channelOverrideReason,
      channelOverrideBy: workspace?.channelOverrideBy,
      channelOverrideAt: workspace?.channelOverrideAt,
    });
    const { channelLimits, planChannelLimits: planLimits } = resolved;
    return {
      globalTenantId: tenant.id,
      companyName: tenant.name,
      labsActive: tenant.tenantModules[0]?.isActive ?? false,
      plan,
      enabledChannels: (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const)
        .filter((channel) => channelLimits[channel] > 0),
      channelLimits,
      planChannelLimits: planLimits,
      tokenPack: null,
      tokensIncluded: getLabsPlanLimits(plan).monthlyTokenLimit,
      tokensUsed: 0,
      extraTokens: 0,
      serviceStatus: tenant.status === "SUSPENDED" ? "SUSPENDED" as const
        : tenant.status === "TRIAL" ? "TRIAL" as const
          : "ACTIVE" as const,
      manualOverride: resolved.manualOverride,
      overrideReason: resolved.overrideReason,
      overrideUpdatedBy: resolved.overrideUpdatedBy,
      overrideUpdatedAt: resolved.overrideUpdatedAt,
      syncStatus: workspace?.labsSyncStatus ?? "SYNCED",
    };
  });
}

export async function updateLabsAdminTenant(rawInput: unknown, actorUserId: string) {
  const input = labsAdminUpdateSchema.parse(rawInput);
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.globalTenantId },
    include: {
      aiWorkspace: true,
      tenantSubmodules: {
        where: { isActive: true, submodule: { moduleId: "vase_labs" } },
        select: { isActive: true, submodule: { select: { moduleId: true, key: true } } },
      },
    },
  });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const plan = paidPlan(tenant.aiWorkspace?.plan, tenant.tenantSubmodules.map((item) => ({
    moduleId: item.submodule.moduleId,
    key: item.submodule.key,
    isActive: item.isActive,
  })));
  const effective = getEffectiveLabsEntitlement({
    paidPlan: plan,
    override: input.channelLimits ? {
      channelLimits: input.channelLimits,
      reason: input.reason,
      updatedBy: actorUserId,
      updatedAt: new Date().toISOString(),
    } : null,
  });
  const persistedChannelLimits = effective.channelLimits;
  const workspace = await prisma.tenantAiWorkspace.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      channelLimits: persistedChannelLimits,
      channelOverrideReason: input.channelLimits ? input.reason : null,
      channelOverrideBy: input.channelLimits ? actorUserId : null,
      channelOverrideAt: input.channelLimits ? new Date() : null,
      labsSyncStatus: "PENDING",
    },
    update: {
      channelLimits: persistedChannelLimits,
      channelOverrideReason: input.channelLimits ? input.reason : null,
      channelOverrideBy: input.channelLimits ? actorUserId : null,
      channelOverrideAt: input.channelLimits ? new Date() : null,
      labsSyncStatus: "PENDING",
    },
  });
  await prisma.auditLog.create({ data: {
    tenantId: tenant.id,
    actorUserId,
    action: input.channelLimits ? "LABS_CHANNEL_OVERRIDE_UPDATED" : "LABS_CHANNEL_OVERRIDE_CLEARED",
    targetType: "TenantAiWorkspace",
    targetId: workspace.id,
    metadata: { reason: input.reason, channelLimits: effective.channelLimits, paidPlan: plan },
  } });

  let syncStatus = "SYNCED";
  try {
    const response = await fetch(new URL(
      "/api/internal/admin/labs/entitlements",
      process.env.LABS_INTERNAL_URL ?? "http://vase-labs:3007",
    ), {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        globalTenantId: tenant.id,
        plan,
        status: tenant.status === "TRIAL" ? "TRIAL" : "ACTIVE",
        enabledChannels: effective.enabledChannels,
        channelLimits: effective.channelLimits,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`LABS_SYNC_${response.status}`);
  } catch {
    syncStatus = "FAILED";
  }
  await prisma.tenantAiWorkspace.update({ where: { tenantId: tenant.id }, data: { labsSyncStatus: syncStatus } });
  return { ok: true, effective, syncStatus };
}

export function labsAdminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "LABS_ADMIN_FAILED";
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN" || message === "EMAIL_NOT_VERIFIED" || message === "SUPER_ADMIN_REQUIRED") return 403;
  if (message === "TENANT_NOT_FOUND") return 404;
  return error instanceof z.ZodError ? 400 : 500;
}
