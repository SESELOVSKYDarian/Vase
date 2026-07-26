import { assertServiceToken } from "@vase/internal-api";
import { getEffectiveLabsEntitlement, getLabsPlanLimits, labsChannelLimitsSchema, labsPlanSchema } from "@vase/contracts";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { resolveLabsEntitlementPlanFromSubmoduleAccess } from "@/lib/admin/user-access";

const updateSchema = z.object({
  globalTenantId: z.string().min(1),
  channelLimits: labsChannelLimitsSchema.nullable(),
  reason: z.string().trim().min(8),
});

function paidPlan(plan: string | null | undefined, submodules: Array<{ moduleId: string; key: string | null; isActive?: boolean }> = []) {
  return labsPlanSchema.parse(
    resolveLabsEntitlementPlanFromSubmoduleAccess(submodules, plan === "PREMIUM" ? "PRO" : "STARTER"),
  );
}

function assertInternal(request: Request) {
  assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
}

async function assertSuperAdmin(request: Request) {
  const actorUserId = request.headers.get("x-vase-admin-user-id")?.trim();
  if (!actorUserId) throw new Error("SUPER_ADMIN_REQUIRED");
  const actor = await prisma.user.findFirst({ where: { id: actorUserId, platformRole: "SUPER_ADMIN" }, select: { id: true } });
  if (!actor) throw new Error("SUPER_ADMIN_REQUIRED");
  return actor.id;
}

async function serializeTenants() {
  const tenants = await prisma.tenant.findMany({
    include: {
      aiWorkspace: true,
      tenantModules: { where: { moduleId: "vase_labs" }, select: { isActive: true } },
      tenantSubmodules: {
        where: { isActive: true, submodule: { moduleId: "vase_labs" } },
        select: {
          isActive: true,
          submodule: { select: { moduleId: true, key: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return tenants.map((tenant) => {
    const workspace = tenant.aiWorkspace;
    const plan = paidPlan(
      workspace?.plan,
      tenant.tenantSubmodules.map((item) => ({
        moduleId: item.submodule.moduleId,
        key: item.submodule.key,
        isActive: item.isActive,
      })),
    );
    const planLimits = getEffectiveLabsEntitlement({ paidPlan: plan }).channelLimits;
    const channelLimits = workspace?.channelLimits ? labsChannelLimitsSchema.parse(workspace.channelLimits) : planLimits;
    return {
      globalTenantId: tenant.id,
      companyName: tenant.name,
      labsActive: tenant.tenantModules[0]?.isActive ?? false,
      plan,
      enabledChannels: (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).filter((channel) => channelLimits[channel] > 0),
      channelLimits,
      planChannelLimits: planLimits,
      tokenPack: null,
      tokensIncluded: getLabsPlanLimits(plan).monthlyTokenLimit,
      tokensUsed: 0,
      extraTokens: 0,
      serviceStatus: tenant.status === "SUSPENDED" ? "SUSPENDED" : tenant.status === "TRIAL" ? "TRIAL" : "ACTIVE",
      manualOverride: Boolean(workspace?.channelLimits),
      overrideReason: workspace?.channelOverrideReason ?? null,
      overrideUpdatedBy: workspace?.channelOverrideBy ?? null,
      overrideUpdatedAt: workspace?.channelOverrideAt?.toISOString() ?? null,
      syncStatus: workspace?.labsSyncStatus ?? "SYNCED",
    };
  });
}

export async function GET(request: Request) {
  try {
    assertInternal(request);
    await assertSuperAdmin(request);
    return NextResponse.json({ tenants: await serializeTenants() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "FORBIDDEN" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    assertInternal(request);
    const actorUserId = await assertSuperAdmin(request);
    const input = updateSchema.parse(await request.json());
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.globalTenantId },
      include: {
        aiWorkspace: true,
        tenantSubmodules: {
          where: { isActive: true, submodule: { moduleId: "vase_labs" } },
          select: {
            isActive: true,
            submodule: { select: { moduleId: true, key: true } },
          },
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
    const plan = paidPlan(
      tenant.aiWorkspace?.plan,
      tenant.tenantSubmodules.map((item) => ({
        moduleId: item.submodule.moduleId,
        key: item.submodule.key,
        isActive: item.isActive,
      })),
    );
    const effective = getEffectiveLabsEntitlement({
      paidPlan: plan,
      override: input.channelLimits ? { channelLimits: input.channelLimits, reason: input.reason, updatedBy: actorUserId, updatedAt: new Date().toISOString() } : null,
    });
    const persistedChannelLimits = input.channelLimits ?? Prisma.DbNull;
    const workspace = await prisma.tenantAiWorkspace.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, channelLimits: persistedChannelLimits, channelOverrideReason: input.channelLimits ? input.reason : null, channelOverrideBy: input.channelLimits ? actorUserId : null, channelOverrideAt: input.channelLimits ? new Date() : null, labsSyncStatus: "PENDING" },
      update: { channelLimits: persistedChannelLimits, channelOverrideReason: input.channelLimits ? input.reason : null, channelOverrideBy: input.channelLimits ? actorUserId : null, channelOverrideAt: input.channelLimits ? new Date() : null, labsSyncStatus: "PENDING" },
    });
    await prisma.auditLog.create({ data: { tenantId: tenant.id, actorUserId, action: input.channelLimits ? "LABS_CHANNEL_OVERRIDE_UPDATED" : "LABS_CHANNEL_OVERRIDE_CLEARED", targetType: "TenantAiWorkspace", targetId: workspace.id, metadata: { reason: input.reason, channelLimits: effective.channelLimits, paidPlan: plan } } });

    let syncStatus = "SYNCED";
    try {
      const response = await fetch(new URL("/api/internal/admin/labs/entitlements", process.env.LABS_INTERNAL_URL ?? "http://vase-labs:3007"), {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "content-type": "application/json" },
        body: JSON.stringify({ globalTenantId: tenant.id, plan, status: tenant.status === "TRIAL" ? "TRIAL" : "ACTIVE", enabledChannels: effective.enabledChannels, channelLimits: effective.channelLimits }),
      });
      if (!response.ok) throw new Error(`LABS_SYNC_${response.status}`);
    } catch {
      syncStatus = "FAILED";
    }
    await prisma.tenantAiWorkspace.update({ where: { tenantId: tenant.id }, data: { labsSyncStatus: syncStatus } });
    return NextResponse.json({ ok: true, effective, syncStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LABS_OVERRIDE_FAILED";
    return NextResponse.json({ error: message }, { status: message === "SUPER_ADMIN_REQUIRED" ? 403 : 400 });
  }
}
