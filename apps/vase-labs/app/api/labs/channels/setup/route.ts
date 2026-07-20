import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import {
  createManualChannelSetupService,
  resolveCanonicalLabsOrigin,
  type ManualChannelSetupInput,
} from "../../../../lib/channel-manual-setup";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

const authErrors = new Set(["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"]);

export function createChannelSetupPostHandler(dependencies: {
  resolveContext(cookie: string | null): Promise<Omit<ManualChannelSetupInput, "origin" | "channelType">>;
  setup(input: ManualChannelSetupInput): Promise<{ channelId: string; webhookUrl: string; webhookKey: string }>;
  resolvePublicOrigin?(): string;
}) {
  return async function POST(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !("channelType" in body)) {
        return NextResponse.json({ error: "CHANNEL_INPUT_INVALID" }, { status: 400 });
      }
      const channelType = labsChannelSchema.parse(body?.channelType);
      const result = await dependencies.setup({
        origin: dependencies.resolvePublicOrigin?.() ?? resolveCanonicalLabsOrigin(undefined),
        channelType,
        assistant: resolved.assistant,
        context: resolved.context,
      });
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (authErrors.has(message)) return NextResponse.json({ error: message }, { status: 401 });
      if (message === "LABS_TENANT_FORBIDDEN" || message === "CHANNEL_NOT_INCLUDED" || message === "CHANNEL_LIMIT_REACHED") {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (message === "CHANNEL_MANUAL_CONNECTION_EXISTS") return NextResponse.json({ error: message }, { status: 409 });
      if (message.startsWith("[") || message.includes("Invalid input")) {
        return NextResponse.json({ error: "CHANNEL_INPUT_INVALID" }, { status: 400 });
      }
      return NextResponse.json({ error: "CHANNEL_SETUP_FAILED" }, { status: 500 });
    }
  };
}

const service = createManualChannelSetupService({
  async list(assistantId) {
    return labsPrisma.channel.findMany({ where: { assistantId } });
  },
  async create(input) {
    return labsPrisma.channel.create({
      data: {
        id: input.id,
        assistantId: input.assistantId,
        type: input.channelType,
        provider: "META_OFFICIAL",
        status: "PENDING",
        webhookUrl: input.webhookUrl,
        config: { manualWebhook: true },
      },
    });
  },
  async findByIdForAssistant(assistantId, channelId) {
    return labsPrisma.channel.findFirst({ where: { id: channelId, assistantId } });
  },
  async adoptPending(input) {
    return labsPrisma.$transaction(async (transaction) => {
      const result = await transaction.channel.updateMany({
        where: {
          id: input.currentId,
          assistantId: input.assistantId,
          type: input.channelType,
          provider: "META_OFFICIAL",
          status: "PENDING",
        },
        data: { id: input.id },
      });
      if (result.count !== 1) throw new Error("CHANNEL_LEGACY_ADOPTION_FAILED");
      const adopted = await transaction.channel.findFirst({ where: { id: input.id, assistantId: input.assistantId } });
      if (!adopted) throw new Error("CHANNEL_LEGACY_ADOPTION_FAILED");
      return adopted;
    });
  },
  async reconnect(input) {
    const result = await labsPrisma.channel.updateMany({
      where: { id: input.id, assistantId: input.assistantId, type: input.channelType, provider: "META_OFFICIAL", status: "DISCONNECTED" },
      data: { status: "PENDING", webhookUrl: input.webhookUrl, config: { manualWebhook: true }, lastError: null },
    });
    if (result.count !== 1) throw new Error("CHANNEL_RECONNECT_FAILED");
    const channel = await labsPrisma.channel.findFirst({ where: { id: input.id, assistantId: input.assistantId } });
    if (!channel) throw new Error("CHANNEL_RECONNECT_FAILED");
    return channel;
  },
});

export const POST = createChannelSetupPostHandler({
  resolveContext: resolveLabsRequestContext,
  setup: service.setup,
  resolvePublicOrigin: () => resolveCanonicalLabsOrigin(process.env.NEXT_PUBLIC_APP_URL),
});
