import { describe, expect, it } from "vitest";
import {
  resolveAssistantOpenAiApiKey,
} from "../apps/vase-labs/app/lib/assistant-openai-key";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";

describe("Labs assistant OpenAI key resolver", () => {
  it("decrypts the OpenAI key configured by the business", async () => {
    const encryptedValue = encryptChannelSecret("sk-business", "encryption-key");

    await expect(resolveAssistantOpenAiApiKey({
      assistantId: "assistant_1",
      encryptionSecret: "encryption-key",
      repository: {
        findEncryptedOpenAiKey: async () => encryptedValue,
      },
    })).resolves.toBe("sk-business");
  });

  it("fails without falling back to another business key", async () => {
    await expect(resolveAssistantOpenAiApiKey({
      assistantId: "assistant_2",
      encryptionSecret: "encryption-key",
      repository: {
        findEncryptedOpenAiKey: async () => null,
      },
    })).rejects.toThrow("OPENAI_API_KEY_MISSING");
  });
});
