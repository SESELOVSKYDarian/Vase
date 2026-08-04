import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import {
  executeRestAdminCommand,
  listRestAdminData,
  restAdminErrorStatus,
} from "@/server/services/rest-admin";

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
  return NextResponse.json({ error: message }, { status: restAdminErrorStatus(error) });
}

export async function GET(request: Request) {
  void request;
  try {
    await requireVerifiedPlatformRole("SUPER_ADMIN");
    return NextResponse.json(await listRestAdminData());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireVerifiedPlatformRole("SUPER_ADMIN");
    const result = await executeRestAdminCommand(await request.json(), session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}
