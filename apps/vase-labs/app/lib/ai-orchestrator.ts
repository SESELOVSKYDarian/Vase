import type { LabsChannel } from "@vase/contracts";
import type { createKnowledgeService } from "./knowledge-service";

interface AiOrchestratorDeps {
  knowledge: ReturnType<typeof createKnowledgeService>;
  generateReply(input: { userText: string; context: string }): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
  persistAssistantReply(input: { conversationId: string; channel: LabsChannel; text: string }): Promise<{ messageId: string }>;
  registerTokenUsage(input: { globalTenantId: string; channel: LabsChannel; inputTokens: number; outputTokens: number; messageId: string; conversationId: string; assistantId: string }): Promise<{ totalTokens: number }>;
  sendReply(input: { channel: LabsChannel; text: string; conversationId: string }): Promise<{ ok: boolean; providerMessageId?: string | null }>;
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

      const context = await deps.knowledge.buildContext(input.assistantId);
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
      });
      await deps.sendReply({ channel: input.channel, text: reply.text, conversationId: input.conversationId });

      return { ok: true, messageId: message.messageId, totalTokens: usage.totalTokens };
    },
  };
}
