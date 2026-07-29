import {
  createHash,
  verify,
  type KeyLike,
} from "node:crypto";
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const payloadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  channel: z.enum(["stable", "beta"]),
  artifactUrl: z.url().refine((value) =>
    value.startsWith("https://") && value.toLowerCase().endsWith(".msi")),
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
  const partialPath = join(input.stagingDir, `${manifest.version}.msi.partial`);
  const artifactPath = join(input.stagingDir, `${manifest.version}.msi`);
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

export async function applyStagedUpdate(input: {
  version: string;
  artifactPath: string;
  installedVersionPath: string;
  install: (artifactPath: string) => Promise<void>;
  healthCheck: () => Promise<boolean>;
  rollback: (previousVersion: string) => Promise<void>;
  healthDeadlineMs: number;
  healthIntervalMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
}) {
  const version = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
    .parse(input.version);
  if (!input.artifactPath.toLowerCase().endsWith(".msi")) {
    throw new Error("EDGE_UPDATE_ARTIFACT_TYPE_INVALID");
  }
  const deadline = z.number().int().positive().max(10 * 60_000)
    .parse(input.healthDeadlineMs);
  const interval = z.number().int().positive().max(deadline)
    .parse(input.healthIntervalMs ?? Math.min(1000, deadline));
  const previousVersion = (await readFile(input.installedVersionPath, "utf8")).trim();
  z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/).parse(previousVersion);
  const wait = input.wait ?? ((milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  await input.install(input.artifactPath);
  const attempts = Math.max(1, Math.ceil(deadline / interval));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await input.healthCheck()) {
      await writeFile(input.installedVersionPath, version, {
        mode: 0o600,
        flush: true,
      });
      return { version, rolledBack: false };
    }
    if (attempt + 1 < attempts) await wait(interval);
  }
  await input.rollback(previousVersion);
  if (!await input.healthCheck()) throw new Error("EDGE_UPDATE_ROLLBACK_FAILED");
  throw new Error("EDGE_UPDATE_HEALTH_FAILED_ROLLED_BACK");
}

export function isNewerVersion(candidate: string, installed: string) {
  const parse = (value: string) => {
    const match = value.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    if (!match) throw new Error("EDGE_UPDATE_VERSION_INVALID");
    return {
      numbers: match.slice(1, 4).map(Number),
      prerelease: match[4] ?? null,
    };
  };
  const left = parse(candidate);
  const right = parse(installed);
  for (let index = 0; index < 3; index += 1) {
    if (left.numbers[index] !== right.numbers[index]) {
      return left.numbers[index]! > right.numbers[index]!;
    }
  }
  if (left.prerelease === right.prerelease) return false;
  if (left.prerelease === null) return true;
  if (right.prerelease === null) return false;
  return left.prerelease.localeCompare(right.prerelease, undefined, {
    numeric: true,
  }) > 0;
}

export function launchWindowsMsiUpdate(input: {
  artifactPath: string;
  version: string;
  stagingDir: string;
}) {
  if (process.platform !== "win32") throw new Error("EDGE_UPDATE_WINDOWS_REQUIRED");
  const scriptPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "scripts",
    "apply-update.ps1",
  );
  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    "-MsiPath",
    input.artifactPath,
    "-LogPath",
    join(input.stagingDir, `${input.version}.install.log`),
    "-TargetVersion",
    input.version,
    "-InstalledVersionPath",
    join(input.stagingDir, "installed.version"),
  ], {
    detached: true,
    windowsHide: true,
    stdio: "ignore",
  });
  child.unref();
  return { pid: child.pid };
}
