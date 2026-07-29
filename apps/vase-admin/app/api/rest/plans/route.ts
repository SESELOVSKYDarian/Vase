import { NextResponse } from "next/server";

function appUrl() {
  return new URL(
    "/api/internal/admin/rest/plans",
    process.env.APP_INTERNAL_URL ?? "http://app-vase:3002",
  );
}

function headers() {
  return {
    authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
    "content-type": "application/json",
  };
}

export async function GET() {
  const response = await fetch(appUrl(), { headers: headers(), cache: "no-store" });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(request: Request) {
  const command = await request.json();
  const payload = command.action === "CREATE_DRAFT"
    ? { ...command, createdById: process.env.ADMIN_ACTOR_USER_ID ?? "" }
    : command;
  const response = await fetch(appUrl(), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
