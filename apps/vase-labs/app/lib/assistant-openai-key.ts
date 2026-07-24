import type { PrismaClient } from "./db";
import { decryptChannelSecret } from "./channel-secrets";

export interface AssistantOpenAiKeyRepository {
  findEncryptedOpenAiKey(assistantId: string): Promise<string | null>;
}

export async function resolveAssistantOpenAiApiKey(input: {
  assistantId: string;
  encryptionSecret: string;
  repository: AssistantOpenAiKeyRepository;
}): Promise<string> {
  const encryptionSecret = input.encryptionSecret.trim();
  if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");

  const encryptedValue = await input.repository.findEncryptedOpenAiKey(
    input.assistantId,
  );
  if (!encryptedValue) throw new Error("OPENAI_API_KEY_MISSING");

  return decryptChannelSecret(encryptedValue, encryptionSecret);
}

export class PrismaAssistantOpenAiKeyRepository
  implements AssistantOpenAiKeyRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findEncryptedOpenAiKey(assistantId: string): Promise<string | null> {
    const secret = await this.prisma.assistantSecret.findUnique({
      where: {
        assistantId_kind: {
          assistantId,
          kind: "OPENAI_API_KEY",
        },
      },
      select: { encryptedValue: true },
    });
    return secret?.encryptedValue ?? null;
  }
}
