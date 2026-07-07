import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "./db";
import type {
  LabsChannel,
  MetaAssetCandidate,
  MetaConnectionAttemptStatus,
} from "@vase/contracts";
import type {
  MetaConnectionRepository,
  PersistedMetaAttempt,
} from "./meta-connection-service";

type AttemptRow = {
  id: string;
  globalUserId: string;
  globalTenantId: string;
  tenantSlug: string;
  channelType: LabsChannel;
  status: MetaConnectionAttemptStatus;
  stateHash: string;
  encryptedUserToken: string | null;
  candidates: unknown;
  errorCode: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
};

function parseCandidates(value: unknown): MetaAssetCandidate[] {
  return Array.isArray(value) ? (value as MetaAssetCandidate[]) : [];
}

function mapAttempt(row: AttemptRow): PersistedMetaAttempt {
  return {
    ...row,
    candidates: parseCandidates(row.candidates),
  };
}

function json(value: unknown) {
  return Prisma.sql`CAST(${JSON.stringify(value)} AS jsonb)`;
}

function channel(value: LabsChannel) {
  return Prisma.sql`CAST(${value} AS "LabsChannel")`;
}

export class PrismaMetaConnectionRepository implements MetaConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createAttempt(input: {
    id: string;
    globalUserId: string;
    globalTenantId: string;
    tenantSlug: string;
    channelType: LabsChannel;
    stateHash: string;
    expiresAt: Date;
  }) {
    const assistant = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Assistant"
      WHERE "globalTenantId" = ${input.globalTenantId}
        AND "tenantSlug" = ${input.tenantSlug}
      LIMIT 1
    `;
    if (!assistant[0]) {
      throw new Error("LABS_ASSISTANT_NOT_PROVISIONED");
    }

    await this.prisma.$executeRaw`
      INSERT INTO "MetaConnectionAttempt" (
        id, "assistantId", "globalTenantId", "globalUserId", "tenantSlug",
        "channelType", status, "stateHash", candidates, "expiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${input.id}, ${assistant[0].id}, ${input.globalTenantId}, ${input.globalUserId},
        ${input.tenantSlug}, ${channel(input.channelType)}, 'AUTHORIZING',
        ${input.stateHash}, ${json([])}, ${input.expiresAt}, ${new Date()}, ${new Date()}
      )
    `;
  }

  async consumeAttemptState(input: { stateHash: string; now: Date }) {
    const rows = await this.prisma.$queryRaw<AttemptRow[]>`
      UPDATE "MetaConnectionAttempt"
      SET "consumedAt" = ${input.now}, "updatedAt" = ${input.now}
      WHERE "stateHash" = ${input.stateHash}
        AND "consumedAt" IS NULL
        AND "expiresAt" > ${input.now}
        AND status = 'AUTHORIZING'
      RETURNING
        id, "globalUserId", "globalTenantId", "tenantSlug", "channelType",
        status, "stateHash", "encryptedUserToken", candidates, "errorCode", "expiresAt", "consumedAt"
    `;
    return rows[0] ? mapAttempt(rows[0]) : null;
  }

  async setAttemptCandidates(input: {
    attemptId: string;
    encryptedUserToken: string;
    candidates: MetaAssetCandidate[];
  }) {
    await this.prisma.$executeRaw`
      UPDATE "MetaConnectionAttempt"
      SET
        status = 'SELECTING_ASSET',
        "encryptedUserToken" = ${input.encryptedUserToken},
        candidates = ${json(input.candidates)},
        "updatedAt" = ${new Date()}
      WHERE id = ${input.attemptId}
    `;
  }

  async findAttempt(input: {
    attemptId: string;
    globalUserId: string;
    globalTenantId: string;
  }) {
    const rows = await this.prisma.$queryRaw<AttemptRow[]>`
      SELECT
        id, "globalUserId", "globalTenantId", "tenantSlug", "channelType",
        status, "stateHash", "encryptedUserToken", candidates, "errorCode", "expiresAt", "consumedAt"
      FROM "MetaConnectionAttempt"
      WHERE id = ${input.attemptId}
        AND "globalUserId" = ${input.globalUserId}
        AND "globalTenantId" = ${input.globalTenantId}
      LIMIT 1
    `;
    return rows[0] ? mapAttempt(rows[0]) : null;
  }

  async markAttemptVerifying(attemptId: string) {
    await this.prisma.$executeRaw`
      UPDATE "MetaConnectionAttempt"
      SET status = 'VERIFYING', "updatedAt" = ${new Date()}
      WHERE id = ${attemptId}
    `;
  }

  async completeAttempt(input: {
    attemptId: string;
    channel: {
      globalTenantId: string;
      tenantSlug: string;
      type: LabsChannel;
      provider: "META_OFFICIAL";
      providerAccountId: string;
      accountLabel: string;
      externalHandle: string | null;
      status: "CONNECTED";
      config: Record<string, unknown>;
    };
    encryptedAccessToken: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const assistants = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Assistant"
        WHERE "globalTenantId" = ${input.channel.globalTenantId}
          AND "tenantSlug" = ${input.channel.tenantSlug}
        LIMIT 1
      `;
      const assistant = assistants[0];
      if (!assistant) throw new Error("LABS_ASSISTANT_NOT_PROVISIONED");

      const existing = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Channel"
        WHERE "assistantId" = ${assistant.id}
          AND type = ${channel(input.channel.type)}
          AND "providerAccountId" = ${input.channel.providerAccountId}
        LIMIT 1
      `;
      const channelId = existing[0]?.id ?? randomUUID();
      const now = new Date();

      if (existing[0]) {
        await tx.$executeRaw`
          UPDATE "Channel"
          SET
            provider = 'META_OFFICIAL',
            status = 'CONNECTED',
            "accountLabel" = ${input.channel.accountLabel},
            "externalHandle" = ${input.channel.externalHandle},
            config = ${json(input.channel.config)},
            "connectedAt" = ${now},
            "lastSyncedAt" = ${now},
            "lastError" = NULL,
            "updatedAt" = ${now}
          WHERE id = ${channelId}
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO "Channel" (
            id, "assistantId", type, provider, status, "providerAccountId",
            "accountLabel", "externalHandle", config, "connectedAt", "lastSyncedAt",
            "createdAt", "updatedAt"
          )
          VALUES (
            ${channelId}, ${assistant.id}, ${channel(input.channel.type)}, 'META_OFFICIAL',
            'CONNECTED', ${input.channel.providerAccountId}, ${input.channel.accountLabel},
            ${input.channel.externalHandle}, ${json(input.channel.config)}, ${now}, ${now},
            ${now}, ${now}
          )
        `;
      }

      await tx.$executeRaw`
        INSERT INTO "ChannelSecret" (
          id, "channelId", kind, "encryptedValue", "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${channelId}, 'META_ACCESS_TOKEN',
          ${input.encryptedAccessToken}, ${now}, ${now}
        )
        ON CONFLICT ("channelId", kind)
        DO UPDATE SET
          "encryptedValue" = EXCLUDED."encryptedValue",
          "rotatedAt" = ${now},
          "updatedAt" = ${now}
      `;

      await tx.$executeRaw`
        UPDATE "MetaConnectionAttempt"
        SET
          status = 'CONNECTED',
          "encryptedUserToken" = NULL,
          "updatedAt" = ${now}
        WHERE id = ${input.attemptId}
      `;

      return { id: channelId };
    });
  }

  async failAttempt(input: { attemptId: string; errorCode: string }) {
    await this.prisma.$executeRaw`
      UPDATE "MetaConnectionAttempt"
      SET
        status = 'FAILED',
        "errorCode" = ${input.errorCode.slice(0, 160)},
        "encryptedUserToken" = NULL,
        "updatedAt" = ${new Date()}
      WHERE id = ${input.attemptId}
    `;
  }
}
