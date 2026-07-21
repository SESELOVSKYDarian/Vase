import { NextResponse } from "next/server";
import { encryptChannelSecret } from "../../../../lib/channel-secrets";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

const OPENAI_KEY_KIND = "OPENAI_API_KEY";

type AssistantOpenAiKeyRecord = {
  id: string;
  encryptedValue: string;
};

type AssistantOpenAiKeyRepository = {
  findOpenAiKey(assistantId: string): Promise<AssistantOpenAiKeyRecord | null>;
  upsertOpenAiKey(input: {
    assistantId: string;
    kind: typeof OPENAI_KEY_KIND;
    encryptedValue: string;
    rotatedAt: Date;
  }): Promise<{ id: string }>;
};

type AssistantOpenAiKeyDependencies = {
  env?: NodeJS.ProcessEnv;
  resolveContext(cookieHeader: string | null): Promise<{ assistant: { id: string } }>;
  repository: AssistantOpenAiKeyRepository;
};

const authenticationErrors = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);

function noStore(response: Response) {
  response.headers.set("cache-control", "no-store, private");
  return response;
}

function parseOpenAiKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const apiKey = value.trim();
  if (!apiKey.startsWith("sk-") || apiKey.length < 20) return null;
  return apiKey;
}

export function createAssistantOpenAiKeyHandlers(dependencies: AssistantOpenAiKeyDependencies) {
  return {
    async GET(request: Request) {
      try {
        const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
        const secret = await dependencies.repository.findOpenAiKey(resolved.assistant.id);
        return noStore(NextResponse.json({ configured: Boolean(secret) }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (authenticationErrors.has(message)) {
          return noStore(NextResponse.json({ error: message }, { status: 401 }));
        }
        return noStore(NextResponse.json({ error: "ASSISTANT_OPENAI_KEY_READ_FAILED" }, { status: 500 }));
      }
    },

    async POST(request: Request) {
      try {
        const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
        const body = await request.json().catch(() => null);
        const apiKey = parseOpenAiKey(body?.apiKey);

        if (!apiKey) {
          return noStore(NextResponse.json({ error: "OPENAI_API_KEY_INVALID" }, { status: 400 }));
        }

        const encryptionSecret = dependencies.env?.TOKEN_ENCRYPTION_SECRET?.trim();
        if (!encryptionSecret) {
          return noStore(NextResponse.json({ error: "TOKEN_ENCRYPTION_SECRET_MISSING" }, { status: 500 }));
        }

        await dependencies.repository.upsertOpenAiKey({
          assistantId: resolved.assistant.id,
          kind: OPENAI_KEY_KIND,
          encryptedValue: encryptChannelSecret(apiKey, encryptionSecret),
          rotatedAt: new Date(),
        });

        return noStore(NextResponse.json({ configured: true }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (authenticationErrors.has(message)) {
          return noStore(NextResponse.json({ error: message }, { status: 401 }));
        }
        return noStore(NextResponse.json({ error: "ASSISTANT_OPENAI_KEY_SAVE_FAILED" }, { status: 500 }));
      }
    },
  };
}

const handlers = createAssistantOpenAiKeyHandlers({
  env: process.env,
  resolveContext: resolveLabsRequestContext,
  repository: {
    findOpenAiKey(assistantId) {
      return (labsPrisma as any).assistantSecret.findUnique({
        where: { assistantId_kind: { assistantId, kind: OPENAI_KEY_KIND } },
        select: { id: true, encryptedValue: true },
      });
    },
    upsertOpenAiKey(input) {
      return (labsPrisma as any).assistantSecret.upsert({
        where: { assistantId_kind: { assistantId: input.assistantId, kind: input.kind } },
        create: input,
        update: {
          encryptedValue: input.encryptedValue,
          rotatedAt: input.rotatedAt,
        },
        select: { id: true },
      });
    },
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
