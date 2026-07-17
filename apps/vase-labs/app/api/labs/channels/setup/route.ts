import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import {
  createManualChannelSetupService,
  type ManualChannelSetupInput,
} from "../../../../lib/channel-manual-setup";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

const authErrors = new Set(["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"]);

export function createChannelSetupPostHandler(dependencies: {
  resolveContext(cookie: string | null): Promise<Omit<ManualChannelSetupInput, "origin" | "channelType">>;
  setup(input: ManualChannelSetupInput): Promise<{ channelId: string; webhookUrl: string; webhookKey: string }>;
}) {
  return async function POST(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      const channelType = labsChannelSchema.parse(body?.channelType);
      const result = await dependencies.setup({
        origin: new URL(request.url).origin,
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
});

export const POST = createChannelSetupPostHandler({ resolveContext: resolveLabsRequestContext, setup: service.setup });
