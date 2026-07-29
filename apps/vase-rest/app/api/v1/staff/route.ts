import { NextResponse } from "next/server";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { createStaffService } from "@/lib/staff/staff-service";
import { listPublicStaff, prismaStaffRepository } from "@/lib/staff/staff-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";
import { db } from "@/lib/db";

const service = createStaffService(prismaStaffRepository);

async function ownerContext(request: Request) {
  if (request.headers.get("authorization")) {
    const staff = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "staff:write",
    });
    const entitlement = await db.restEntitlementProjection.findUniqueOrThrow({
      where: { globalTenantId: staff.globalTenantId },
      select: { localEmployeeLimit: true, status: true },
    });
    return {
      globalTenantId: staff.globalTenantId,
      employeeLimit: entitlement.localEmployeeLimit,
      status: entitlement.status,
      actorId: staff.actorId,
    };
  }
  const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
  const context = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenant,
  });
  return {
    globalTenantId: context.globalTenantId,
    employeeLimit: context.entitlement.limits.localEmployees,
    status: context.entitlement.status,
    actorId: context.actor.id,
  };
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_STAFF_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("LIMIT") || code.includes("FORBIDDEN") || code.includes("INACTIVE") ? 403
        : code.includes("DUPLICATE") ? 409 : 400,
  });
}

export async function GET(request: Request) {
  try {
    const context = await ownerContext(request);
    return NextResponse.json({ staff: await listPublicStaff(context.globalTenantId) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const staff = await service.create(await ownerContext(request), await request.json());
    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
