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

    const conversations = await labsPrisma.$queryRaw<Array<{
      id: string;
      channel: LabsChannel | null;
      customerContact: string | null;
    }>>`
      SELECT c.id, c.channel, c."customerContact"
      FROM "Conversation" c
      JOIN "Assistant" a ON a.id = c."assistantId"
      WHERE a."globalTenantId" = ${context.globalTenantId}
        AND c.id = ${conversationId}
      LIMIT 1
    `;
    const conversation = conversations[0];
    if (!conversation?.channel || !conversation.customerContact) {
      return NextResponse.json({ error: "CONVERSATION_NOT_DELIVERABLE" }, { status: 404 });
    }

    const sender = createOfficialChannelSender({
      repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
      encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
      graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v24.0",
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
      await tx.$executeRaw`
        INSERT INTO "Message" (
          id, "conversationId", role, direction, content,
          "providerMessageId", "createdAt"
        )
        VALUES (
          ${messageId}, ${conversationId}, 'assistant', 'OUTBOUND', ${text},
          ${delivery.providerMessageId}, ${now}
        )
      `;
      await tx.$executeRaw`
        INSERT INTO "MessageDelivery" (
          id, "messageId", channel, status, "providerMessageId",
          "sentAt", "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${messageId}, CAST(${conversation.channel} AS "LabsChannel"),
          'SENT', ${delivery.providerMessageId}, ${now}, ${now}, ${now}
        )
      `;
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
