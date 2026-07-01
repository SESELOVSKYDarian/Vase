import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const conversations = await (labsPrisma as any).$queryRaw`
    SELECT c.*
    FROM "Conversation" c
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
      AND c.id = ${conversationId}
    LIMIT 1
  `;
  const messages = await (labsPrisma as any).$queryRaw`
    SELECT m.*
    FROM "Message" m
    WHERE m."conversationId" = ${conversationId}
    ORDER BY m."createdAt" ASC
  `;

  return NextResponse.json({ conversation: conversations[0] ?? null, messages });
}
