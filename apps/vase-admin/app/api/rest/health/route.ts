import { NextResponse } from "next/server";

export async function GET() {
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
}
