import { mkdir } from "node:fs/promises";
import path from "node:path";
import makeWASocket, { DisconnectReason, useMultiFileAuthState, type WASocket } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Runtime = {
  socket: WASocket;
  qrImageDataUrl?: string;
  connectionState: string;
  failureReason?: string;
};

const runtimes = new Map<string, Promise<Runtime>>();

async function updateChannelConfig(channelId: string, data: Record<string, unknown>) {
  const current = await prisma.aiChannelConnection.findUnique({ where: { id: channelId } });
  if (!current || !current.config || typeof current.config !== "object") return;
  const nextConfig = { ...(current.config as Record<string, unknown>), ...data };
  await prisma.aiChannelConnection.update({
    where: { id: channelId },
    data: { config: nextConfig as Prisma.InputJsonValue },
  });
}

async function updateConnectionState(channelId: string, state: string, failureReason?: string) {
  await updateChannelConfig(channelId, {
    connectionState: state,
    failureReason,
  });
  await prisma.aiChannelConnection.update({
    where: { id: channelId },
    data: {
      status: state === "CONNECTED" ? "CONNECTED" : state.includes("QR") ? "PENDING" : "ERROR",
      connectedAt: state === "CONNECTED" ? new Date() : undefined,
    },
  });
}

async function initializeRuntime(channel: { id: string; tenantId: string }) {
  const sessionDir = path.join(process.cwd(), ".data", "baileys", channel.tenantId, channel.id);
  await mkdir(sessionDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ["Vase", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
  });

  const runtime: Runtime = {
    socket,
    connectionState: "INITIALIZING",
  };

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    if (update.qr) {
      runtime.qrImageDataUrl = await QRCode.toDataURL(update.qr);
      runtime.connectionState = "QR_READY";
      runtime.failureReason = undefined;
      await updateChannelConfig(channel.id, {
        qrImageDataUrl: runtime.qrImageDataUrl,
        qrLastFetchedAt: new Date().toISOString(),
        connectionState: runtime.connectionState,
        failureReason: undefined,
      });
      await updateConnectionState(channel.id, "QR_READY");
    }

    if (update.connection === "open") {
      runtime.connectionState = "CONNECTED";
      runtime.failureReason = undefined;
      await updateConnectionState(channel.id, "CONNECTED");
    }

    if (update.connection === "close") {
      const code = update.lastDisconnect?.error
        ? Number((update.lastDisconnect.error as { output?: { statusCode?: number } }).output?.statusCode)
        : undefined;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      runtime.connectionState = shouldReconnect ? "RECONNECTING" : "DISCONNECTED";
      runtime.failureReason = code ? `DISCONNECT_${code}` : "DISCONNECTED";
      await updateConnectionState(channel.id, runtime.connectionState, runtime.failureReason);

      if (shouldReconnect) {
        runtimes.delete(channel.id);
        await ensureBaileysRuntime(channel.id);
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || msg.key.fromMe) continue;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
      if (!text) continue;

      const { handleInboundChannelMessage } = await import("@/server/services/chatbot/orchestrator");
      await handleInboundChannelMessage({
        tenantId: channel.tenantId,
        channelType: "WHATSAPP",
        externalThreadKey: remoteJid,
        customerName: msg.pushName || null,
        customerContact: remoteJid.replace(/@(c\.us|s\.whatsapp\.net)$/i, ""),
        text,
        messageType: "text",
        rawPayload: msg,
      });
    }
  });

  return runtime;
}

export async function ensureBaileysRuntime(channelId: string) {
  const existing = runtimes.get(channelId);
  if (existing) return existing;
  const channel = await prisma.aiChannelConnection.findUnique({
    where: { id: channelId },
    select: { id: true, tenantId: true, channelType: true },
  });
  if (!channel || channel.channelType !== "WHATSAPP") {
    throw new Error("BAILEYS_CHANNEL_NOT_FOUND");
  }

  const runtimePromise = initializeRuntime(channel);
  runtimes.set(channelId, runtimePromise);
  return runtimePromise;
}

export async function refreshBaileysQr(channelId: string) {
  const runtime = await ensureBaileysRuntime(channelId);
  return runtime.qrImageDataUrl;
}

export async function getBaileysState(channelId: string) {
  const runtime = await ensureBaileysRuntime(channelId);
  return {
    connectionState: runtime.connectionState,
    qrImageDataUrl: runtime.qrImageDataUrl,
    failureReason: runtime.failureReason,
  };
}

export async function sendBaileysTextMessage(channelId: string, to: string, text: string) {
  const runtime = await ensureBaileysRuntime(channelId);
  const jid = /@/.test(to) ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;
  await runtime.socket.sendMessage(jid, { text });
}
