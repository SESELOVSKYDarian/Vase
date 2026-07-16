import { NextResponse } from "next/server";

function appUrl() {
  return new URL("/api/internal/admin/labs/tenants", process.env.APP_INTERNAL_URL ?? "http://app-vase:3002");
}

function headers() {
  return {
    authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
    "x-vase-admin-user-id": process.env.ADMIN_ACTOR_USER_ID ?? "",
    "content-type": "application/json",
  };
}

export async function GET() {
  const response = await fetch(appUrl(), { headers: headers(), cache: "no-store" });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}

export async function POST(request: Request) {
  const response = await fetch(appUrl(), { method: "POST", headers: headers(), body: JSON.stringify(await request.json()) });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}
