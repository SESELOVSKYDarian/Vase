import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";
import { createAssistantOpenAiKeyHandlers } from "../apps/vase-labs/app/api/labs/assistant/openai-key/route";

function request(method: string, body?: unknown) {
  return new Request("https://labs.vase.ar/api/labs/assistant/openai-key", {
    method,
    headers: { cookie: "labs_session=ok", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("assistant OpenAI key settings", () => {
  it("stores the OpenAI key encrypted for the resolved assistant only", async () => {
    const writes: unknown[] = [];
    const handlers = createAssistantOpenAiKeyHandlers({
      env: { TOKEN_ENCRYPTION_SECRET: "secret-for-tests" } as NodeJS.ProcessEnv,
      async resolveContext() {
        return { assistant: { id: "assistant_trusted" } };
      },
      repository: {
        async findOpenAiKey() {
          return null;
        },
        async upsertOpenAiKey(input) {
          writes.push(input);
          return { id: "secret_123" };
        },
      },
    });

    const response = await handlers.POST(request("POST", {
      assistantId: "assistant_from_body",
      apiKey: "  sk-proj-valid-openai-key-for-client  ",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ configured: true });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ assistantId: "assistant_trusted", kind: "OPENAI_API_KEY" });
    expect((writes[0] as { encryptedValue: string }).encryptedValue).not.toContain("sk-proj-valid");
    expect(decryptChannelSecret((writes[0] as { encryptedValue: string }).encryptedValue, "secret-for-tests")).toBe(
      "sk-proj-valid-openai-key-for-client",
    );
  });

  it("reports only whether a key is configured", async () => {
    const handlers = createAssistantOpenAiKeyHandlers({
      async resolveContext() {
        return { assistant: { id: "assistant_123" } };
      },
      repository: {
        async findOpenAiKey(assistantId) {
          expect(assistantId).toBe("assistant_123");
          return { id: "secret_123", encryptedValue: "encrypted-secret" };
        },
        async upsertOpenAiKey() {
          throw new Error("unexpected write");
        },
      },
    });

    const response = await handlers.GET(request("GET"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({ configured: true });
  });

  it("rejects invalid keys and missing internal encryption", async () => {
    const base = {
      async resolveContext() {
        return { assistant: { id: "assistant_123" } };
      },
      repository: {
        async findOpenAiKey() {
          return null;
        },
        async upsertOpenAiKey() {
          throw new Error("unexpected write");
        },
      },
    };

    const invalid = createAssistantOpenAiKeyHandlers(base);
    await expect(invalid.POST(request("POST", { apiKey: "token" })).then((r) => r.status)).resolves.toBe(400);

    const missingSecret = createAssistantOpenAiKeyHandlers({
      ...base,
      env: {} as NodeJS.ProcessEnv,
    });
    const response = await missingSecret.POST(request("POST", { apiKey: "sk-proj-valid-openai-key-for-client" }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "TOKEN_ENCRYPTION_SECRET_MISSING" });
  });

  it("declares the AssistantSecret table with assistant-scoped uniqueness", () => {
    const schema = fs.readFileSync(path.resolve("apps/vase-labs/prisma/schema.prisma"), "utf8");

    expect(schema).toContain("secrets        AssistantSecret[]");
    expect(schema).toContain("model AssistantSecret");
    expect(schema).toContain("@@unique([assistantId, kind])");
  });
});
