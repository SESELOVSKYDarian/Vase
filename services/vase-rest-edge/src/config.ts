import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { z } from "zod";

const schema = z.object({
  EDGE_DATA_DIR: z.string().min(1).optional(),
  EDGE_HOST: z.string().min(1).default("0.0.0.0"),
  EDGE_PORT: z.coerce.number().int().positive().max(65535).default(3443),
  EDGE_TLS_KEY_PATH: z.string().min(1).optional(),
  EDGE_TLS_CERT_PATH: z.string().min(1).optional(),
  EDGE_CLOUD_BASE_URL: z.url().default("https://rest.vase.ar"),
  EDGE_CLOUD_PUBLIC_KEY_PATH: z.string().min(1).optional(),
  EDGE_UPDATE_MANIFEST_URL: z.url().refine((value) =>
    value.startsWith("https://")).optional(),
  EDGE_UPDATE_PUBLIC_KEY_PATH: z.string().min(1).optional(),
  EDGE_UPDATE_CHANNEL: z.enum(["stable", "beta"]).default("stable"),
}).passthrough();

export type EdgeConfig = {
  dataDir: string;
  host: string;
  port: number;
  tlsKeyPath: string;
  tlsCertPath: string;
  cloudBaseUrl: string;
  cloudPublicKeyPath: string;
  updateManifestUrl?: string;
  updatePublicKeyPath: string;
  updateChannel: "stable" | "beta";
};

export function readEdgeConfig(environment: Record<string, string | undefined>): EdgeConfig {
  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(environment);
  } catch {
    throw new Error("EDGE_TLS_REQUIRED");
  }
  const dataDir = resolve(parsed.EDGE_DATA_DIR ??
    resolve(environment.ProgramData ?? "C:\\ProgramData", "Vase", "Rest Edge"));
  const config = {
    dataDir,
    host: parsed.EDGE_HOST,
    port: parsed.EDGE_PORT,
    tlsKeyPath: resolve(parsed.EDGE_TLS_KEY_PATH ?? resolve(dataDir, "server.key")),
    tlsCertPath: resolve(parsed.EDGE_TLS_CERT_PATH ?? resolve(dataDir, "server.crt")),
    cloudBaseUrl: parsed.EDGE_CLOUD_BASE_URL,
    cloudPublicKeyPath: resolve(
      parsed.EDGE_CLOUD_PUBLIC_KEY_PATH ??
        resolve(dirname(fileURLToPath(import.meta.url)), "..", "cloud-signing.pub"),
    ),
    updateManifestUrl: parsed.EDGE_UPDATE_MANIFEST_URL,
    updatePublicKeyPath: resolve(
      parsed.EDGE_UPDATE_PUBLIC_KEY_PATH ??
        parsed.EDGE_CLOUD_PUBLIC_KEY_PATH ??
        resolve(dirname(fileURLToPath(import.meta.url)), "..", "cloud-signing.pub"),
    ),
    updateChannel: parsed.EDGE_UPDATE_CHANNEL,
  };
  if (!existsSync(config.tlsKeyPath) || !existsSync(config.tlsCertPath)) {
    throw new Error("EDGE_TLS_REQUIRED");
  }
  return config;
}
