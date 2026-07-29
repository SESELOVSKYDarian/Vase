import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  createRestSessionContextService,
  signRestSessionContext,
} from "@/server/services/rest-session-context";

const service = createRestSessionContextService({
  async findMembership({ globalUserId, requestedTenantSlug }) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: globalUserId,
        ...(requestedTenantSlug ? { tenant: { slug: requestedTenantSlug } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        tenant: {
          include: {
            restContract: {
              include: { pricingVersion: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!membership) return null;
    const contract = membership.tenant.restContract;

    return {
      globalUserId: membership.user.id,
      userName: membership.user.name,
      membershipStatus: membership.status,
      tenantRole: membership.role,
      globalTenantId: membership.tenant.id,
      tenantSlug: membership.tenant.slug,
      tenantName: membership.tenant.name,
      tenantStatus: membership.tenant.status,
      contract: contract ? {
        status: contract.status,
        plan: contract.plan,
        pricingVersion: contract.acceptedVersion,
        limits: {
          branches: contract.branchLimit,
          localEmployees: contract.localEmployeeLimit,
          devices: contract.deviceLimit,
          edgeInstallations: contract.edgeLimit,
        },
      } : null,
    };
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
    const body = JSON.stringify(context);
    const signature = signRestSessionContext(
      body,
      process.env.REST_CONTEXT_SIGNING_SECRET ?? process.env.AUTH_SECRET ?? "",
    );

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-vase-context-signature": signature,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "REST_SESSION_CONTEXT_FAILED";
    const status =
      message === "FORBIDDEN" || message === "REST_TENANT_FORBIDDEN" ? 403
        : message === "REST_CONTRACT_INACTIVE" ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
