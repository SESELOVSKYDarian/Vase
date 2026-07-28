import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createReservationService } from "@/lib/reservations/reservation-service";
import { prismaReservationRepository } from "@/lib/salon/salon-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const reservations = createReservationService(prismaReservationRepository);

async function context(request: Request) {
  return resolveRestStaffRequest({
    authorization: request.headers.get("authorization"),
    requiredCapability: "orders:write",
  });
}

export async function GET(request: Request) {
  try {
    const actor = await context(request);
    const rows = await db.reservation.findMany({
      where: {
        globalTenantId: actor.globalTenantId,
        branchId: actor.branchId,
        startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: { tables: { include: { table: true } } },
      orderBy: { startsAt: "asc" },
      take: 200,
    });
    return NextResponse.json({ reservations: rows });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await context(request);
    const { action, ...payload } = await request.json();
    const result = action === "CANCEL"
      ? await reservations.cancel({
        ...payload,
        globalTenantId: actor.globalTenantId,
        branchId: actor.branchId,
        actorId: actor.actorId,
      })
      : await reservations.create({
        ...payload,
        globalTenantId: actor.globalTenantId,
        branchId: actor.branchId,
        actorId: actor.actorId,
      });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_RESERVATION_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("OVERLAP") || code.includes("CONFLICT") ? 409 : 400,
  });
}
