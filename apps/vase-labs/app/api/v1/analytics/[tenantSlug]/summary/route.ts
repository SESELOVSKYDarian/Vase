import { NextResponse } from "next/server";
import { summarizeLabsAnalytics } from "../../../../../lib/analytics-service";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const conversations = await (labsPrisma as any).$queryRaw`
    SELECT c.status, c."escalatedToHuman"
    FROM "Conversation" c JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
  `;
  const messages = await (labsPrisma as any).$queryRaw`
    SELECT m.direction, c.channel
    FROM "Message" m JOIN "Conversation" c ON c.id = m."conversationId"
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
  `;
  const tokenUsages = await (labsPrisma as any).$queryRaw`
    SELECT t."totalTokens", t."costCents"
    FROM "TokenUsage" t JOIN "Assistant" a ON a."globalTenantId" = t."globalTenantId"
    WHERE a."tenantSlug" = ${tenantSlug}
  `;
  const channels = await (labsPrisma as any).$queryRaw`
    SELECT ch.type, ch.status
    FROM "Channel" ch JOIN "Assistant" a ON a.id = ch."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
  `;
  const handoffs = await (labsPrisma as any).$queryRaw`
    SELECT h.status
    FROM "Handoff" h JOIN "Conversation" c ON c.id = h."conversationId"
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
  `;

  return NextResponse.json({ summary: summarizeLabsAnalytics({ conversations, messages, tokenUsages, channels, handoffs }) });
}
