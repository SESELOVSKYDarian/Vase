import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const assistants = await (labsPrisma as any).$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Assistant" WHERE "tenantSlug" = ${tenantSlug} LIMIT 1
  `;
  const assistant = assistants[0];

  if (!assistant) {
    return NextResponse.json({ channels: [] });
  }

  const channels = await (labsPrisma as any).$queryRaw`
    SELECT id, type, provider, status, "accountLabel", "externalHandle", "connectedAt", "lastSyncedAt", "lastError"
    FROM "Channel"
    WHERE "assistantId" = ${assistant.id}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ channels });
}
