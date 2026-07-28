import { NextResponse } from "next/server";
import { createBranchService } from "@/lib/branches/branch-service";
import { prismaBranchRepository } from "@/lib/branches/branch-repository";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";
import { db } from "@/lib/db";

const service = createBranchService(prismaBranchRepository);

function tenantSlug(request: Request) {
  return new URL(request.url).searchParams.get("tenant") ?? undefined;
}

async function context(request: Request) {
  if (request.headers.get("authorization")) {
    const staff = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "staff:write",
    });
    const entitlement = await db.restEntitlementProjection.findUniqueOrThrow({
      where: { globalTenantId: staff.globalTenantId },
    });
    return {
      globalTenantId: staff.globalTenantId,
      status: entitlement.status,
      branchLimit: entitlement.branchLimit,
      actorId: staff.actorId,
    };
  }
  const resolved = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenantSlug(request),
  });
  return {
    globalTenantId: resolved.globalTenantId,
    status: resolved.entitlement.status,
    branchLimit: resolved.entitlement.limits.branches,
    actorId: resolved.actor.id,
  };
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_BRANCH_FAILED";
  const status = code.includes("SESSION") ? 401
    : code.includes("FORBIDDEN") || code.includes("INACTIVE") || code.includes("LIMIT") ? 403
      : code.includes("DUPLICATE") ? 409
        : 400;
  return NextResponse.json({ error: code }, { status });
}

export async function GET(request: Request) {
  try {
    return NextResponse.json({ branches: await service.list(await context(request)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("authorization")) {
      throw new Error("REST_BRANCH_OWNER_REQUIRED");
    }
    const branch = await service.create(await context(request), await request.json());
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
