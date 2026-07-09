import { NextResponse } from "next/server";
import { summarizeLabsAnalytics } from "../../../../../lib/analytics-service";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const assistant = await (labsPrisma as any).assistant.findUnique({
    where: { tenantSlug },
    include: {
      channels: { select: { type: true, status: true } },
      conversations: {
        select: {
          status: true,
          escalatedToHuman: true,
          channel: true,
          messages: { select: { direction: true } },
          handoffs: { select: { status: true } },
        },
      },
    },
  });

  const conversations = assistant?.conversations ?? [];
  const messages = conversations.flatMap((conversation: any) =>
    conversation.messages.map((message: any) => ({
      ...message,
      channel: conversation.channel,
    })),
  );
  const tokenUsages = assistant
    ? await (labsPrisma as any).tokenUsage.findMany({
        where: { globalTenantId: assistant.globalTenantId },
        select: { totalTokens: true, costCents: true },
      })
    : [];
  const handoffs = conversations.flatMap((conversation: any) => conversation.handoffs);

  return NextResponse.json({
    summary: summarizeLabsAnalytics({
      conversations,
      messages,
      tokenUsages,
      channels: assistant?.channels ?? [],
      handoffs,
    }),
  });
}
