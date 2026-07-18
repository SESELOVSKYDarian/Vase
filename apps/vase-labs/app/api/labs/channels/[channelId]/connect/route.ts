import { labsChannelSchema } from "@vase/contracts";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptChannelSecret } from "../../../../../lib/channel-secrets";
import { labsPrisma, Prisma } from "../../../../../lib/db";
import { createManualMetaConnectionService } from "../../../../../lib/manual-meta-connection";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

const bodySchema = z.object({
  channelType: labsChannelSchema,
  accessToken: z.string().trim().min(1).max(4096),
  providerAccountId: z.string().trim().min(1).max(160),
  parentId: z.string().trim().min(1).max(160).nullable(),
}).strict();

const safeErrors = new Set(["CHANNEL_NOT_FOUND", "META_ASSET_NOT_AUTHORIZED", "META_TOKEN_INVALID", "META_PERMISSIONS_MISSING", "META_GRAPH_REQUEST_FAILED", "META_ASSET_PARENT_MISSING"]);

export async function POST(request: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await params;
    const { assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = bodySchema.parse(await request.json());
    const runtime = createMetaRuntime();
    const secret = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!secret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    const service = createManualMetaConnectionService({
      graph: runtime.graph,
      encrypt: (value) => encryptChannelSecret(value, secret),
      repository: {
        find: (assistantId, id) => labsPrisma.channel.findFirst({ where: { id, assistantId }, select: { id: true, type: true, webhookVerifiedAt: true } }),
        async stage(data) {
          const current = await labsPrisma.channel.findUnique({ where: { id: data.channelId }, select: { type: true } });
          if (!current) throw new Error("CHANNEL_NOT_FOUND");
          await labsPrisma.$transaction([
            labsPrisma.channel.update({
              where: { id: data.channelId },
              data: {
                providerAccountId: data.providerAccountId,
                phoneNumberId: current.type === "WHATSAPP" ? data.providerAccountId : null,
                wabaId: current.type === "WHATSAPP" ? data.parentId : null,
                config: { manualWebhook: true, parentId: data.parentId, validationPending: true },
                status: "PENDING", connectedAt: null, lastError: null,
              },
            }),
            labsPrisma.channelSecret.upsert({
              where: { channelId_kind: { channelId: data.channelId, kind: "META_ACCESS_TOKEN" } },
              create: { id: randomUUID(), channelId: data.channelId, kind: "META_ACCESS_TOKEN", encryptedValue: data.encryptedAccessToken },
              update: { encryptedValue: data.encryptedAccessToken, rotatedAt: new Date() },
            }),
          ]);
        },
        async fail(id, errorCode) {
          await labsPrisma.channel.update({ where: { id }, data: { status: "ERROR", lastError: errorCode.slice(0, 160) } });
        },
        async save(data) {
          const now = new Date();
          await labsPrisma.$transaction([
            labsPrisma.channel.update({
              where: { id: data.channelId },
              data: {
                provider: "META_OFFICIAL", providerAccountId: data.providerAccountId,
                phoneNumberId: data.phoneNumberId, wabaId: data.wabaId,
                accountLabel: data.accountLabel, externalHandle: data.externalHandle,
                config: data.config as Prisma.InputJsonValue, status: data.status,
                connectedAt: data.status === "CONNECTED" ? now : null,
                lastSyncedAt: now, lastError: null,
              },
            }),
            labsPrisma.channelSecret.upsert({
              where: { channelId_kind: { channelId: data.channelId, kind: "META_ACCESS_TOKEN" } },
              create: { id: randomUUID(), channelId: data.channelId, kind: "META_ACCESS_TOKEN", encryptedValue: data.encryptedAccessToken },
              update: { encryptedValue: data.encryptedAccessToken, rotatedAt: now },
            }),
          ]);
        },
      },
    });
    return NextResponse.json(await service.connect({ assistantId: assistant.id, channelId, ...body }));
  } catch (error) {
    const code = error instanceof Error && safeErrors.has(error.message) ? error.message : "CHANNEL_CONNECTION_FAILED";
    const status = code === "CHANNEL_NOT_FOUND" ? 404 : code === "CHANNEL_CONNECTION_FAILED" ? 500 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
