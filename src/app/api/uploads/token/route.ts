import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";

const DEFAULT_UPLOADS_BASE_URL = "https://uploads.vase.ar";
const TOKEN_TTL_SECONDS = 60 * 60 * 2;

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

function normalizeUsername(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized || "usuario";
}

function getUploadUsername(sessionUser: { id: string; email?: string | null; name?: string | null }) {
  const emailName = sessionUser.email?.split("@")[0];
  return normalizeUsername(emailName || sessionUser.name || sessionUser.id);
}

export async function GET() {
  try {
    const session = await requireUser();
    const secret = process.env.UPLOADS_JWT_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "UPLOADS_JWT_SECRET_MISSING" }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const username = getUploadUsername(session.user);
    const uploadsBaseUrl = process.env.UPLOADS_BASE_URL || DEFAULT_UPLOADS_BASE_URL;
    const token = signJwt(
      {
        sub: session.user.id,
        username,
        email: session.user.email,
        name: session.user.name,
        role: session.user.platformRole ?? "USER",
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
      },
      secret,
    );

    return NextResponse.json({
      ok: true,
      token,
      uploads_base_url: uploadsBaseUrl,
      expires_in_seconds: TOKEN_TTL_SECONDS,
      user: {
        id: session.user.id,
        username,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const status = message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
