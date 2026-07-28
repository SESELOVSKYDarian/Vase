import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:https";
import { readEdgeConfig } from "./config.js";
import { openEdgeDatabase } from "./db.js";
import { edgeHealth } from "./health.js";
import { enrollEdge } from "./enrollment.js";
import { authenticateOfflinePin, validateOfflineSession } from "./pin-session.js";
import { ensureLocalSecret } from "./certificates.js";
import { acceptLocalCommand } from "./events.js";
import {
  applySignedConfigDelta,
  applySnapshots,
  createCloudUploader,
  syncOnce,
} from "./sync-client.js";
import { createMtlsFetch } from "./mtls-fetch.js";
import { syncStaffProjection } from "./staff-projection.js";

const config = readEdgeConfig(process.env);
const database = openEdgeDatabase(config);
const sessionSecret = ensureLocalSecret(join(config.dataDir, "session.secret"));

async function body(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new Error("EDGE_REQUEST_TOO_LARGE");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}
const server = createServer({
  key: readFileSync(config.tlsKeyPath),
  cert: readFileSync(config.tlsCertPath),
}, async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    const health = edgeHealth(config, database);
    response.writeHead(health.status === "ok" ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(health));
    return;
  }
  try {
    if (request.method === "POST" && request.url === "/enroll") {
      const input = await body(request);
      const result = await enrollEdge({
        database,
        code: String(input.code ?? ""),
        certificatePath: config.tlsCertPath,
        cloudBaseUrl: config.cloudBaseUrl,
        cloudPublicKey: readFileSync(config.cloudPublicKeyPath, "utf8"),
      });
      response.writeHead(201, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }
    if (request.method === "POST" && request.url === "/access/pin") {
      const input = await body(request);
      const result = await authenticateOfflinePin(database, {
        ...input,
        sessionSecret,
      });
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }
    if (request.method === "POST" && request.url === "/commands") {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      const input = await body(request);
      const result = acceptLocalCommand(database, {
        ...input,
        actorId: session.staffId,
        deviceId: session.deviceId,
      });
      response.writeHead(202, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "EDGE_REQUEST_FAILED";
    response.writeHead(code.includes("PIN") ? 401 : 400, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ error: code }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "NOT_FOUND" }));
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
server.listen(config.port, config.host);

let syncing = false;
async function backgroundSync() {
  if (syncing || !existsSync(config.cloudPublicKeyPath)) return;
  const identity = database.raw.prepare(`
    SELECT global_tenant_id, branch_id, installation_id, certificate_fingerprint
    FROM edge_identity WHERE id = 'current' AND status = 'ACTIVE'
  `).get() as {
    global_tenant_id: string; branch_id: string; installation_id: string;
    certificate_fingerprint: string;
  } | undefined;
  if (!identity) return;
  syncing = true;
  try {
    const cloudPublicKey = readFileSync(config.cloudPublicKeyPath, "utf8");
    const fetcher = createMtlsFetch({
      keyPath: config.tlsKeyPath,
      certPath: config.tlsCertPath,
    });
    const upload = createCloudUploader({
      globalTenantId: identity.global_tenant_id,
      branchId: identity.branch_id,
      installationId: identity.installation_id,
      certificateFingerprint: identity.certificate_fingerprint,
      syncUrl: new URL("/api/v1/edge/sync", config.cloudBaseUrl).toString(),
      fetcher,
    });
    let cloudResult: Awaited<ReturnType<typeof upload>> | undefined;
    await syncOnce(database, {
      upload: async (events) => {
        cloudResult = await upload(events);
        return cloudResult;
      },
    });
    if (cloudResult) {
      applySnapshots(database, cloudResult.snapshots);
      if (cloudResult.configDelta.algorithm !== "Ed25519") {
        throw new Error("EDGE_CONFIG_SIGNATURE_INVALID");
      }
      applySignedConfigDelta(database, {
        payload: cloudResult.configDelta.payload,
        signature: cloudResult.configDelta.signature,
        cloudPublicKey,
      });
    }
    await syncStaffProjection({
      database,
      cloudBaseUrl: config.cloudBaseUrl,
      cloudPublicKey,
      installationId: identity.installation_id,
      certificateFingerprint: identity.certificate_fingerprint,
      fetcher,
    }).catch((error) => {
      if (!(error instanceof Error && error.message === "EDGE_STAFF_PROJECTION_STALE")) throw error;
    });
  } catch (error) {
    console.error("Edge sync failed", error instanceof Error ? error.message : "UNKNOWN");
  } finally {
    syncing = false;
  }
}
setInterval(() => void backgroundSync(), 5_000).unref();
void backgroundSync();
