import { NextResponse } from "next/server";
import { createBranchService } from "@/lib/branches/branch-service";
import { prismaBranchRepository } from "@/lib/branches/branch-repository";
import { resolveRestOwnerRequest } from "@/lib/request-context";

const service = createBranchService(prismaBranchRepository);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> },
) {
  try {
    const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
    const resolved = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
      requestedTenantSlug: tenant,
    });
    const { branchId } = await params;
    const branch = await service.update({
      globalTenantId: resolved.globalTenantId,
      status: resolved.entitlement.status,
      branchLimit: resolved.entitlement.limits.branches,
      actorId: resolved.actor.id,
    }, branchId, await request.json());
    return NextResponse.json({ branch });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_BRANCH_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("NOT_FOUND") ? 404
          : code.includes("FORBIDDEN") || code.includes("INACTIVE") ? 403 : 400,
    });
  }
}
