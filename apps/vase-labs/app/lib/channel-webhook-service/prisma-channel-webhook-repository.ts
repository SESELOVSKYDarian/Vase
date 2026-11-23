// Parte de channel-webhook-service.ts: PrismaChannelWebhookRepository.
import { type PrismaClient } from "../db";
import { buildTrainerProposalReply, confirmTrainerProposal, createTrainerProposal, rejectTrainerProposal, type TrainerProposal } from "../knowledge-trainer";
import { randomUUID } from "node:crypto";
import { type InboundChannelMessage, type LabsChannel } from "@vase/contracts";
import { getManualChannelId } from "../channel-manual-setup";
import { hasMetaChannelCredentials, isMetaAssetVerified, resolveChannelConnectionStatus } from "../channel-health";
import { createConversationAnalysisQueue } from "../conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../conversation-analysis-repository";
import { createOfficialChannelSender } from "../official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "../official-channel-sender-repository";
import { applyDocumentCorrection } from "../knowledge-document-version";
import { AssistantRow, ChannelRow, ChannelWebhookContext, ChannelWebhookRepository, ConversationRow, EntitlementRow, PersistChannelInboundMessageInput, PersistChannelInboundMessageResult, ProviderChannelRow, enumValue, messageContent, metadataJson, normalizeRecord } from "./channel-webhook-repository";
import { buildMessageMetadata, buildRuntimeEntitlement, mergeConversationMetadata } from "./detect-human-handoff-intent";
import { notifyVaseSupportHandoffInBackground } from "../vase-support-bridge";

