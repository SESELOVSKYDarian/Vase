import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { createOfficialChannelSender } from "../../../../../../../lib/official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "../../../../../../../lib/official-channel-sender-repository";
import { resolveLabsRequestContext } from "../../../../../../../lib/request-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  try {
    const { tenantSlug, conversationId } = await params;
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    if (tenantSlug !== context.tenantSlug) {
      return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
    }

    const conversation = await (labsPrisma as any).conversation.findFirst({
      where: {
        id: conversationId,
        assistant: { globalTenantId: context.globalTenantId },
      },
      select: {
        id: true,
        channel: true,
        customerContact: true,
      },
    }) as { id: string; channel: LabsChannel | null; customerContact: string | null } | null;
    if (!conversation?.channel || !conversation.customerContact) {
      return NextResponse.json({ error: "CONVERSATION_NOT_DELIVERABLE" }, { status: 404 });
    }

    const sender = createOfficialChannelSender({
      repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
      encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
      graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
    });
    const delivery = await sender.send({
      globalTenantId: context.globalTenantId,
      channelType: conversation.channel,
      recipientId: conversation.customerContact,
      text,
    });

    const messageId = randomUUID();
    const now = new Date();
    await labsPrisma.$transaction(async (tx) => {
      await (tx as any).message.create({
        data: {
          id: messageId,
          conversationId,
          role: "assistant",
          direction: "OUTBOUND",
          content: text,
          providerMessageId: delivery.providerMessageId,
          createdAt: now,
        },
      });
      await (tx as any).messageDelivery.create({
        data: {
          id: randomUUID(),
          messageId,
          channel: conversation.channel,
          status: "SENT",
          providerMessageId: delivery.providerMessageId,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    return NextResponse.json({
      message: {
        id: messageId,
        content: text,
        direction: "OUTBOUND",
        providerMessageId: delivery.providerMessageId,
      },
      delivery: { status: "SENT" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_DELIVERY_FAILED";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
