import { createHmac, timingSafeEqual } from "node:crypto";

// Enlace firmado para cambiar el correo de una cuenta: el cambio se hace recién cuando se abre
// desde la casilla nueva. No guarda nada en la base: el enlace lleva usuario, correo nuevo y vencimiento.

const TTL_MS = 60 * 60 * 1000; // 1 hora

type EmailChangeClaims = { userId: string; email: string; expiresAt: number };

function sign(body: string, secret: string) {
  return createHmac("sha256", `email-change:${secret}`).update(body).digest("base64url");
}

export function createEmailChangeToken(
  userId: string,
  email: string,
  { now = Date.now(), secret = process.env.AUTH_SECRET ?? "" }: { now?: number; secret?: string } = {},
) {
  if (!secret) throw new Error("AUTH_SECRET no está configurada.");
  const body = Buffer.from(JSON.stringify({ u: userId, e: email, x: now + TTL_MS })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function readEmailChangeToken(
  token: string,
  { now = Date.now(), secret = process.env.AUTH_SECRET ?? "" }: { now?: number; secret?: string } = {},
): EmailChangeClaims | null {
  if (!secret || typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: unknown; e?: unknown; x?: unknown };
    if (typeof data.u !== "string" || typeof data.e !== "string" || typeof data.x !== "number") return null;
    if (data.x < now) return null;
    return { userId: data.u, email: data.e, expiresAt: data.x };
  } catch {
    return null;
  }
}
