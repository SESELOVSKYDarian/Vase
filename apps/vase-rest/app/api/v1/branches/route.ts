import { NextResponse } from "next/server";
import { createBranchService } from "@/lib/branches/branch-service";
import { prismaBranchRepository } from "@/lib/branches/branch-repository";
import { resolveRestOwnerRequest } from "@/lib/request-context";

const service = createBranchService(prismaBranchRepository);

function tenantSlug(request: Request) {
  return new URL(request.url).searchParams.get("tenant") ?? undefined;
}

async function context(request: Request) {
  const resolved = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenantSlug(request),
  });
  return {
    globalTenantId: resolved.globalTenantId,
    status: resolved.entitlement.status,
    branchLimit: resolved.entitlement.limits.branches,
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
    const branch = await service.create(await context(request), await request.json());
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
