import { randomUUID } from "node:crypto";
import type {
  LabsChannel,
  MetaAssetCandidate,
  MetaConnectionAttemptStatus,
} from "@vase/contracts";
import type { PrismaClient } from "./db";
import type {
  MetaConnectionRepository,
  PersistedMetaAttempt,
} from "./meta-connection-service";

type AttemptRecord = {
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
  if (Array.isArray(value)) {
    return value as MetaAssetCandidate[];
  }

  if (typeof value === "string") {
    try {
      return parseCandidates(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

function mapAttempt(row: AttemptRecord): PersistedMetaAttempt {
  return {
    ...row,
    candidates: parseCandidates(row.candidates),
  };
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
    const assistant = await (this.prisma as any).assistant.findFirst({
      where: {
        globalTenantId: input.globalTenantId,
        tenantSlug: input.tenantSlug,
      },
      select: { id: true },
    });
    if (!assistant) {
      throw new Error("LABS_ASSISTANT_NOT_PROVISIONED");
    }

    await (this.prisma as any).metaConnectionAttempt.create({
      data: {
        id: input.id,
        assistantId: assistant.id,
        globalTenantId: input.globalTenantId,
        globalUserId: input.globalUserId,
        tenantSlug: input.tenantSlug,
        channelType: input.channelType,
        status: "AUTHORIZING",
        stateHash: input.stateHash,
        candidates: [],
        expiresAt: input.expiresAt,
      },
    });
  }

  async consumeAttemptState(input: { stateHash: string; now: Date }) {
    const attempt = await (this.prisma as any).metaConnectionAttempt.findFirst({
      where: {
        stateHash: input.stateHash,
        consumedAt: null,
        expiresAt: { gt: input.now },
        status: "AUTHORIZING",
      },
    });

    if (!attempt) {
      return null;
    }

    const consumed = await (this.prisma as any).metaConnectionAttempt.update({
      where: { id: attempt.id },
      data: { consumedAt: input.now },
    });

    return mapAttempt(consumed);
  }

  async setAttemptCandidates(input: {
    attemptId: string;
    encryptedUserToken: string;
    candidates: MetaAssetCandidate[];
  }) {
    await (this.prisma as any).metaConnectionAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "SELECTING_ASSET",
        encryptedUserToken: input.encryptedUserToken,
        candidates: input.candidates,
      },
    });
  }

  async findAttempt(input: {
    attemptId: string;
    globalUserId: string;
    globalTenantId: string;
  }) {
    const attempt = await (this.prisma as any).metaConnectionAttempt.findFirst({
      where: {
        id: input.attemptId,
        globalUserId: input.globalUserId,
        globalTenantId: input.globalTenantId,
      },
    });

    return attempt ? mapAttempt(attempt) : null;
  }

  async markAttemptVerifying(attemptId: string) {
    await (this.prisma as any).metaConnectionAttempt.update({
      where: { id: attemptId },
      data: { status: "VERIFYING" },
    });
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
    return (this.prisma as any).$transaction(async (tx: any) => {
      const assistant = await tx.assistant.findFirst({
        where: {
          globalTenantId: input.channel.globalTenantId,
          tenantSlug: input.channel.tenantSlug,
        },
        select: { id: true },
      });
      if (!assistant) throw new Error("LABS_ASSISTANT_NOT_PROVISIONED");

      const existing = await tx.channel.findFirst({
        where: {
          assistantId: assistant.id,
          type: input.channel.type,
          providerAccountId: input.channel.providerAccountId,
        },
        select: { id: true },
      });
      const channelId = existing?.id ?? randomUUID();
      const now = new Date();

      const channel = existing
        ? await tx.channel.update({
            where: { id: channelId },
            data: {
              provider: "META_OFFICIAL",
              status: "CONNECTED",
              accountLabel: input.channel.accountLabel,
              externalHandle: input.channel.externalHandle,
              config: input.channel.config,
              connectedAt: now,
              lastSyncedAt: now,
              lastError: null,
            },
          })
        : await tx.channel.create({
            data: {
              id: channelId,
              assistantId: assistant.id,
              type: input.channel.type,
              provider: "META_OFFICIAL",
              status: "CONNECTED",
              providerAccountId: input.channel.providerAccountId,
              accountLabel: input.channel.accountLabel,
              externalHandle: input.channel.externalHandle,
              config: input.channel.config,
              connectedAt: now,
              lastSyncedAt: now,
            },
          });

      await tx.channelSecret.upsert({
        where: {
          channelId_kind: {
            channelId,
            kind: "META_ACCESS_TOKEN",
          },
        },
        create: {
          id: randomUUID(),
          channelId,
          kind: "META_ACCESS_TOKEN",
          encryptedValue: input.encryptedAccessToken,
        },
        update: {
          encryptedValue: input.encryptedAccessToken,
          rotatedAt: now,
        },
      });

      await tx.metaConnectionAttempt.update({
        where: { id: input.attemptId },
        data: {
          status: "CONNECTED",
          encryptedUserToken: null,
        },
      });

      return { id: channel.id };
    });
  }

  async failAttempt(input: { attemptId: string; errorCode: string }) {
    await (this.prisma as any).metaConnectionAttempt.update({
      where: { id: input.attemptId },
      data: {
        status: "FAILED",
        errorCode: input.errorCode.slice(0, 160),
        encryptedUserToken: null,
      },
    });
  }
}
