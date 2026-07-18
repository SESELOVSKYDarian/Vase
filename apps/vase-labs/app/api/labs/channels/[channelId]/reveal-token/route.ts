import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptChannelSecret } from "../../../../../lib/channel-secrets";
import { labsPrisma } from "../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

const schema = z.object({ password: z.string().min(1).max(512) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await params;
    const { context, assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const { password } = schema.parse(await request.json());
    const base = (process.env.APP_INTERNAL_URL ?? "http://app-vase:3002").replace(/\/$/, "");
    const verified = await fetch(`${base}/api/internal/labs/verify-password`, {
      method: "POST", cache: "no-store",
      headers: { authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`, "content-type": "application/json" },
      body: JSON.stringify({ userId: context.globalUserId, password }),
    });
    if (!verified.ok) return NextResponse.json({ error: verified.status === 429 ? "RATE_LIMIT_EXCEEDED" : "PASSWORD_INVALID" }, { status: verified.status === 429 ? 429 : 401 });
    const secret = await labsPrisma.channelSecret.findFirst({
      where: { channelId, kind: "META_ACCESS_TOKEN", channel: { assistantId: assistant.id } }, select: { encryptedValue: true },
    });
    if (!secret) return NextResponse.json({ error: "CHANNEL_CREDENTIAL_MISSING" }, { status: 404 });
    const encryptionSecret = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    return NextResponse.json({ token: decryptChannelSecret(secret.encryptedValue, encryptionSecret) }, { headers: { "cache-control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "TOKEN_REVEAL_FAILED" }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
