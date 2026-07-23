import { NextResponse } from "next/server";
import { decryptChannelSecret } from "../../../../lib/channel-secrets";
import { labsCatalogService } from "../../../../lib/catalog-repository";
import { labsPrisma } from "../../../../lib/db";
import { createKnowledgeService, type KnowledgeRecord } from "../../../../lib/knowledge-service";
import { createOpenAiReplyGenerator } from "../../../../lib/openai-reply-generator";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

type TestHandlerDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    assistant: {
      id: string;
      globalTenantId: string;
      model: string;
      systemPrompt?: string | null;
    };
  }>;
  resolveApiKey(assistantId: string): Promise<string | null>;
  buildContext(assistantId: string): Promise<string>;
  buildCatalogResources(globalTenantId: string): Promise<{
    context: string;
    allowedImageUrls: string[];
  }>;
  createReplyGenerator(input: { apiKey: string; model: string }): {
    generateReply(input: {
      userText: string;
      context: string;
      systemPrompt?: string | null;
      allowedImageUrls: string[];
    }): Promise<{
      text: string;
      imageUrls: string[];
      inputTokens: number;
      outputTokens: number;
      model?: string;
    }>;
  };
};

const authenticationErrors = new Set(["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"]);

export function createAssistantTestHandler(dependencies: TestHandlerDependencies) {
  return async function POST(request: Request) {
    try {
      const body = await request.json().catch(() => null);
      const message = typeof body?.message === "string" ? body.message.trim() : "";
      if (!message || message.length > 2000) {
        return NextResponse.json({ error: "ASSISTANT_TEST_MESSAGE_INVALID" }, { status: 400 });
      }

      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const apiKey = await dependencies.resolveApiKey(resolved.assistant.id);
      if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY_MISSING" }, { status: 409 });
      }

      const [knowledgeContext, catalogResources] = await Promise.all([
        dependencies.buildContext(resolved.assistant.id),
        dependencies.buildCatalogResources(resolved.assistant.globalTenantId),
      ]);
      const context = [knowledgeContext, catalogResources.context].filter(Boolean).join("\n\n");
      const reply = await dependencies
        .createReplyGenerator({ apiKey, model: resolved.assistant.model })
        .generateReply({
          userText: message,
          context,
          systemPrompt: resolved.assistant.systemPrompt,
          allowedImageUrls: catalogResources.allowedImageUrls,
        });

      return NextResponse.json({
        reply: reply.text,
        imageUrls: reply.imageUrls,
        model: reply.model ?? resolved.assistant.model,
        usage: { inputTokens: reply.inputTokens, outputTokens: reply.outputTokens },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (authenticationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      if (message === "TOKEN_ENCRYPTION_SECRET_MISSING") {
        return NextResponse.json({ error: message }, { status: 500 });
      }
      return NextResponse.json({ error: "ASSISTANT_TEST_FAILED" }, { status: 502 });
    }
  };
}

const knowledge = createKnowledgeService({
  async listReadyKnowledge(assistantId): Promise<KnowledgeRecord[]> {
    const items = await labsPrisma.knowledgeItem.findMany({
      where: { assistantId, status: "READY" },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });
    return items.map((item) => ({ ...item, status: "READY" }));
  },
});

export const POST = createAssistantTestHandler({
  resolveContext: resolveLabsRequestContext,
  async resolveApiKey(assistantId) {
    const secret = await labsPrisma.assistantSecret.findUnique({
      where: { assistantId_kind: { assistantId, kind: "OPENAI_API_KEY" } },
      select: { encryptedValue: true },
    });
    if (!secret?.encryptedValue) return null;
    const encryptionSecret = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    return decryptChannelSecret(secret.encryptedValue, encryptionSecret);
  },
  buildContext: knowledge.buildContext,
  buildCatalogResources: labsCatalogService.buildAiResources,
  createReplyGenerator({ apiKey, model }) {
    return createOpenAiReplyGenerator({ apiKey, model });
  },
});
