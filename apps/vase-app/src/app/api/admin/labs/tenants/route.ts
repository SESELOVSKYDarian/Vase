import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import {
  labsAdminErrorStatus,
  listLabsAdminTenants,
  updateLabsAdminTenant,
} from "@/server/services/labs-admin";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "LABS_ADMIN_FAILED";
  return NextResponse.json({ error: message }, { status: labsAdminErrorStatus(error) });
}

export async function GET(request: Request) {
  void request;
  try {
    await requireVerifiedPlatformRole("SUPER_ADMIN");
    return NextResponse.json({ tenants: await listLabsAdminTenants() });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPlatformRole("SUPER_ADMIN");
    return NextResponse.json(await updateLabsAdminTenant(await request.json(), session.user.id));
  } catch (error) {
    return failure(error);
  }
}
