import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";
import { requireTenantAccess } from "../../../../../lib/tenant-route-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(request, tenantSlug);
  if (!access.ok) return access.response;
  const assistant = await (labsPrisma as any).assistant.findUnique({
    where: { tenantSlug },
    include: {
      channels: { select: { type: true, status: true } },
      conversations: { select: { channel: true } },
    },
  });
  const channels = (assistant?.channels ?? []).map((channel: any) => ({
    ...channel,
    conversations: (assistant?.conversations ?? []).filter(
      (conversation: any) => conversation.channel === channel.type,
    ).length,
  }));

  return NextResponse.json({ channels });
}
