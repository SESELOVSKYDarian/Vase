import { NextResponse } from "next/server";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { createStaffService } from "@/lib/staff/staff-service";
import { prismaStaffRepository } from "@/lib/staff/staff-repository";

const service = createStaffService(prismaStaffRepository);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
    const context = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
      requestedTenantSlug: tenant,
    });
    const { staffId } = await params;
    const staff = await service.update({
      globalTenantId: context.globalTenantId,
      employeeLimit: context.entitlement.limits.localEmployees,
      status: context.entitlement.status,
      actorId: context.actor.id,
    }, staffId, await request.json());
    return NextResponse.json({ staff });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_STAFF_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("NOT_FOUND") ? 404
          : code.includes("FORBIDDEN") || code.includes("INACTIVE") ? 403 : 400,
    });
  }
}
