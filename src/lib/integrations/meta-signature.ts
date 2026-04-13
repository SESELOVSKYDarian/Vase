import { createHmac, timingSafeEqual } from "node:crypto";

export function signMetaPayload(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyMetaSignature(secret: string, body: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;

  const provided = signatureHeader.replace(/^sha256=/, "");
  const expected = signMetaPayload(secret, body);
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
