import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createManagementSessionContextService,
  type ManagementAccessRecord,
} from "@/server/services/management-session-context";

const service = createManagementSessionContextService({
  async findAccess(globalUserId, requestedTenantSlug) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: globalUserId,
        status: "ACTIVE",
        user: {
          isDisabled: false,
          emailVerified: { not: null },
        },
        tenant: {
          ...(requestedTenantSlug ? { slug: requestedTenantSlug } : {}),
          status: { in: ["ACTIVE", "TRIAL"] },
          tenantModules: {
            some: {
              moduleId: "vase_management",
              isActive: true,
              commercialStatus: { in: ["ACTIVE", "TRIAL"] },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            platformRole: true,
            moduleAccesses: {
              where: { moduleId: "vase_management" },
              select: { isActive: true },
            },
          },
        },
        tenant: {
          include: {
            tenantModules: {
              where: { moduleId: "vase_management" },
              select: { commercialStatus: true },
            },
            managementIdentityLinks: {
              where: { userId: globalUserId },
              select: { isActive: true, managementRole: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!membership) return null;

    const moduleStatus = membership.tenant.tenantModules[0]?.commercialStatus;
    const userModule = membership.user.moduleAccesses[0] ?? null;
    const identityLink = membership.tenant.managementIdentityLinks[0] ?? null;

    return {
      globalUserId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      platformRole: membership.user.platformRole,
      globalTenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      tenantRole: membership.role,
      moduleStatus:
        moduleStatus === "ACTIVE" || moduleStatus === "TRIAL"
          ? moduleStatus
          : "SUSPENDED",
      userModuleActive: userModule?.isActive ?? null,
      identityLinkActive: identityLink?.isActive ?? null,
      identityLinkRole: identityLink?.managementRole ?? null,
    } satisfies ManagementAccessRecord;
  },
});

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );

    const url = new URL(request.url);
    const globalUserId = url.searchParams.get("userId")?.trim();
    const requestedTenantSlug = url.searchParams.get("tenantSlug")?.trim() || undefined;

    if (!globalUserId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const context = await service.resolve({ globalUserId, requestedTenantSlug });
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MANAGEMENT_SESSION_CONTEXT_FAILED";
    const status =
      message === "FORBIDDEN" || message === "MANAGEMENT_NOT_ENTITLED"
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
