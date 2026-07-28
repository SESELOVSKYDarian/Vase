import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  stageSignedUpdate,
  verifyUpdateManifest,
} from "../src/updater.js";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

function signedManifest(input: {
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
  channel?: string;
  sha256: string;
}) {
  const payload = {
    version: "1.4.0",
    channel: input.channel ?? "stable",
    artifactUrl: "https://updates.vase.ar/rest-edge/1.4.0.zip",
    sha256: input.sha256,
    publishedAt: "2026-07-28T12:00:00.000Z",
  };
  return {
    ...payload,
    algorithm: "Ed25519" as const,
    signature: sign(
      null,
      Buffer.from(JSON.stringify(payload)),
      input.privateKey,
    ).toString("base64url"),
  };
}

describe("Rest Edge signed updater", () => {
  it("rejects a wrong channel and a modified signature", () => {
    const keys = generateKeyPairSync("ed25519");
    const manifest = signedManifest({
      privateKey: keys.privateKey,
      sha256: "a".repeat(64),
    });
    expect(() => verifyUpdateManifest({
      manifest,
      channel: "beta",
      publicKey: keys.publicKey,
    })).toThrow("EDGE_UPDATE_CHANNEL_MISMATCH");
    expect(() => verifyUpdateManifest({
      manifest: { ...manifest, version: "9.9.9" },
      channel: "stable",
      publicKey: keys.publicKey,
    })).toThrow("EDGE_UPDATE_SIGNATURE_INVALID");
  });

  it("stages a complete artifact only after SHA-256 verification", async () => {
    const keys = generateKeyPairSync("ed25519");
    const artifact = Buffer.from("signed release artifact");
    const sha256 = await import("node:crypto").then(({ createHash }) =>
      createHash("sha256").update(artifact).digest("hex"));
    const manifest = signedManifest({ privateKey: keys.privateKey, sha256 });
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-update-"));
    cleanup.push(dir);
    const result = await stageSignedUpdate({
      manifest,
      channel: "stable",
      publicKey: keys.publicKey,
      stagingDir: dir,
      fetcher: async () => new Response(artifact),
    });
    expect(result.artifactPath.endsWith(".zip")).toBe(true);
    expect(await readFile(result.artifactPath)).toEqual(artifact);
  });

  it("removes partial downloads and preserves the installed version on failure", async () => {
    const keys = generateKeyPairSync("ed25519");
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-update-"));
    cleanup.push(dir);
    await writeFile(join(dir, "installed.version"), "1.3.0");
    const manifest = signedManifest({
      privateKey: keys.privateKey,
      sha256: "b".repeat(64),
    });
    await expect(stageSignedUpdate({
      manifest,
      channel: "stable",
      publicKey: keys.publicKey,
      stagingDir: dir,
      fetcher: async () => new Response("truncated"),
    })).rejects.toThrow("EDGE_UPDATE_HASH_MISMATCH");
    expect(await readFile(join(dir, "installed.version"), "utf8")).toBe("1.3.0");
    await expect(readFile(join(dir, "1.4.0.zip.partial"))).rejects.toThrow();
  });
});
