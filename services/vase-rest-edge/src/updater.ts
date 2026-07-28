import {
  createHash,
  verify,
  type KeyLike,
} from "node:crypto";
import {
  mkdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const payloadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  channel: z.enum(["stable", "beta"]),
  artifactUrl: z.url().refine((value) => value.startsWith("https://")),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  publishedAt: z.iso.datetime(),
}).strict();

const manifestSchema = payloadSchema.extend({
  algorithm: z.literal("Ed25519"),
  signature: z.string().min(32),
}).strict();

export type UpdateManifest = z.infer<typeof manifestSchema>;

export function verifyUpdateManifest(input: {
  manifest: unknown;
  channel: string;
  publicKey: KeyLike;
}) {
  const manifest = manifestSchema.parse(input.manifest);
  if (manifest.channel !== input.channel) throw new Error("EDGE_UPDATE_CHANNEL_MISMATCH");
  const payload = {
    version: manifest.version,
    channel: manifest.channel,
    artifactUrl: manifest.artifactUrl,
    sha256: manifest.sha256,
    publishedAt: manifest.publishedAt,
  };
  if (!verify(
    null,
    Buffer.from(JSON.stringify(payload)),
    input.publicKey,
    Buffer.from(manifest.signature, "base64url"),
  )) throw new Error("EDGE_UPDATE_SIGNATURE_INVALID");
  return manifest;
}

export async function stageSignedUpdate(input: {
  manifest: unknown;
  channel: string;
  publicKey: KeyLike;
  stagingDir: string;
  fetcher?: typeof fetch;
}) {
  const manifest = verifyUpdateManifest(input);
  await mkdir(input.stagingDir, { recursive: true, mode: 0o700 });
  const partialPath = join(input.stagingDir, `${manifest.version}.zip.partial`);
  const artifactPath = join(input.stagingDir, `${manifest.version}.zip`);
  try {
    const response = await (input.fetcher ?? fetch)(manifest.artifactUrl, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`EDGE_UPDATE_DOWNLOAD_FAILED:${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 250 * 1024 * 1024) throw new Error("EDGE_UPDATE_ARTIFACT_TOO_LARGE");
    const artifact = Buffer.from(await response.arrayBuffer());
    if (artifact.byteLength > 250 * 1024 * 1024) {
      throw new Error("EDGE_UPDATE_ARTIFACT_TOO_LARGE");
    }
    await writeFile(partialPath, artifact, { mode: 0o600, flag: "wx" });
    const digest = createHash("sha256").update(artifact).digest("hex");
    if (digest !== manifest.sha256) throw new Error("EDGE_UPDATE_HASH_MISMATCH");
    await rm(artifactPath, { force: true });
    await rename(partialPath, artifactPath);
    return { manifest, artifactPath };
  } catch (error) {
    await rm(partialPath, { force: true });
    throw error;
  }
}
