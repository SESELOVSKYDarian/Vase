import { z } from "zod";

export function readSecretKeyring() {
  const activeVersion = process.env.REST_SECRET_ACTIVE_VERSION ?? "";
  let keys: Record<string, string>;
  try {
    keys = z.record(z.string(), z.string()).parse(
      JSON.parse(process.env.REST_SECRET_KEYS_JSON ?? "{}"),
    );
  } catch {
    throw new Error("REST_SECRET_KEYRING_INVALID");
  }
  if (!activeVersion || !keys[activeVersion]) throw new Error("REST_SECRET_KEYRING_INVALID");
  return { activeVersion, keys };
}

