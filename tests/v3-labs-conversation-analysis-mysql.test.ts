import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../apps/vase-labs/app/generated/prisma";
import { createConversationAnalysisQueue } from "../apps/vase-labs/app/lib/conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../apps/vase-labs/app/lib/conversation-analysis-repository";

// Optional integration command:
// $env:LABS_MYSQL_TEST_DATABASE_URL="mysql://..."; npx vitest run tests/v3-labs-conversation-analysis-mysql.test.ts
const databaseUrl = process.env.LABS_MYSQL_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("conversation analysis MySQL locking", () => {
  let prisma: PrismaClient;
  let assistantId: string;
  let conversationId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    assistantId = `assistant_${randomUUID()}`;
    conversationId = `conversation_${randomUUID()}`;
    await prisma.assistant.create({
      data: {
        id: assistantId,
        globalTenantId: `tenant_${randomUUID()}`,
        tenantSlug: `tenant-${randomUUID()}`,
        name: "Conversation analysis integration",
        model: "gpt-fast",
        conversations: {
          create: {
            id: conversationId,
            channel: "INSTAGRAM",
            externalThreadKey: `thread_${randomUUID()}`,
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.assistant.deleteMany({ where: { id: assistantId } });
    await prisma.$disconnect();
  });

  it("linearizes concurrent enqueue and claim operations", async () => {
    const repository = new PrismaConversationAnalysisRepository(prisma);
    let token = 0;
    const queue = createConversationAnalysisQueue({
      repository,
      clock: () => new Date("2026-07-23T20:00:00.000Z"),
      tokenFactory: () => `lease_${++token}`,
      maxAttempts: 3,
      leaseDurationMs: 60_000,
    });

    await Promise.all([
      queue.enqueue({
        conversationId,
        requestedThroughMessageId: "message_old",
        requestedThroughMessageCreatedAt: new Date("2026-07-23T19:59:00.000Z"),
      }),
      queue.enqueue({
        conversationId,
        requestedThroughMessageId: "message_new",
        requestedThroughMessageCreatedAt: new Date("2026-07-23T19:59:01.000Z"),
      }),
    ]);
    const claims = await Promise.all([queue.claimNext(), queue.claimNext()]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)?.requestedThroughMessageId).toBe("message_new");
  });
});
