import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const search = new URL(request.url).searchParams;
  const status = search.get("status");
  const assistant = await (labsPrisma as any).assistant.findUnique({
    where: { tenantSlug },
    select: { id: true, globalTenantId: true },
  });
  const rows = assistant
    ? await (labsPrisma as any).conversation.findMany({
        where: {
          assistantId: assistant.id,
          ...(status ? { status } : {}),
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 100,
        select: {
          id: true,
          channel: true,
          status: true,
          customerName: true,
          customerContact: true,
          lastMessageAt: true,
          messageCount: true,
          escalatedToHuman: true,
        },
      })
    : [];
  const conversations = rows.map((conversation: any) => ({
    ...conversation,
    globalTenantId: assistant?.globalTenantId ?? "",
  }));

  return NextResponse.json({ conversations });
}
