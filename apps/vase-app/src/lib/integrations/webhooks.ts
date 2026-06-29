import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(params: {
  secret: string;
  timestamp: string;
  body: string;
}) {
  return createHmac("sha256", params.secret)
    .update(`${params.timestamp}.${params.body}`)
    .digest("hex");
}

export function buildWebhookHeaders(params: {
  secret: string;
  body: string;
  event: string;
  requestId: string;
  timestamp?: string;
}) {
  const timestamp = params.timestamp ?? new Date().toISOString();
  const signature = signWebhookPayload({
    secret: params.secret,
    timestamp,
    body: params.body,
  });

  return {
    "content-type": "application/json",
    "x-vase-event": params.event,
    "x-vase-request-id": params.requestId,
    "x-vase-timestamp": timestamp,
    "x-vase-signature": `sha256=${signature}`,
  };
}

export function verifyWebhookSignature(params: {
  secret: string;
  body: string;
  timestamp: string;
  signatureHeader: string;
  toleranceSeconds?: number;
  now?: Date;
}) {
  const provided = params.signatureHeader.replace(/^sha256=/, "");
  const expected = signWebhookPayload({
    secret: params.secret,
    timestamp: params.timestamp,
    body: params.body,
  });

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  const toleranceSeconds = params.toleranceSeconds ?? 300;
  const now = params.now ?? new Date();
  const ageMs = Math.abs(now.getTime() - new Date(params.timestamp).getTime());

  return Number.isFinite(ageMs) && ageMs <= toleranceSeconds * 1000;
}
