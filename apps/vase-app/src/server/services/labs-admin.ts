import {
  getEffectiveLabsEntitlement,
  getLabsPlanLimits,
  labsChannelLimitsSchema,
  labsPlanSchema,
} from "@vase/contracts";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  resolveLabsCommercialStatus,
  resolveLabsWorkspaceEntitlement,
  resolveStoredLabsEntitlementPlan,
} from "@/server/services/labs-entitlement-state";

export const resolveLabsAdminWorkspaceEntitlement = resolveLabsWorkspaceEntitlement;

export const labsAdminUpdateSchema = z.object({
  globalTenantId: z.string().min(1),
  channelLimits: labsChannelLimitsSchema.nullable(),
  reason: z.string().trim().min(8),
});

function paidPlan(workspace: { entitlementPlan?: unknown; plan?: "START" | "PREMIUM" | null } | null | undefined) {
  return labsPlanSchema.parse(resolveStoredLabsEntitlementPlan({
    entitlementPlan: workspace?.entitlementPlan,
    legacyPlan: workspace?.plan,
  }));
}

export async function listLabsAdminTenants() {
  const tenants = await prisma.tenant.findMany({
    include: {
      aiWorkspace: true,
      tenantModules: { where: { moduleId: "vase_labs" }, select: { isActive: true, commercialStatus: true } },
      tenantSubmodules: {
        where: { isActive: true, submodule: { moduleId: "vase_labs" } },
        select: { isActive: true, commercialStatus: true, submodule: { select: { moduleId: true, key: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return tenants.map((tenant) => {
    const workspace = tenant.aiWorkspace;
    const plan = paidPlan(workspace);
    const selectedSubmodule = tenant.tenantSubmodules.find(
      (item) => item.submodule.key?.toUpperCase() === plan,
    );
    const commercialStatus = resolveLabsCommercialStatus({
      module: tenant.tenantModules[0],
      submodule: selectedSubmodule,
    });
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
      labsActive: commercialStatus !== "SUSPENDED",
      plan,
      enabledChannels: (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const)
        .filter((channel) => channelLimits[channel] > 0),
      channelLimits,
      planChannelLimits: planLimits,
      tokenPack: null,
      tokensIncluded: getLabsPlanLimits(plan).monthlyTokenLimit,
      tokensUsed: 0,
      extraTokens: 0,
      serviceStatus: commercialStatus,
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
  const persisted = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.globalTenantId },
      include: {
        aiWorkspace: true,
        tenantModules: {
          where: { moduleId: "vase_labs" },
          select: { isActive: true, commercialStatus: true },
        },
        tenantSubmodules: {
          where: { isActive: true, submodule: { moduleId: "vase_labs" } },
          select: { isActive: true, commercialStatus: true, submodule: { select: { moduleId: true, key: true } } },
        },
      },
    });
    if (!tenant) throw new Error("TENANT_NOT_FOUND");

    const plan = paidPlan(tenant.aiWorkspace);
    const selectedSubmodule = tenant.tenantSubmodules.find(
      (item) => item.submodule.key?.toUpperCase() === plan,
    );
    const commercialStatus = resolveLabsCommercialStatus({
      module: tenant.tenantModules[0],
      submodule: selectedSubmodule,
    });
    if (commercialStatus === "SUSPENDED") throw new Error("LABS_ENTITLEMENT_INACTIVE");
    const effective = getEffectiveLabsEntitlement({
      paidPlan: plan,
      override: input.channelLimits ? {
        channelLimits: input.channelLimits,
        reason: input.reason,
        updatedBy: actorUserId,
        updatedAt: new Date().toISOString(),
      } : null,
    });
    const workspace = await tx.tenantAiWorkspace.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        entitlementPlan: plan,
        channelLimits: effective.channelLimits,
        channelOverrideReason: input.channelLimits ? input.reason : null,
        channelOverrideBy: input.channelLimits ? actorUserId : null,
        channelOverrideAt: input.channelLimits ? new Date() : null,
        labsSyncStatus: "PENDING",
      },
      update: {
        entitlementPlan: plan,
        channelLimits: effective.channelLimits,
        channelOverrideReason: input.channelLimits ? input.reason : null,
        channelOverrideBy: input.channelLimits ? actorUserId : null,
        channelOverrideAt: input.channelLimits ? new Date() : null,
        labsSyncStatus: "PENDING",
      },
    });
    await tx.auditLog.create({ data: {
      tenantId: tenant.id,
      actorUserId,
      action: input.channelLimits ? "LABS_CHANNEL_OVERRIDE_UPDATED" : "LABS_CHANNEL_OVERRIDE_CLEARED",
      targetType: "TenantAiWorkspace",
      targetId: workspace.id,
      metadata: { reason: input.reason, channelLimits: effective.channelLimits, paidPlan: plan },
    } });
    return { tenantId: tenant.id, plan, commercialStatus, effective };
  });

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
        globalTenantId: persisted.tenantId,
        plan: persisted.plan,
        status: persisted.commercialStatus,
        enabledChannels: persisted.effective.enabledChannels,
        channelLimits: persisted.effective.channelLimits,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`LABS_SYNC_${response.status}`);
  } catch {
    syncStatus = "FAILED";
  }
  await prisma.tenantAiWorkspace.update({ where: { tenantId: persisted.tenantId }, data: { labsSyncStatus: syncStatus } });
  return { ok: true, effective: persisted.effective, syncStatus };
}

export function labsAdminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "LABS_ADMIN_FAILED";
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN" || message === "EMAIL_NOT_VERIFIED" || message === "SUPER_ADMIN_REQUIRED") return 403;
  if (message === "TENANT_NOT_FOUND") return 404;
  return error instanceof z.ZodError ? 400 : 500;
}
