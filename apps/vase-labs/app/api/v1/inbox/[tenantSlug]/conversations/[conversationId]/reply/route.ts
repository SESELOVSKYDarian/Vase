import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
  }

  const conversations = await (labsPrisma as any).$queryRaw<Array<{ id: string; channel: string | null }>>`
    SELECT c.id, c.channel
    FROM "Conversation" c
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
      AND c.id = ${conversationId}
    LIMIT 1
  `;

  if (!conversations[0]) {
    return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const messageId = randomUUID();
  const messages = await (labsPrisma as any).$queryRaw`
    INSERT INTO "Message" (id, "conversationId", role, direction, content, "createdAt")
    VALUES (${messageId}, ${conversationId}, 'assistant', 'OUTBOUND', ${text}, ${new Date()})
    RETURNING id, content, direction
  `;

  return NextResponse.json({ message: messages[0], delivery: { status: "PENDING" } });
}
