import { createAudioTranscriptionClient } from "../app/lib/audio-transcription-client";
import { resolveAssistantOpenAiApiKey, PrismaAssistantOpenAiKeyRepository } from "../app/lib/assistant-openai-key";
import { decryptChannelSecret } from "../app/lib/channel-secrets";
import { labsPrisma } from "../app/lib/db";
import { PrismaChannelWebhookRepository } from "../app/lib/channel-webhook-service";
import { PrismaOfficialChannelSenderRepository } from "../app/lib/official-channel-sender-repository";
import { downloadWhatsAppMedia } from "../app/lib/whatsapp-media";
import { createTrainerInstructionInterpreter } from "../app/lib/trainer-instruction-interpreter";

async function processNext() {
  const job = await labsPrisma.trainerAudioJob.findFirst({ where: { status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: 5 } }, orderBy: { createdAt: "asc" } });
  if (!job) return false;
  await labsPrisma.trainerAudioJob.update({ where: { id: job.id }, data: { status: "PROCESSING", attempts: { increment: 1 }, error: null } });
  try {
    const secret = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!secret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    const delivery = await new PrismaOfficialChannelSenderRepository(labsPrisma).findDeliveryContext({ globalTenantId: job.globalTenantId, channelType: "WHATSAPP" });
    if (!delivery) throw new Error("OFFICIAL_CHANNEL_NOT_CONNECTED");
    const buffer = await downloadWhatsAppMedia(job.providerMediaId, decryptChannelSecret(delivery.encryptedAccessToken, secret), process.env.META_GRAPH_VERSION?.trim() || "v25.0");
    const apiKey = await resolveAssistantOpenAiApiKey({ assistantId: job.assistantId, encryptionSecret: secret, repository: new PrismaAssistantOpenAiKeyRepository(labsPrisma) });
    const transcript = (await createAudioTranscriptionClient({ apiKey, model: process.env.AI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-mini-transcribe" }).transcribe(buffer, job.mimeType || "audio/ogg")).text.trim();
    if (!transcript) throw new Error("TRAINER_AUDIO_EMPTY");
    await labsPrisma.trainerAudioJob.update({ where: { id: job.id }, data: { transcript } });
    const assistant = await labsPrisma.assistant.findUnique({ where: { id: job.assistantId }, select: { globalTenantId: true, tenantSlug: true, model: true, systemPrompt: true } });
    if (!assistant?.tenantSlug) throw new Error("TRAINER_AUDIO_ASSISTANT_NOT_FOUND");
    const latestRevision = await labsPrisma.knowledgeRevision.findFirst({ where: { globalTenantId: job.globalTenantId }, orderBy: { revision: "desc" }, select: { revision: true } });
    const knowledge = await labsPrisma.knowledgeItem.findMany({ where: { assistantId: job.assistantId, status: "READY" }, select: { id: true, title: true, sourceType: true, content: true }, take: 50 });
    const preparedProposal = await createTrainerInstructionInterpreter({ apiKey, model: process.env.OPENAI_TRAINER_MODEL?.trim() || assistant.model || undefined }).interpret({
      instruction: transcript,
      baseRevision: latestRevision?.revision ?? 0,
      knowledge,
    });
    const repository = new PrismaChannelWebhookRepository(labsPrisma);
    const context = await repository.findContextByTenantSlug(assistant.tenantSlug, "WHATSAPP");
    if (!context) throw new Error("TRAINER_AUDIO_CHANNEL_NOT_FOUND");
    const proposal = await repository.persistTrainerInstruction({ context, trainerPhoneId: job.trainerPhoneId, preparedProposal, message: { globalTenantId: job.globalTenantId, channelType: "WHATSAPP", externalThreadKey: job.trainerPhoneId, externalMessageId: job.sourceMessageId ?? undefined, customerContact: "", text: transcript, messageType: "audio", provider: "META_OFFICIAL" } });
    await repository.sendTrainerReply({ context, trainerPhoneId: job.trainerPhoneId, text: proposal.replyText });
    await labsPrisma.trainerAudioJob.update({ where: { id: job.id }, data: { status: "COMPLETED", transcript } });
  } catch (error) {
    await labsPrisma.trainerAudioJob.update({ where: { id: job.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "TRAINER_AUDIO_FAILED" } });
  }
  return true;
}

async function main() {
  while (true) {
    if (!await processNext()) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
void main().finally(() => labsPrisma.$disconnect());
