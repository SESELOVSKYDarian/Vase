import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IntegrationScope } from "@/config/integrations";

const API_KEY_PREFIX = "vsk_live";
const WEBHOOK_SECRET_PREFIX = "vwhsec";

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiCredential(scopes: IntegrationScope[]) {
  const keyId = randomBytes(8).toString("hex");
  const secret = randomBytes(24).toString("hex");
  const token = `${API_KEY_PREFIX}_${keyId}_${secret}`;

  return {
    displayToken: token,
    keyId,
    keyPrefix: `${API_KEY_PREFIX}_${keyId}`,
    tokenHash: hashSecret(token),
    scopes,
  };
}

export function parseApiCredential(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const value = rawValue.trim();
  const token = value.startsWith("Bearer ") ? value.slice(7).trim() : value;

  if (!token.startsWith(`${API_KEY_PREFIX}_`)) {
    return null;
  }

  const parts = token.split("_");

  if (parts.length < 4) {
    return null;
  }

  const keyId = parts[2];

  if (!keyId) {
    return null;
  }

  return {
    token,
    keyId,
    keyPrefix: `${API_KEY_PREFIX}_${keyId}`,
  };
}

export function verifySecretHash(rawSecret: string, secretHash: string) {
  const incoming = Buffer.from(hashSecret(rawSecret), "hex");
  const stored = Buffer.from(secretHash, "hex");

  if (incoming.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
}

export function generateWebhookSecret() {
  const secret = `${WEBHOOK_SECRET_PREFIX}_${randomBytes(24).toString("hex")}`;

  return {
    displaySecret: secret,
    secretHash: hashSecret(secret),
  };
}
