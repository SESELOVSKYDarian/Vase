import { NextResponse } from "next/server";
import { adminApiFailure, requireAdminSession } from "../../../lib/admin-session";

function appUrl() {
  return new URL("/api/internal/admin/labs/tenants", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002");
}

function headers(actorId: string) {
  return {
    authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
    "x-vase-admin-user-id": actorId,
    "content-type": "application/json",
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requireAdminSession(request.headers.get("cookie"));
    const response = await fetch(appUrl(), { headers: headers(actor.id), cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch (error) {
    return adminApiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminSession(request.headers.get("cookie"));
    const response = await fetch(appUrl(), { method: "POST", headers: headers(actor.id), body: JSON.stringify(await request.json()) });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch (error) {
    return adminApiFailure(error);
  }
}
