import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptChannelSecret(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptChannelSecret(encryptedValue: string, secret: string): string {
  const [version, iv, tag, encrypted] = encryptedValue.split(".");
  if (version !== PREFIX || !iv || !tag || !encrypted) {
    throw new Error("INVALID_CHANNEL_SECRET");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function redactChannelSecret(value: string | null | undefined): "secret_configured" | "secret_missing" {
  return value ? "secret_configured" : "secret_missing";
}
