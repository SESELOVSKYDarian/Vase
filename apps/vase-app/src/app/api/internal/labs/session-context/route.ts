import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { labsSessionContextSchema } from "@vase/contracts";
import { prisma } from "@/lib/db/prisma";
import {
  findAuthorizedLabsMembership,
  resolveLabsSessionWorkspaceEntitlement,
} from "@/server/services/labs-session-context";
import {
  resolveLabsCommercialStatus,
  resolveStoredLabsEntitlementPlan,
} from "@/server/services/labs-entitlement-state";

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim();
    const requestedTenantSlug = url.searchParams.get("tenantSlug")?.trim();

    if (!userId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const membership = await findAuthorizedLabsMembership(prisma, {
      userId,
      requestedTenantSlug: requestedTenantSlug || undefined,
    });

    if (!membership) {
      return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
    }

    const workspace = membership.tenant.aiWorkspace;
    const paidPlan = resolveStoredLabsEntitlementPlan({
      entitlementPlan: workspace?.entitlementPlan,
      legacyPlan: workspace?.plan,
    });
    const selectedSubmodule = membership.tenant.tenantSubmodules.find(
      (item) => item.submodule.key?.toUpperCase() === paidPlan,
    );
    const commercialStatus = resolveLabsCommercialStatus({
      module: membership.tenant.tenantModules[0],
      submodule: selectedSubmodule,
    });
    if (commercialStatus === "SUSPENDED") {
      return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
    }
    const { channelLimits, enabledChannels } = resolveLabsSessionWorkspaceEntitlement({
      paidPlan,
      channelLimits: workspace?.channelLimits,
      channelOverrideReason: workspace?.channelOverrideReason,
      channelOverrideBy: workspace?.channelOverrideBy,
      channelOverrideAt: workspace?.channelOverrideAt,
    });
    const payload = labsSessionContextSchema.parse({
      globalUserId: userId,
      globalTenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      role: membership.role,
      entitlement: {
        plan: paidPlan,
        status: commercialStatus,
        enabledChannels,
        channelLimits,
      },
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LABS_SESSION_CONTEXT_FAILED";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}
