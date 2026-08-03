import { NextResponse } from "next/server";
import { adminApiFailure, requireAdminSession } from "../../../lib/admin-session";

export async function GET(request: Request) {
  try {
    await requireAdminSession(request.headers.get("cookie"));
    const response = await fetch(
      new URL(
        "/api/internal/admin/health",
        process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009",
      ),
      {
        headers: {
          authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
        },
        cache: "no-store",
      },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return adminApiFailure(error);
  }
}
