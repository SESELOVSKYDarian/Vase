import type { LabsChannel } from "@vase/contracts";
import type { AiReplyResult } from "./openai-reply-generator";
import type { createKnowledgeService } from "./knowledge-service";

interface AiOrchestratorDeps {
  knowledge: ReturnType<typeof createKnowledgeService>;
  catalog?: { buildAiContext(globalTenantId: string): Promise<string> };
  generateReply(input: { userText: string; context: string }): Promise<AiReplyResult>;
  persistAssistantReply(input: { conversationId: string; channel: LabsChannel; text: string }): Promise<{ messageId: string }>;
  registerTokenUsage(input: { globalTenantId: string; channel: LabsChannel; inputTokens: number; outputTokens: number; messageId: string; conversationId: string; assistantId: string; source?: string }): Promise<{ totalTokens: number }>;
  sendReply(input: { channel: LabsChannel; text: string; conversationId: string }): Promise<{ ok: boolean; providerMessageId?: string | null }>;
  markAssistantReplyDelivery?(input: {
    messageId: string;
    status: "SENT" | "FAILED";
    providerMessageId?: string | null;
    error?: string | null;
  }): Promise<void>;
}

export function createAiOrchestrator(deps: AiOrchestratorDeps) {
  return {
    async processConversation(input: {
      assistantId: string;
      conversationId: string;
      globalTenantId: string;
      channel: LabsChannel;
      latestUserText: string;
      canRunAi: boolean;
      handoffActive: boolean;
    }) {
      if (!input.canRunAi) return { ok: false, reason: "AI_NOT_ALLOWED" };
      if (input.handoffActive) return { ok: false, reason: "HANDOFF_ACTIVE" };

      const [knowledgeContext, catalogContext] = await Promise.all([
        deps.knowledge.buildContext(input.assistantId),
        deps.catalog?.buildAiContext(input.globalTenantId) ?? Promise.resolve(""),
      ]);
      const context = [knowledgeContext, catalogContext].filter(Boolean).join("\n\n");
      const reply = await deps.generateReply({ userText: input.latestUserText, context });
      const message = await deps.persistAssistantReply({
        conversationId: input.conversationId,
        channel: input.channel,
        text: reply.text,
      });
      const usage = await deps.registerTokenUsage({
        globalTenantId: input.globalTenantId,
        channel: input.channel,
        inputTokens: reply.inputTokens,
        outputTokens: reply.outputTokens,
        messageId: message.messageId,
        conversationId: input.conversationId,
        assistantId: input.assistantId,
        source: buildTokenUsageSource(reply),
      });
      try {
        const delivery = await deps.sendReply({ channel: input.channel, text: reply.text, conversationId: input.conversationId });
        if (!delivery.ok) throw new Error("CHANNEL_DELIVERY_FAILED");
        await deps.markAssistantReplyDelivery?.({
          messageId: message.messageId,
          status: "SENT",
          providerMessageId: delivery.providerMessageId,
        });
      } catch (error) {
        await deps.markAssistantReplyDelivery?.({
          messageId: message.messageId,
          status: "FAILED",
          error: error instanceof Error ? error.message : "CHANNEL_DELIVERY_FAILED",
        });
        throw error;
      }

      return { ok: true, messageId: message.messageId, totalTokens: usage.totalTokens };
    },
  };
}

function buildTokenUsageSource(reply: AiReplyResult): string | undefined {
  if (!reply.provider && !reply.model) return undefined;
  return [reply.provider ?? "assistant", reply.model, reply.profile].filter(Boolean).join(":");
}
