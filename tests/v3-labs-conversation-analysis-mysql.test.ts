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

  it("bridges legacy pending markers throughout a rolling deployment", async () => {
    const insertedId = `message_${randomUUID()}`;
    const updatedId = `message_${randomUUID()}`;
    const timestampId = `message_${randomUUID()}`;
    const createdAt = new Date("2026-07-23T20:10:00.123Z");

    await prisma.$executeRaw`
      INSERT INTO Message (
        id, conversationId, role, direction, content, metadata, createdAt
      ) VALUES (
        ${insertedId}, ${conversationId}, 'user', 'INBOUND', 'legacy insert',
        JSON_OBJECT('conversationAnalysisPending', true), ${createdAt}
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO Message (
        id, conversationId, role, direction, content, metadata, createdAt
      ) VALUES (
        ${updatedId}, ${conversationId}, 'user', 'INBOUND', 'legacy update',
        JSON_OBJECT(), ${createdAt}
      )
    `;
    await prisma.$executeRaw`
      UPDATE Message
      SET metadata = JSON_OBJECT(
        'conversationAnalysisPending',
        '2026-02-31T20:09:00.456Z'
      )
      WHERE id = ${updatedId}
    `;
    await prisma.$executeRaw`
      INSERT INTO Message (
        id, conversationId, role, direction, content, metadata, createdAt
      ) VALUES (
        ${timestampId}, ${conversationId}, 'user', 'INBOUND', 'legacy timestamp',
        JSON_OBJECT(
          'conversationAnalysisPending',
          '2026-02-31T20:09:00.456Z'
        ),
        ${createdAt}
      )
    `;

    const bridged = await prisma.message.findMany({
      where: { id: { in: [insertedId, updatedId, timestampId] } },
      select: { id: true, analysisPendingAt: true },
    });
    const pendingById = new Map(
      bridged.map((message) => [message.id, message.analysisPendingAt?.getTime()]),
    );
    expect(pendingById.get(insertedId)).toBe(createdAt.getTime());
    expect(pendingById.get(updatedId)).toBe(createdAt.getTime());
    expect(pendingById.get(timestampId)).toBe(createdAt.getTime());

    const repository = new PrismaConversationAnalysisRepository(prisma);
    await repository.clearFailedEnqueueMarker({
      conversationId,
      assistantId,
      messageId: insertedId,
    });
    const cleared = await prisma.message.findUniqueOrThrow({
      where: { id: insertedId },
      select: { analysisPendingAt: true, metadata: true },
    });
    expect(cleared.analysisPendingAt).toBeNull();
    expect(cleared.metadata).not.toHaveProperty("conversationAnalysisPending");
  });
});
