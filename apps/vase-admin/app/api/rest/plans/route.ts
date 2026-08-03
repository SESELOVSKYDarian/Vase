import { NextResponse } from "next/server";
import { adminApiFailure, requireAdminSession } from "../../../lib/admin-session";

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

export async function GET(request: Request) {
  try {
    await requireAdminSession(request.headers.get("cookie"));
    const response = await fetch(appUrl(), { headers: headers(), cache: "no-store" });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return adminApiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminSession(request.headers.get("cookie"));
    const command = await request.json();
    const payload = command.action === "CREATE_DRAFT"
      ? { ...command, createdById: actor.id }
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
  } catch (error) {
    return adminApiFailure(error);
  }
}
