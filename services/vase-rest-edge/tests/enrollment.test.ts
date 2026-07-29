import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openEdgeDatabase } from "../src/db.js";
import { certificateFingerprint, protectPrivateKey } from "../src/certificates.js";
import { enrollEdge } from "../src/enrollment.js";

const cleanup: string[] = [];
afterEach(async () => {
  for (const path of cleanup.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("Rest Edge enrollment", () => {
  it("verifies the pinned cloud signature and persists enrollment once", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-enroll-"));
    cleanup.push(dir);
    const certPath = join(dir, "server.crt");
    await writeFile(certPath, "test-certificate");
    const fingerprint = certificateFingerprint(certPath);
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const database = openEdgeDatabase({ dataDir: dir });
    const payload = {
      globalTenantId: "tenant_1", branchId: "branch_1", installationId: "edge_1",
      certificateFingerprint: fingerprint,
      capabilities: ["sync:push"], syncUrl: "https://rest.vase.ar/api/v1/sync",
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const signature = sign(null, Buffer.from(JSON.stringify(payload)), privateKey)
      .toString("base64url");
    const fetcher = vi.fn(async () => Response.json({
      payload, signature, algorithm: "Ed25519",
    }));
    await expect(enrollEdge({
      database, code: "ABCDEFGH", certificatePath: certPath,
      cloudBaseUrl: "https://rest.vase.ar",
      cloudPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      fetcher,
    })).resolves.toMatchObject({ installationId: "edge_1" });
    await expect(enrollEdge({
      database, code: "ABCDEFGH", certificatePath: certPath,
      cloudBaseUrl: "https://rest.vase.ar",
      cloudPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      fetcher,
    })).rejects.toThrow("EDGE_ALREADY_ENROLLED");
    database.close();
  });

  it("rejects signature and certificate pin mismatches and protects private keys", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rest-edge-enroll-"));
    cleanup.push(dir);
    const keyPath = join(dir, "device.key");
    const certPath = join(dir, "server.crt");
    await writeFile(keyPath, "private");
    await writeFile(certPath, "certificate");
    await protectPrivateKey(keyPath);
    const { publicKey } = generateKeyPairSync("ed25519");
    const database = openEdgeDatabase({ dataDir: dir });
    const fetcher = async () => Response.json({
      payload: {
        globalTenantId: "t", branchId: "b", installationId: "e",
        certificateFingerprint: "SHA256:WRONG",
        capabilities: [], syncUrl: "https://rest.vase.ar/api/v1/sync",
        issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      signature: "invalid", algorithm: "Ed25519",
    });
    await expect(enrollEdge({
      database, code: "ABCDEFGH", certificatePath: certPath,
      cloudBaseUrl: "https://rest.vase.ar",
      cloudPublicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      fetcher,
    })).rejects.toThrow("EDGE_ENROLLMENT_SIGNATURE_INVALID");
    database.close();
  });
});