export class PrismaChannelWebhookRepository implements ChannelWebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findTrainerPhone(globalTenantId: string, phone: string) {
    return this.prisma.trainerPhone.findFirst({ where: { globalTenantId, phone, active: true }, select: { id: true } });
  }

  async persistTrainerInstruction(input: { context: ChannelWebhookContext; trainerPhoneId: string; message: InboundChannelMessage; preparedProposal?: TrainerProposal }) {
    const latest = await this.prisma.knowledgeRevision.findFirst({ where: { globalTenantId: input.context.globalTenantId }, orderBy: { revision: "desc" }, select: { revision: true } });
    const currentRevision = latest?.revision ?? 0;
    const text = input.message.text ?? "";
    const pending = await this.prisma.knowledgeChangeProposal.findFirst({ where: { globalTenantId: input.context.globalTenantId, trainerPhoneId: input.trainerPhoneId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (pending) {
      if (rejectTrainerProposal(text)) {
        await this.prisma.knowledgeChangeProposal.update({ where: { id: pending.id }, data: { status: "REJECTED" } });
        return { proposalId: pending.id, replyText: "Propuesta descartada. No se modificó el conocimiento." };
      }
      try {
        confirmTrainerProposal({ status: pending.status, baseRevision: pending.baseRevision, expiresAt: pending.expiresAt }, text, currentRevision);
        const value = pending.proposedValue as { question?: string; answer?: string; content?: string; beforeText?: string; afterText?: string };
        const revision = currentRevision + 1;
        await this.prisma.$transaction(async (tx) => {
          if (pending.changeType === "FAQ_CREATE" && value.question && value.answer) {
            const item = await tx.knowledgeItem.create({ data: { assistantId: input.context.assistantId, title: value.question, sourceType: "FAQ", content: `Pregunta: ${value.question}\nRespuesta: ${value.answer}`, status: "READY" } });
            await tx.knowledgeRevision.create({ data: { globalTenantId: input.context.globalTenantId, proposalId: pending.id, knowledgeItemId: item.id, revision, afterValue: value } });
          } else if (pending.changeType === "FAQ_EDIT" && pending.targetKnowledgeId && value.question && value.answer) {
            const item = await tx.knowledgeItem.findFirst({ where: { id: pending.targetKnowledgeId, assistantId: input.context.assistantId, sourceType: "FAQ" } });
            if (!item) throw new Error("TRAINER_TARGET_NOT_FOUND");
            await tx.knowledgeItem.update({ where: { id: item.id }, data: { title: value.question, content: `Pregunta: ${value.question}\nRespuesta: ${value.answer}` } });
            await tx.knowledgeRevision.create({ data: { globalTenantId: input.context.globalTenantId, proposalId: pending.id, knowledgeItemId: item.id, revision, beforeValue: { question: item.title, content: item.content }, afterValue: value } });
          } else if (pending.changeType === "DOCUMENT_CORRECTION" && pending.targetKnowledgeId && value.content) {
            const correctionInput = { content: value.content, beforeText: value.beforeText, afterText: value.afterText };
            const item = await tx.knowledgeItem.findFirst({ where: { id: pending.targetKnowledgeId, assistantId: input.context.assistantId, sourceType: "FILE", status: "READY" } });
            if (!item) throw new Error("TRAINER_TARGET_NOT_FOUND");
            const activeCorrection = await tx.knowledgeCorrection.findFirst({ where: { knowledgeItemId: item.id, active: true }, orderBy: { updatedAt: "desc" } });
            const currentContent = activeCorrection?.content ?? item.extractedText ?? item.content;
            const nextContent = applyDocumentCorrection(currentContent, correctionInput);
            const knowledgeRevision = await tx.knowledgeRevision.create({ data: { globalTenantId: input.context.globalTenantId, proposalId: pending.id, knowledgeItemId: item.id, revision, beforeValue: { content: currentContent }, afterValue: { content: nextContent } } });
            await tx.knowledgeCorrection.updateMany({ where: { knowledgeItemId: item.id, active: true }, data: { active: false } });
            await tx.knowledgeCorrection.create({ data: { globalTenantId: input.context.globalTenantId, knowledgeItemId: item.id, revisionId: knowledgeRevision.id, content: nextContent } });
          } else {
            throw new Error("TRAINER_PROPOSAL_UNSUPPORTED");
          }
          await tx.knowledgeChangeProposal.update({ where: { id: pending.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
        });
        return { proposalId: pending.id, replyText: "Cambio aplicado y registrado en el historial del Entrenador." };
      } catch (error) {
        if (error instanceof Error && error.message === "TRAINER_CONFIRMATION_REQUIRED") return { proposalId: pending.id, replyText: "La propuesta sigue pendiente. Respondé CONFIRMAR para aplicarla o RECHAZAR para descartarla." };
        if (error instanceof Error && error.message === "TRAINER_PROPOSAL_STALE") await this.prisma.knowledgeChangeProposal.update({ where: { id: pending.id }, data: { status: "STALE" } });
      }
    }
    const proposal = input.preparedProposal ?? createTrainerProposal(text, currentRevision);
    const stored = await this.prisma.knowledgeChangeProposal.create({ data: {
      globalTenantId: input.context.globalTenantId,
      trainerPhoneId: input.trainerPhoneId,
      sourceMessageId: input.message.externalMessageId ?? null,
      sourceTranscript: text || null,
      targetKnowledgeId: proposal.targetKnowledgeId ?? null,
      changeType: proposal.changeType,
      proposedValue: proposal.proposedValue,
      baseRevision: proposal.baseRevision,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    } });
    return { proposalId: stored.id, replyText: buildTrainerProposalReply(proposal) };
  }

  async sendTrainerReply(input: { context: ChannelWebhookContext; trainerPhoneId: string; text: string }) {
    const phone = await this.prisma.trainerPhone.findFirst({ where: { id: input.trainerPhoneId, globalTenantId: input.context.globalTenantId, active: true }, select: { phone: true } });
    if (!phone) return;
    const sender = createOfficialChannelSender({ repository: new PrismaOfficialChannelSenderRepository(this.prisma), encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "", graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0" });
    await sender.send({ globalTenantId: input.context.globalTenantId, channelId: input.context.channel?.id, channelType: "WHATSAPP", recipientId: phone.phone, text: input.text });
  }

  async enqueueTrainerAudio(input: { context: ChannelWebhookContext; trainerPhoneId: string; message: InboundChannelMessage }) {
    if (!input.message.mediaId) throw new Error("TRAINER_AUDIO_MEDIA_MISSING");
    await this.prisma.trainerAudioJob.upsert({ where: { assistantId_providerMediaId: { assistantId: input.context.assistantId, providerMediaId: input.message.mediaId } }, create: {
      globalTenantId: input.context.globalTenantId, assistantId: input.context.assistantId, trainerPhoneId: input.trainerPhoneId,
      providerMediaId: input.message.mediaId, mimeType: input.message.mediaMimeType ?? null, sourceMessageId: input.message.externalMessageId ?? null,
    }, update: {} });
  }

  async findContextByTenantSlug(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null> {
    const assistants = await this.prisma.$queryRaw<AssistantRow[]>`
      SELECT id, globalTenantId, tenantSlug, model, systemPrompt
      FROM Assistant
      WHERE tenantSlug = ${tenantSlug}
      LIMIT 1
    `;
    const assistant = assistants[0];
    if (!assistant || !assistant.tenantSlug) return null;

    const channels = await this.prisma.$queryRaw<ChannelRow[]>`
      SELECT id, provider, status, config
      FROM Channel
      WHERE assistantId = ${assistant.id}
        AND type = ${enumValue(channelType)}
        AND (provider IS NULL OR provider = 'META_OFFICIAL')
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    const entitlements = await this.prisma.$queryRaw<EntitlementRow[]>`
      SELECT
        globalTenantId,
        plan,
        status,
        enabledChannels,
        tokenPack,
        tokensIncluded,
        tokensUsed,
        extraTokens,
        aiBudgetMicros,
        aiBudgetUsedMicros,
        extraAiBudgetMicros,
        currentPeriodStart,
        renewsAt
      FROM LabsEntitlement
      WHERE globalTenantId = ${assistant.globalTenantId}
      LIMIT 1
    `;

    const channel = channels[0];

    return {
      assistantId: assistant.id,
      assistantModel: assistant.model ?? null,
      assistantSystemPrompt: assistant.systemPrompt ?? null,
      globalTenantId: assistant.globalTenantId,
      tenantSlug: assistant.tenantSlug,
      channelType,
      channel: channel
        ? {
            id: channel.id,
            provider: channel.provider,
            status: channel.status,
            config: normalizeRecord(channel.config),
          }
        : null,
      entitlement: buildRuntimeEntitlement(entitlements[0]),
    };
  }

  async findContextByProviderAccountId(
    channelType: LabsChannel,
    providerAccountId: string,
  ): Promise<ChannelWebhookContext | null> {
    const rows = await this.prisma.$queryRaw<ProviderChannelRow[]>`
      SELECT
        c.id,
        c.provider,
        c.status,
        c.config,
        a.id AS assistantId,
        a.model,
        a.systemPrompt,
        a.globalTenantId,
        a.tenantSlug
      FROM Channel c
      JOIN Assistant a ON a.id = c.assistantId
      WHERE c.type = ${enumValue(channelType)}
        AND c.provider = 'META_OFFICIAL'
        AND (
          c.providerAccountId = ${providerAccountId}
          OR JSON_UNQUOTE(JSON_EXTRACT(c.config, '$.parentId')) = ${providerAccountId}
        )
      ORDER BY c.updatedAt DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row?.tenantSlug) return null;

    const entitlements = await this.prisma.$queryRaw<EntitlementRow[]>`
      SELECT
        globalTenantId, plan, status, enabledChannels, tokenPack,
        tokensIncluded, tokensUsed, extraTokens,
        aiBudgetMicros, aiBudgetUsedMicros, extraAiBudgetMicros,
        currentPeriodStart, renewsAt
      FROM LabsEntitlement
      WHERE globalTenantId = ${row.globalTenantId}
      LIMIT 1
    `;

    return {
      assistantId: row.assistantId,
      assistantModel: row.model ?? null,
      assistantSystemPrompt: row.systemPrompt ?? null,
      globalTenantId: row.globalTenantId,
      tenantSlug: row.tenantSlug,
      channelType,
      channel: {
        id: row.id,
        provider: row.provider,
        status: row.status,
        config: normalizeRecord(row.config),
      },
      entitlement: buildRuntimeEntitlement(entitlements[0]),
    };
  }

  async findManualSubscriptionContext(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null> {
    const context = await this.findContextByTenantSlug(tenantSlug, channelType);
    if (!context) return null;
    const manualId = getManualChannelId(context.assistantId, channelType);
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: manualId,
        assistantId: context.assistantId,
        type: channelType,
        provider: "META_OFFICIAL",
        status: { in: ["PENDING", "CONNECTED", "ERROR"] },
      },
    });
    if (!channel) return null;
    return {
      ...context,
      channel: {
        id: channel.id,
        provider: channel.provider,
        status: channel.status,
        config: normalizeRecord(channel.config),
      },
    };
  }

  async markWebhookVerified(context: ChannelWebhookContext): Promise<void> {
    if (!context.channel?.id) return;
    await this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.findFirst({
        where: { id: context.channel!.id, assistantId: context.assistantId, type: context.channelType },
        include: { secrets: { where: { kind: { in: ["META_ACCESS_TOKEN", "META_APP_SECRET"] } }, select: { kind: true } } },
      });
      if (!channel) return;
      const config = normalizeRecord(channel.config) ?? {};
      const now = new Date();
      const status = resolveChannelConnectionStatus({
        webhookVerified: true,
        credentialsPresent: hasMetaChannelCredentials({
          secretKinds: channel.secrets.map((item) => item.kind),
          config,
          fallbackAppId: process.env.META_APP_ID,
          fallbackAppSecret: process.env.META_APP_SECRET,
        }),
        assetVerified: isMetaAssetVerified({
          providerAccountId: channel.providerAccountId,
          config,
          lastError: channel.lastError,
        }),
        subscriptionActive: Array.isArray(config.subscribedFields) && config.subscribedFields.length > 0,
      });
      await tx.channel.update({
        where: { id: channel.id },
        data: { webhookVerifiedAt: now, status, connectedAt: status === "CONNECTED" ? now : null, lastSyncedAt: now, lastError: null },
      });
    });
  }

  async markWebhookAttempt(input: {
    context: ChannelWebhookContext;
    status: "RECEIVED" | "IGNORED" | "PROCESSED" | "FAILED";
    reason?: string | null;
  }): Promise<void> {
    if (!input.context.channel?.id) return;
    const reason = input.reason?.trim();
    const lastError = input.status === "PROCESSED" || input.status === "RECEIVED"
      ? null
      : [
          `webhook_${input.status.toLowerCase()}`,
          reason ? reason.slice(0, 180) : null,
        ].filter(Boolean).join(": ");
    await this.prisma.channel.updateMany({
      where: { id: input.context.channel.id, assistantId: input.context.assistantId },
      data: {
        lastSyncedAt: new Date(),
        lastError,
      },
    });
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    const now = new Date();
    const channelType = input.message.channelType;
    const existing = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata, escalatedToHuman, status
      FROM Conversation
      WHERE assistantId = ${input.context.assistantId}
        AND channel = ${enumValue(channelType)}
        AND externalThreadKey = ${input.message.externalThreadKey}
      LIMIT 1
    `;

    let conversation = existing[0];

    if (!conversation) {
      const conversationId = randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO Conversation (
          id,
          assistantId,
          channel,
          status,
          externalUserId,
          externalThreadKey,
          customerName,
          customerContact,
          metadata,
          messageCount,
          lastMessageAt,
          lastInboundAt,
          createdAt,
          updatedAt
        )
        VALUES (
          ${conversationId},
          ${input.context.assistantId},
          ${enumValue(channelType)},
          'OPEN',
          ${input.message.customerContact ?? null},
          ${input.message.externalThreadKey},
          ${input.message.customerName ?? null},
          ${input.message.customerContact ?? null},
          ${metadataJson(mergeConversationMetadata(null, input))},
          0,
          ${now},
          ${now},
          ${now},
          ${now}
        )
      `;
      conversation = {
        id: conversationId,
        metadata: mergeConversationMetadata(null, input),
        escalatedToHuman: false,
        status: "OPEN",
      };
    }

    const nextMetadata = mergeConversationMetadata(conversation.metadata, input);

    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson(nextMetadata)},
        customerName = COALESCE(${input.message.customerName ?? null}, customerName),
        customerContact = COALESCE(${input.message.customerContact ?? null}, customerContact),
        messageCount = messageCount + 1,
        lastMessageAt = ${now},
        lastInboundAt = ${now},
        updatedAt = ${now}
      WHERE id = ${conversation.id}
    `;

    const messageId = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO Message (
        id,
        conversationId,
        role,
        direction,
        content,
        providerMessageId,
        metadata,
        analysisPendingAt,
        createdAt
      )
      VALUES (
        ${messageId},
        ${conversation.id},
        'user',
        'INBOUND',
        ${messageContent(input.message)},
        ${input.message.externalMessageId ?? null},
        ${metadataJson(buildMessageMetadata(input))},
        ${now},
        ${now}
      )
    `;

    return {
      conversationId: conversation.id,
      messageId,
      messageCreatedAt: now,
      aiBlockedReason: input.aiBlockedReason,
      handoffActive: Boolean(conversation.escalatedToHuman) || conversation.status === "ESCALATED",
    };
  }

  async enqueueConversationAnalysis(input: {
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
  }): Promise<void> {
    const queue = createConversationAnalysisQueue({
      repository: new PrismaConversationAnalysisRepository(this.prisma),
      clock: () => new Date(),
      tokenFactory: randomUUID,
      maxAttempts: 3,
      leaseDurationMs: 60_000,
    });
    await queue.enqueue({
      conversationId: input.conversationId,
      requestedThroughMessageId: input.messageId,
      requestedThroughMessageCreatedAt: input.messageCreatedAt,
    });
  }

  async enqueueAudioTranscription(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    providerMediaId: string;
    mimeType: string | null;
  }): Promise<void> {
    await this.prisma.audioTranscriptionJob.upsert({
      where: {
        assistantId_providerMediaId: {
          assistantId: input.context.assistantId,
          providerMediaId: input.providerMediaId,
        },
      },
      create: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        globalTenantId: input.context.globalTenantId,
        assistantId: input.context.assistantId,
        channel: input.context.channelType,
        providerMediaId: input.providerMediaId,
        mimeType: input.mimeType,
      },
      update: {},
    });
  }

  async markConversationAnalysisEnqueueFailed(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED";
  }): Promise<void> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM Conversation
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
      LIMIT 1
    `;
    const conversation = rows[0];
    if (!conversation) return;
    const metadata = normalizeRecord(conversation.metadata) ?? {};
    const context = normalizeRecord(metadata.context) ?? {};
    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson({
          ...metadata,
          context: {
            ...context,
            conversationAnalysisEnqueueError: input.reason,
            conversationAnalysisEnqueueFailedMessageId: input.messageId,
          },
        })},
        updatedAt = ${new Date()}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;
  }

  async markConversationAnalysisEnqueued(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
  }): Promise<void> {
    await new PrismaConversationAnalysisRepository(this.prisma)
      .clearFailedEnqueueMarker({
        conversationId: input.conversationId,
        assistantId: input.context.assistantId,
        messageId: input.messageId,
      });
  }

  async markWebhookEventProcessing(input: {
    context: ChannelWebhookContext;
    providerEventId?: string | null;
    providerMessageId?: string | null;
    rawPayload?: unknown;
  }): Promise<{ duplicate: boolean }> {
    if (!input.context.channel?.id || !input.providerMessageId) {
      return { duplicate: false };
    }

    try {
      await this.prisma.$executeRaw`
        INSERT INTO WebhookEvent (
          id,
          channelId,
          providerEventId,
          providerMessageId,
          status,
          metadata,
          createdAt,
          updatedAt
        )
        VALUES (
          ${randomUUID()},
          ${input.context.channel.id},
          ${input.providerEventId ?? null},
          ${input.providerMessageId},
          'PROCESSING',
          ${metadataJson({ rawPayload: input.rawPayload ?? null })},
          ${new Date()},
          ${new Date()}
        )
      `;
      return { duplicate: false };
    } catch {
      return { duplicate: true };
    }
  }

  async markWebhookEventProcessed(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    conversationId: string;
    messageId: string;
  }): Promise<void> {
    if (!input.context.channel?.id || !input.providerMessageId) return;

    await this.prisma.$executeRaw`
      UPDATE WebhookEvent
      SET
        status = 'PROCESSED',
        processedAt = ${new Date()},
        metadata = ${metadataJson({ conversationId: input.conversationId, messageId: input.messageId })},
        updatedAt = ${new Date()}
      WHERE channelId = ${input.context.channel.id}
        AND providerMessageId = ${input.providerMessageId}
    `;
  }

  async markWebhookEventFailed(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    reason: string;
  }): Promise<void> {
    if (!input.context.channel?.id || !input.providerMessageId) return;

    await this.prisma.$executeRaw`
      UPDATE WebhookEvent
      SET
        status = 'FAILED',
        failedAt = ${new Date()},
        metadata = ${metadataJson({ reason: input.reason })},
        updatedAt = ${new Date()}
      WHERE channelId = ${input.context.channel.id}
        AND providerMessageId = ${input.providerMessageId}
    `;
  }

  async markAiReplyFailed(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
  }): Promise<void> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM Conversation
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
      LIMIT 1
    `;
    const conversation = rows[0];
    if (!conversation) return;

    const current = normalizeRecord(conversation.metadata) ?? {};
    const context = normalizeRecord(current.context) ?? {};
    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson({
          ...current,
          state: "AI_FAILED",
          context: {
            ...context,
            aiReplyError: input.reason,
            aiReplyFailedAt: new Date().toISOString(),
            aiReplyFailedMessageId: input.messageId,
          },
        })},
        updatedAt = ${new Date()}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;
  }

  async requestHumanHandoff(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
    source: "customer_intent" | "manual";
  }): Promise<void> {
    const now = new Date();
    const activeHandoffs = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT h.id
      FROM Handoff h
      JOIN Conversation c ON c.id = h.conversationId
      WHERE h.conversationId = ${input.conversationId}
        AND c.assistantId = ${input.context.assistantId}
        AND h.status IN ('PENDING', 'ASSIGNED')
      LIMIT 1
    `;

    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        status = 'ESCALATED',
        escalatedToHuman = true,
        updatedAt = ${now}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;

    notifyVaseSupportHandoffInBackground(this.prisma as never, { conversationId: input.conversationId, reason: input.reason });
    if (activeHandoffs[0]) return;

    await this.prisma.$executeRaw`
      INSERT INTO Handoff (
        id,
        conversationId,
        reason,
        target,
        status,
        priority,
        notes,
        createdAt
      )
      VALUES (
        ${randomUUID()},
        ${input.conversationId},
        ${input.reason},
        'labs',
        'PENDING',
        'high',
        ${JSON.stringify({ source: input.source, messageId: input.messageId })},
        ${now}
      )
    `;
  }
}
