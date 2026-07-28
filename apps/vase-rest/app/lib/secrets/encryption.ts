import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function keyBytes(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.byteLength !== 32) throw new Error("REST_SECRET_KEY_INVALID");
  return key;
}

export function encryptSecret(input: {
  plaintext: string;
  context: string;
  keyVersion: string;
  key: string;
}) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(input.key), iv);
  cipher.setAAD(Buffer.from(input.context));
  const encrypted = Buffer.concat([
    cipher.update(input.plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    input.keyVersion,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(input: {
  ciphertext: string;
  context: string;
  keys: Record<string, string | undefined>;
}) {
  try {
    const [version, iv, tag, encrypted] = input.ciphertext.split(".");
    if (!version || !iv || !tag || !encrypted) throw new Error();
    const key = input.keys[version];
    if (!key) throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyBytes(key),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(input.context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("REST_SECRET_DECRYPT_FAILED");
  }
}

