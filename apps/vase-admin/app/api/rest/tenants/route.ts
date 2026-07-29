import { NextResponse } from "next/server";

function restUrl(path: string) {
  return new URL(path, process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009");
}

export async function GET() {
  try {
    const headers = {
      authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
      accept: "application/json",
    };
    const [tenants, edges] = await Promise.all([
      fetch(restUrl("/api/internal/admin/tenants"), {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(restUrl("/api/internal/admin/edges"), {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
    ]);
    if (!tenants.ok || !edges.ok) {
      return NextResponse.json({ error: "REST_ADMIN_UPSTREAM_FAILED" }, {
        status: 502,
      });
    }
    const [tenantPayload, edgePayload] = await Promise.all([
      tenants.json(),
      edges.json(),
    ]);
    return NextResponse.json({
      generatedAt: tenantPayload.generatedAt,
      tenants: tenantPayload.tenants,
      edges: edgePayload.edges,
    });
  } catch {
    return NextResponse.json({ error: "REST_ADMIN_UPSTREAM_UNAVAILABLE" }, {
      status: 503,
    });
  }
}
