import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const search = new URL(request.url).searchParams;
  const status = search.get("status");
  const conversations = await (labsPrisma as any).$queryRaw`
    SELECT c.id, a."globalTenantId", c.channel, c.status, c."customerName", c."customerContact",
           c."lastMessageAt", c."messageCount", c."escalatedToHuman"
    FROM "Conversation" c
    JOIN "Assistant" a ON a.id = c."assistantId"
    WHERE a."tenantSlug" = ${tenantSlug}
      AND (${status} IS NULL OR c.status::text = ${status})
    ORDER BY c."lastMessageAt" DESC NULLS LAST
    LIMIT 100
  `;

  return NextResponse.json({ conversations });
}
