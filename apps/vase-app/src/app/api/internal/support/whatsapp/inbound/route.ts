import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { flushPendingWhatsappReplies } from "@/server/services/support/whatsapp-bridge";

/** Labs avisa que el cliente escribió por el WhatsApp de Vase: salen las respuestas que estaban en espera. */
export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { conversationId?: unknown } | null;
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.trim() : "";
  if (!conversationId || conversationId.length > 191) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  try {
    return NextResponse.json(await flushPendingWhatsappReplies(conversationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "FAILED" }, { status: 500 });
  }
}
