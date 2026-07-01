import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const channels = await (labsPrisma as any).$queryRaw`
    SELECT ch.type, ch.status, COUNT(c.id)::int AS conversations
    FROM "Channel" ch
    JOIN "Assistant" a ON a.id = ch."assistantId"
    LEFT JOIN "Conversation" c ON c."assistantId" = a.id AND c.channel = ch.type
    WHERE a."tenantSlug" = ${tenantSlug}
    GROUP BY ch.type, ch.status
  `;

  return NextResponse.json({ channels });
}
