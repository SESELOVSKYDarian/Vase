import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";

export function certificateFingerprint(path: string) {
  return `SHA256:${createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase()}`;
}

export async function protectPrivateKey(path: string) {
  chmodSync(path, 0o600);
}

export function ensureLocalSecret(path: string) {
  if (!existsSync(path)) {
    writeFileSync(path, randomBytes(48).toString("base64url"), { mode: 0o600 });
  }
  chmodSync(path, 0o600);
  return readFileSync(path, "utf8").trim();
}
