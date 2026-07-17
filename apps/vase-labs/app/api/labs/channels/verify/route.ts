import { NextResponse } from "next/server";
import {
  createManualChannelSetupService,
  type ManualChannelVerifyResult,
} from "../../../../lib/channel-manual-setup";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

const authErrors = new Set(["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED"]);

export function createChannelVerifyPostHandler(dependencies: {
  resolveContext(cookie: string | null): Promise<{ assistant: { id: string } }>;
  verify(assistantId: string, channelId: string): Promise<ManualChannelVerifyResult>;
}) {
  return async function POST(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.channelId !== "string" || !body.channelId.trim()) {
        return NextResponse.json({ error: "CHANNEL_INPUT_INVALID" }, { status: 400 });
      }
      return NextResponse.json(await dependencies.verify(resolved.assistant.id, body.channelId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (authErrors.has(message)) return NextResponse.json({ error: message }, { status: 401 });
      if (message === "LABS_TENANT_FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
      if (message === "CHANNEL_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
      return NextResponse.json({ error: "CHANNEL_VERIFY_FAILED" }, { status: 500 });
    }
  };
}

const service = createManualChannelSetupService({
  async list(assistantId) { return labsPrisma.channel.findMany({ where: { assistantId } }); },
  async create() { throw new Error("CHANNEL_CREATE_UNAVAILABLE"); },
  async findByIdForAssistant(assistantId, channelId) {
    return labsPrisma.channel.findFirst({ where: { id: channelId, assistantId } });
  },
});

export const POST = createChannelVerifyPostHandler({ resolveContext: resolveLabsRequestContext, verify: service.verify });
