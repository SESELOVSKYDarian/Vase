import { NextResponse } from "next/server";
import { resolveLabsRequestContext } from "../../../lib/request-context";

async function proxy(request: Request, method: "GET" | "POST") {
  const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
  const base = process.env.VASE_APP_INTERNAL_URL ?? "http://localhost:3001";
  const url = new URL("/api/internal/management/provider", base);
  url.searchParams.set("globalTenantId", context.globalTenantId);
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, ...(method === "POST" ? { "content-type": "application/json" } : {}) }, body: method === "POST" ? JSON.stringify({ globalTenantId: context.globalTenantId, provider: (await request.json()).provider }) : undefined });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function GET(request: Request) { try { return await proxy(request, "GET"); } catch { return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); } }
export async function POST(request: Request) { try { return await proxy(request, "POST"); } catch { return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }); } }
