import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "human requested";
  const handoffId = randomUUID();
  const handoffs = await (labsPrisma as any).$queryRaw`
    INSERT INTO "Handoff" (id, "conversationId", reason, target, status, priority, "createdAt")
    SELECT ${handoffId}, c.id, ${reason}, 'workplace', 'PENDING', 'normal', ${new Date()}
    FROM "Conversation" c
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
      AND c.id = ${conversationId}
    RETURNING *
  `;

  await (labsPrisma as any).$executeRaw`
    UPDATE "Conversation"
    SET status = 'ESCALATED', "escalatedToHuman" = true, "updatedAt" = ${new Date()}
    WHERE id = ${conversationId}
  `;

  return NextResponse.json({ handoff: handoffs[0] ?? null });
}
