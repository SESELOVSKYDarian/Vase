import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  labsAdminErrorStatus,
  listLabsAdminTenants,
  updateLabsAdminTenant,
} from "@/server/services/labs-admin";

function assertInternal(request: Request) {
  assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
}

async function assertSuperAdmin(request: Request) {
  const actorUserId = request.headers.get("x-vase-admin-user-id")?.trim();
  if (!actorUserId) throw new Error("SUPER_ADMIN_REQUIRED");
  const actor = await prisma.user.findFirst({
    where: { id: actorUserId, platformRole: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!actor) throw new Error("SUPER_ADMIN_REQUIRED");
  return actor.id;
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "LABS_ADMIN_FAILED";
  return NextResponse.json({ error: message }, { status: labsAdminErrorStatus(error) });
}

export async function GET(request: Request) {
  try {
    assertInternal(request);
    await assertSuperAdmin(request);
    return NextResponse.json({ tenants: await listLabsAdminTenants() });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertInternal(request);
    const actorUserId = await assertSuperAdmin(request);
    return NextResponse.json(await updateLabsAdminTenant(await request.json(), actorUserId));
  } catch (error) {
    return failure(error);
  }
}
