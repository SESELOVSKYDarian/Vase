import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import type { PrismaClient } from "./db";
import type { AudioJob } from "./audio-transcription-worker";

export type ClaimedAudioTranscriptionJob = AudioJob & {
  conversationId: string;
  messageId: string;
  globalTenantId: string;
  assistantId: string;
  channel: LabsChannel;
};

export type AudioContinuationContext = ClaimedAudioTranscriptionJob & {
  tenantSlug: string;
  externalThreadKey: string;
  externalMessageId: string | null;
  customerName: string | null;
  customerContact: string | null;
  messageCreatedAt: Date;
};

export class PrismaAudioTranscriptionQueue {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: {
      maxAttempts?: number;
      leaseDurationMs?: number;
      clock?: () => Date;
    } = {},
  ) {}

  async claimNext(): Promise<ClaimedAudioTranscriptionJob | null> {
    const now = this.options.clock?.() ?? new Date();
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(
      now.getTime() + (this.options.leaseDurationMs ?? 120_000),
    );
    const maxAttempts = this.options.maxAttempts ?? 3;

    return this.prisma.$transaction(async (transaction) => {
      const candidate = await transaction.audioTranscriptionJob.findFirst({
        where: {
          attempts: { lt: maxAttempts },
          OR: [
            { status: "QUEUED" },
            { status: "PROCESSING", leaseExpiresAt: { lt: now } },
          ],
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      if (!candidate) return null;

      const claimed = await transaction.audioTranscriptionJob.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
          leaseToken: candidate.leaseToken,
        },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          leaseToken,
          leaseExpiresAt,
          lastError: null,
        },
      });
      if (claimed.count !== 1 || !candidate.messageId) return null;

      return {
        id: candidate.id,
        conversationId: candidate.conversationId,
        messageId: candidate.messageId,
        globalTenantId: candidate.globalTenantId,
        assistantId: candidate.assistantId,
        channel: candidate.channel,
        providerMediaId: candidate.providerMediaId,
        mimeType: candidate.mimeType,
      };
    });
  }

  async storeTranscript(jobId: string, transcript: string): Promise<void> {
    const job = await this.prisma.audioTranscriptionJob.findUnique({
      where: { id: jobId },
      select: { messageId: true, status: true },
    });
    if (!job?.messageId || job.status !== "PROCESSING") {
      throw new Error("AUDIO_TRANSCRIPTION_JOB_NOT_ACTIVE");
    }

    await this.prisma.message.update({
      where: { id: job.messageId },
      data: {
        content: transcript,
        analysisPendingAt: new Date(),
      },
    });
  }

  async complete(jobId: string, transcript: string): Promise<void> {
    const completed = await this.prisma.audioTranscriptionJob.updateMany({
      where: { id: jobId, status: "PROCESSING" },
      data: {
        status: "COMPLETED",
        transcript,
        completedAt: new Date(),
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: null,
      },
    });
    if (completed.count !== 1) {
      throw new Error("AUDIO_TRANSCRIPTION_LEASE_LOST");
    }
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = await this.prisma.audioTranscriptionJob.findUnique({
      where: { id: jobId },
      select: { attempts: true, status: true },
    });
    if (!job || job.status !== "PROCESSING") return;

    await this.prisma.audioTranscriptionJob.updateMany({
      where: { id: jobId, status: "PROCESSING" },
      data: {
        status: job.attempts >= (this.options.maxAttempts ?? 3) ? "FAILED" : "QUEUED",
        lastError: error.slice(0, 2_000),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  }

  async loadContinuation(jobId: string): Promise<AudioContinuationContext> {
    const job = await this.prisma.audioTranscriptionJob.findUnique({
      where: { id: jobId },
      include: {
        conversation: {
          include: {
            assistant: {
              select: { tenantSlug: true },
            },
          },
        },
      },
    });
    if (!job?.messageId || !job.conversation.assistant.tenantSlug) {
      throw new Error("AUDIO_CONVERSATION_CONTEXT_NOT_FOUND");
    }
    const message = await this.prisma.message.findUnique({
      where: { id: job.messageId },
      select: { providerMessageId: true, createdAt: true },
    });
    if (!message) throw new Error("AUDIO_MESSAGE_NOT_FOUND");

    return {
      id: job.id,
      conversationId: job.conversationId,
      messageId: job.messageId,
      globalTenantId: job.globalTenantId,
      assistantId: job.assistantId,
      channel: job.channel,
      providerMediaId: job.providerMediaId,
      mimeType: job.mimeType,
      tenantSlug: job.conversation.assistant.tenantSlug,
      externalThreadKey: job.conversation.externalThreadKey ?? "",
      externalMessageId: message.providerMessageId,
      customerName: job.conversation.customerName,
      customerContact: job.conversation.customerContact,
      messageCreatedAt: message.createdAt,
    };
  }
}
