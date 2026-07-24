import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { createOfficialChannelSender } from "../../../../../../../lib/official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "../../../../../../../lib/official-channel-sender-repository";
import { resolveLabsRequestContext } from "../../../../../../../lib/request-context";

type InboxReplyConversation = {
  id: string;
  channel: LabsChannel | null;
  customerContact: string | null;
  externalUserId?: string | null;
  externalThreadKey?: string | null;
};

type InboxReplyHandlerDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    context: { tenantSlug: string; globalTenantId: string };
  }>;
  findConversation(input: {
    conversationId: string;
    globalTenantId: string;
  }): Promise<InboxReplyConversation | null>;
  sendReply(input: {
    globalTenantId: string;
    channelType: LabsChannel;
    recipientId: string;
    text: string;
  }): Promise<{ ok: boolean; providerMessageId?: string | null }>;
  persistReply(input: {
    conversationId: string;
    channel: LabsChannel;
    text: string;
    providerMessageId?: string | null;
    now?: Date;
  }): Promise<{ messageId: string; createdAt: Date }>;
};

type InboxReplyTransaction = {
  message: { create(input: unknown): Promise<{ id: string }> };
  messageDelivery: { create(input: unknown): Promise<unknown> };
  conversation: { update(input: unknown): Promise<unknown> };
};

export async function persistHumanInboxReply(
  prisma: { $transaction<T>(callback: (tx: InboxReplyTransaction) => Promise<T>): Promise<T> },
  input: {
    conversationId: string;
    channel: LabsChannel;
    text: string;
    providerMessageId?: string | null;
    now?: Date;
  },
): Promise<{ messageId: string; createdAt: Date }> {
  const messageId = randomUUID();
  const now = input.now ?? new Date();
  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        id: messageId,
        conversationId: input.conversationId,
        role: "human_agent",
        direction: "OUTBOUND",
        content: input.text,
        providerMessageId: input.providerMessageId ?? null,
        metadata: { source: "human_inbox" },
        createdAt: now,
      },
    });
    await tx.messageDelivery.create({
      data: {
        id: randomUUID(),
        messageId,
        channel: input.channel,
        status: "SENT",
        providerMessageId: input.providerMessageId ?? null,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.conversation.update({
      where: { id: input.conversationId },
      data: {
        status: "OPEN",
        escalatedToHuman: true,
        messageCount: { increment: 1 },
        lastMessageAt: now,
        lastOutboundAt: now,
        updatedAt: now,
      },
    });
  });
  return { messageId, createdAt: now };
}

export function createInboxReplyHandler(dependencies: InboxReplyHandlerDependencies) {
  return async function POST(
    request: Request,
    { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
  ) {
    try {
      const { tenantSlug, conversationId } = await params;
      const { context } = await dependencies.resolveContext(request.headers.get("cookie"));
      if (tenantSlug !== context.tenantSlug) {
        return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
      }

      const body = await request.json().catch(() => ({}));
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "TEXT_REQUIRED" }, { status: 400 });
      }

      const conversation = await dependencies.findConversation({
        conversationId,
        globalTenantId: context.globalTenantId,
      });
      const recipientId = conversation?.customerContact
        ?? conversation?.externalUserId
        ?? conversation?.externalThreadKey;
      if (!conversation?.channel || !recipientId) {
        return NextResponse.json({ error: "CONVERSATION_NOT_DELIVERABLE" }, { status: 404 });
      }

      const delivery = await dependencies.sendReply({
        globalTenantId: context.globalTenantId,
        channelType: conversation.channel,
        recipientId,
        text,
      });
      if (!delivery.ok) {
        throw new Error("CHANNEL_DELIVERY_FAILED");
      }

      const persisted = await dependencies.persistReply({
        conversationId,
        channel: conversation.channel,
        text,
        providerMessageId: delivery.providerMessageId,
      });

      return NextResponse.json({
        message: {
          id: persisted.messageId,
          role: "human_agent",
          content: text,
          direction: "OUTBOUND",
          providerMessageId: delivery.providerMessageId,
          createdAt: persisted.createdAt.toISOString(),
        },
        delivery: { status: "SENT" },
      });
    } catch (error) {
      const source = error as {
        code?: unknown;
        message?: unknown;
        providerStatus?: unknown;
        providerMessage?: unknown;
      } | null;
      const code = typeof source?.code === "string"
        ? source.code
        : typeof source?.message === "string"
          ? source.message
          : "CHANNEL_DELIVERY_FAILED";
      return NextResponse.json({
        error: code,
        ...(typeof source?.providerStatus === "number"
          ? { providerStatus: source.providerStatus }
          : {}),
        ...(typeof source?.providerMessage === "string"
          ? { providerMessage: source.providerMessage }
          : {}),
      }, { status: 502 });
    }
  };
}

export const POST = createInboxReplyHandler({
  resolveContext: resolveLabsRequestContext,
  async findConversation(input) {
    return await (labsPrisma as any).conversation.findFirst({
      where: {
        id: input.conversationId,
        assistant: { globalTenantId: input.globalTenantId },
      },
      select: {
        id: true,
        channel: true,
        customerContact: true,
        externalUserId: true,
        externalThreadKey: true,
      },
    });
  },
  sendReply(input) {
    const sender = createOfficialChannelSender({
      repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
      encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
      graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
    });
    return sender.send(input);
  },
  persistReply(input) {
    return persistHumanInboxReply(labsPrisma as any, input);
  },
});
