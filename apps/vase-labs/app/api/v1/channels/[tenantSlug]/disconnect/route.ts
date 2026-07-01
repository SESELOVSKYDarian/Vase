import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const body = await request.json().catch(() => ({}));
  const channelType = labsChannelSchema.parse(body.channelType);
  const result = await (labsPrisma as any).$executeRaw`
    UPDATE "Channel"
    SET status = 'DISCONNECTED', "updatedAt" = ${new Date()}
    WHERE type = CAST(${channelType} AS "LabsChannel")
      AND "assistantId" IN (SELECT id FROM "Assistant" WHERE "tenantSlug" = ${tenantSlug})
  `;

  return NextResponse.json({ ok: true, updated: Number(result) });
}
