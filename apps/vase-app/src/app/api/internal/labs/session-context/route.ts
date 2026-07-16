import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import type { AiWorkspacePlan } from "@prisma/client";
import type { LabsChannel, LabsPlan } from "@vase/contracts";
import { labsSessionContextSchema } from "@vase/contracts";
import { prisma } from "@/lib/db/prisma";
import { getEffectiveLabsEntitlement, type LabsChannelLimits } from "@vase/contracts";

function mapWorkspacePlan(plan: AiWorkspacePlan | null | undefined): LabsPlan {
  return plan === "PREMIUM" ? "PRO" : "STARTER";
}

function parseChannelLimits(value: unknown, fallback: LabsChannelLimits): LabsChannelLimits {
  if (!value || typeof value !== "object") return fallback;
  const current = value as Partial<Record<LabsChannel, unknown>>;
  return {
    WHATSAPP: Math.max(0, Number(current.WHATSAPP) || 0),
    INSTAGRAM: Math.max(0, Number(current.INSTAGRAM) || 0),
    FACEBOOK: Math.max(0, Number(current.FACEBOOK) || 0),
  };
}

function mapTenantStatus(status: string) {
  if (status === "SUSPENDED") {
    return "SUSPENDED";
  }

  if (status === "TRIAL") {
    return "TRIAL";
  }

  return "ACTIVE";
}

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

    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        tenant: {
          ...(requestedTenantSlug ? { slug: requestedTenantSlug } : {}),
          status: {
            in: ["ACTIVE", "TRIAL"],
          },
          tenantModules: {
            some: {
              isActive: true,
              moduleId: "vase_labs",
            },
          },
        },
      },
      include: {
        tenant: {
          include: {
            aiWorkspace: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
    }

    const workspace = membership.tenant.aiWorkspace;
    const paidPlan = mapWorkspacePlan(workspace?.plan);
    const planLimits = getEffectiveLabsEntitlement({ paidPlan }).channelLimits;
    const channelLimits = parseChannelLimits(workspace?.channelLimits, planLimits);
    const enabledChannels = (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as LabsChannel[])
      .filter((channel) => channelLimits[channel] > 0);
    const payload = labsSessionContextSchema.parse({
      globalUserId: userId,
      globalTenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      role: membership.role,
      entitlement: {
        plan: paidPlan,
        status: mapTenantStatus(membership.tenant.status),
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
