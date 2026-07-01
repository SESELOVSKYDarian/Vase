import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { labsPrisma } from "../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const body = await request.json().catch(() => ({}));
  const channelType = labsChannelSchema.parse(body.channelType);
  const assistants = await (labsPrisma as any).$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Assistant" WHERE "tenantSlug" = ${tenantSlug} LIMIT 1
  `;
  const assistant = assistants[0];

  if (!assistant) {
    return NextResponse.json({ error: "ASSISTANT_NOT_FOUND" }, { status: 404 });
  }

  const channelId = randomUUID();
  const channels = await (labsPrisma as any).$queryRaw`
    INSERT INTO "Channel" (
      id, "assistantId", type, provider, status, "accountLabel", "externalId", "externalHandle", config, "connectedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${channelId},
      ${assistant.id},
      CAST(${channelType} AS "LabsChannel"),
      'META_OFFICIAL',
      'CONNECTED',
      ${typeof body.accountLabel === "string" ? body.accountLabel : null},
      ${typeof body.externalId === "string" ? body.externalId : null},
      ${typeof body.externalHandle === "string" ? body.externalHandle : null},
      CAST(${JSON.stringify(body.config ?? {})} AS jsonb),
      ${new Date()},
      ${new Date()},
      ${new Date()}
    )
    RETURNING id, type, provider, status, "accountLabel", "externalHandle", "connectedAt"
  `;

  return NextResponse.json({ channel: channels[0] });
}
