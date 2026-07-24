import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { upsertBusinessOrderProjection } from "../../../../../lib/order-projection";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return NextResponse.json(
      { error: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? message : "FORBIDDEN" },
      { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
    );
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const globalTenantId = typeof body.globalTenantId === "string" ? body.globalTenantId : "";
  const order = body.order && typeof body.order === "object" ? body.order as Record<string, unknown> : null;
  if (!globalTenantId || !order) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const result = await upsertBusinessOrderProjection({
    globalTenantId,
    assistantId: typeof body.assistantId === "string" ? body.assistantId : null,
    conversationId: typeof body.conversationId === "string" ? body.conversationId : null,
    version: typeof body.version === "number" ? body.version : undefined,
    order,
  });
  return NextResponse.json(result);
}
