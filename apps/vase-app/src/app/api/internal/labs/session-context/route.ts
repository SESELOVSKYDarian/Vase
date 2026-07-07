import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createLabsSessionContextService,
  type LabsSessionContextRepository,
} from "@/server/services/labs-session-context";

const repository: LabsSessionContextRepository = {
  async findActiveMembership(globalUserId, requestedTenantSlug) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: globalUserId,
        status: "ACTIVE",
        role: { in: ["OWNER", "MANAGER"] },
        ...(requestedTenantSlug ? { tenant: { slug: requestedTenantSlug } } : {}),
        tenant: {
          ...(requestedTenantSlug ? { slug: requestedTenantSlug } : {}),
          tenantModules: {
            some: {
              moduleId: "labs",
              isActive: true,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        tenantId: true,
        role: true,
        tenant: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    return membership
      ? {
          tenantId: membership.tenantId,
          tenantSlug: membership.tenant.slug,
          tenantName: membership.tenant.name,
          role: membership.role,
        }
      : null;
  },

  async findLabsEntitlement(globalTenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: globalTenantId },
      select: {
        status: true,
        aiWorkspace: { select: { plan: true } },
        featureFlags: {
          where: {
            key: {
              in: [
                "labs_channels_whatsapp",
                "labs_channels_instagram",
                "labs_channels_facebook",
              ],
            },
          },
          select: { key: true, enabled: true },
        },
      },
    });

    const enabled = new Set(
      tenant?.featureFlags.filter((flag) => flag.enabled).map((flag) => flag.key),
    );
    const enabledChannels = [
      enabled.has("labs_channels_whatsapp") || tenant?.aiWorkspace
        ? ("WHATSAPP" as const)
        : null,
      enabled.has("labs_channels_instagram") ? ("INSTAGRAM" as const) : null,
      enabled.has("labs_channels_facebook") ? ("FACEBOOK" as const) : null,
    ].filter((channel): channel is "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" => Boolean(channel));

    const plan = enabledChannels.includes("FACEBOOK")
      ? "PRO"
      : enabledChannels.includes("INSTAGRAM")
        ? "GROWTH"
        : "STARTER";
    const status =
      tenant?.status === "SUSPENDED"
        ? "SUSPENDED"
        : tenant?.status === "TRIAL"
          ? "TRIAL"
          : "ACTIVE";

    return {
      plan,
      status,
      enabledChannels: enabledChannels.length ? enabledChannels : ["WHATSAPP"],
    };
  },
};

const service = createLabsSessionContextService(repository);

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );

    const searchParams = new URL(request.url).searchParams;
    const globalUserId = searchParams.get("userId")?.trim();
    const requestedTenantSlug = searchParams.get("tenantSlug")?.trim() || undefined;

    if (!globalUserId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    return NextResponse.json(
      await service.resolve({ globalUserId, requestedTenantSlug }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "LABS_CONTEXT_FAILED";
    const status =
      message === "SERVICE_TOKEN_NOT_CONFIGURED"
        ? 503
        : message === "FORBIDDEN" || message === "LABS_TENANT_FORBIDDEN"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
