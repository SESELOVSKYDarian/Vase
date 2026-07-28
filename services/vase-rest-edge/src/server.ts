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
import {
  listPrinters,
  queueKitchenTicketPrints,
  savePrinter,
} from "./printing/printer-config.js";
import { NetworkPrinter } from "./printing/network-printer.js";
import { WindowsSpoolerPrinter } from "./printing/usb-printer.js";
import {
  enqueuePrintJob,
  processPrintQueue,
  retryPrintJob,
} from "./printing/print-queue.js";
import { renderEscPosReceipt } from "./printing/receipt-template.js";

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
  if (request.method === "GET" && request.url === "/identity") {
    const identity = database.raw.prepare(`
      SELECT installation_id, certificate_fingerprint
      FROM edge_identity WHERE id = 'current'
    `).get() as {
      installation_id: string; certificate_fingerprint: string;
    } | undefined;
    if (!identity) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "EDGE_NOT_ENROLLED" }));
      return;
    }
    const sync = database.raw.prepare(
      "SELECT value FROM edge_runtime WHERE key = 'last_cloud_sync_at'",
    ).get() as { value: string } | undefined;
    const pending = database.raw.prepare(
      "SELECT COUNT(*) AS count FROM outbox WHERE state = 'PENDING'",
    ).get() as { count: number };
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({
      installationId: identity.installation_id,
      certificateFingerprint: identity.certificate_fingerprint,
      lastCloudSyncAt: sync?.value ?? null,
      pendingEvents: pending.count,
    }));
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
      const identity = database.raw.prepare(`
        SELECT global_tenant_id, branch_id, installation_id, certificate_fingerprint
        FROM edge_identity WHERE id = 'current' AND status = 'ACTIVE'
      `).get() as {
        global_tenant_id: string;
        branch_id: string;
        installation_id: string;
        certificate_fingerprint: string;
      } | undefined;
      if (!identity) throw new Error("EDGE_NOT_ENROLLED");
      const result = await authenticateOfflinePin(database, {
        ...input,
        branchId: identity.branch_id,
        deviceId: identity.installation_id,
        sessionSecret,
      });
      let cloudSessionToken: string | undefined;
      try {
        const fetcher = createMtlsFetch({
          keyPath: config.tlsKeyPath,
          certPath: config.tlsCertPath,
        });
        const cloudResponse = await fetcher(
          new URL("/api/v1/edge/session", config.cloudBaseUrl),
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-vase-edge-installation-id": identity.installation_id,
              "x-vase-client-cert-fingerprint": identity.certificate_fingerprint,
            },
            body: JSON.stringify({
              employeeCode: input.employeeCode,
              pin: input.pin,
            }),
            signal: AbortSignal.timeout(10_000),
          },
        );
        const cloud = await cloudResponse.json().catch(() => ({})) as {
          sessionToken?: string;
          error?: string;
        };
        if (cloudResponse.ok && cloud.sessionToken) {
          cloudSessionToken = cloud.sessionToken;
        } else if ([401, 403, 429].includes(cloudResponse.status)) {
          throw new Error(cloud.error ?? "EDGE_CLOUD_PIN_REJECTED");
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("PIN") ||
            error.message.includes("FORBIDDEN") ||
            error.message.includes("LOCKED"))
        ) throw error;
      }
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ ...result, cloudSessionToken }));
      return;
    }
    if (request.method === "POST" && request.url === "/commands") {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      const input = await body(request);
      const aggregateType = String(input.aggregateType ?? "");
      const capability = aggregateType === "TABLE" ? "tables:write"
        : aggregateType === "ORDER" ? "orders:write"
          : aggregateType === "RESERVATION" ? "orders:write"
            : aggregateType === "CASH_DRAWER" || aggregateType === "PAYMENT"
              ? "cash:operate"
          : aggregateType === "KITCHEN_TICKET" ? "kds:operate"
            : aggregateType === "INVENTORY" ? "inventory:write" : null;
      if (!capability || !session.roles.some((role) =>
        role.branchId === session.branchId && role.capabilities.includes(capability))) {
        throw new Error("EDGE_STAFF_CAPABILITY_FORBIDDEN");
      }
      const result = acceptLocalCommand(database, {
        ...input,
        actorId: session.staffId,
        deviceId: session.deviceId,
      });
      for (const ticket of result.createdTickets ?? []) {
        queueKitchenTicketPrints(database, ticket);
      }
      response.writeHead(202, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }
    if (request.method === "GET" && request.url?.startsWith("/state")) {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      const url = new URL(request.url, `https://${request.headers.host ?? "edge.local"}`);
      const aggregateType = url.searchParams.get("aggregateType");
      if (!aggregateType) throw new Error("EDGE_AGGREGATE_TYPE_REQUIRED");
      const rows = database.raw.prepare(`
        SELECT aggregate_id, version, state_json, updated_at
        FROM aggregate_state WHERE aggregate_type = ? ORDER BY updated_at DESC
      `).all(aggregateType) as Array<{
        aggregate_id: string; version: number; state_json: string; updated_at: string;
      }>;
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({
        branchId: session.branchId,
        aggregates: rows.map((row) => ({
          aggregateId: row.aggregate_id,
          version: row.version,
          state: JSON.parse(row.state_json),
          updatedAt: row.updated_at,
        })),
      }));
      return;
    }
    if (request.url === "/printers" && ["GET", "PUT"].includes(request.method ?? "")) {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      if (!session.roles.some((role) =>
        role.branchId === session.branchId && role.capabilities.includes("settings:write"))) {
        throw new Error("EDGE_STAFF_CAPABILITY_FORBIDDEN");
      }
      if (request.method === "PUT") savePrinter(database, await body(request));
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({
        printers: listPrinters(database).map((printer) => ({
          ...printer,
          connection: printer.connection.type === "NETWORK"
            ? printer.connection
            : {
                type: printer.connection.type,
                printerName: printer.connection.printerName,
              },
        })),
      }));
      return;
    }
    if (request.method === "GET" && request.url === "/print/jobs") {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      if (!session.roles.some((role) =>
        role.branchId === session.branchId &&
        (role.capabilities.includes("settings:write") || role.capabilities.includes("kds:operate")))) {
        throw new Error("EDGE_STAFF_CAPABILITY_FORBIDDEN");
      }
      const jobs = database.raw.prepare(`
        SELECT id, printer_id, state, attempts, next_attempt_at, printed_at, last_error
        FROM print_job ORDER BY next_attempt_at DESC LIMIT 100
      `).all();
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ jobs }));
      return;
    }
    if (request.method === "POST" && request.url === "/print/test") {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      if (!session.roles.some((role) =>
        role.branchId === session.branchId && role.capabilities.includes("settings:write"))) {
        throw new Error("EDGE_STAFF_CAPABILITY_FORBIDDEN");
      }
      const input = await body(request);
      const printerId = String(input.printerId ?? "");
      if (!listPrinters(database).some((printer) => printer.id === printerId && printer.enabled)) {
        throw new Error("EDGE_PRINTER_NOT_FOUND");
      }
      const idempotencyKey = String(input.idempotencyKey ?? "");
      if (!idempotencyKey) throw new Error("EDGE_PRINT_IDEMPOTENCY_REQUIRED");
      const result = enqueuePrintJob(database, {
        id: crypto.randomUUID(),
        idempotencyKey,
        printerId,
        payload: renderEscPosReceipt({
          title: "VASE REST",
          lines: [{ quantity: "1", name: "Prueba de impresion" }],
          footer: new Date().toISOString(),
        }),
      });
      response.writeHead(202, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(result));
      return;
    }
    const retryMatch = request.method === "POST"
      ? request.url?.match(/^\/print\/jobs\/([^/]+)\/retry$/)
      : null;
    if (retryMatch) {
      const session = validateOfflineSession(
        database,
        request.headers.authorization,
        sessionSecret,
      );
      if (!session.roles.some((role) =>
        role.branchId === session.branchId && role.capabilities.includes("settings:write"))) {
        throw new Error("EDGE_STAFF_CAPABILITY_FORBIDDEN");
      }
      retryPrintJob(database, decodeURIComponent(retryMatch[1]));
      response.writeHead(204);
      response.end();
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
    const pending = database.raw.prepare(
      "SELECT COUNT(*) AS count FROM outbox WHERE state = 'PENDING'",
    ).get() as { count: number };
    if (pending.count === 0) {
      cloudResult = await upload([]);
    } else {
      await syncOnce(database, {
        upload: async (events) => {
          cloudResult = await upload(events);
          return cloudResult;
        },
      });
    }
    if (cloudResult) {
      applySnapshots(database, cloudResult.snapshots);
      for (const snapshot of cloudResult.snapshots) {
        if (snapshot.aggregateType === "KITCHEN_TICKET") {
          queueKitchenTicketPrints(database, snapshot.state);
        }
      }
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
    database.raw.prepare(`
      INSERT INTO edge_runtime(key, value, updated_at) VALUES ('last_cloud_sync_at', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(new Date().toISOString(), new Date().toISOString());
  } catch (error) {
    console.error("Edge sync failed", error instanceof Error ? error.message : "UNKNOWN");
  } finally {
    syncing = false;
  }
}
setInterval(() => void backgroundSync(), 5_000).unref();
void backgroundSync();

let printing = false;
async function backgroundPrinting() {
  if (printing) return;
  printing = true;
  try {
    await processPrintQueue(database, {
      resolveAdapter(printerId) {
        const printer = listPrinters(database).find((candidate) =>
          candidate.id === printerId && candidate.enabled);
        if (!printer) throw new Error("EDGE_PRINTER_NOT_FOUND");
        return printer.connection.type === "NETWORK"
          ? new NetworkPrinter(printer.connection)
          : new WindowsSpoolerPrinter(printer.connection);
      },
    });
  } catch (error) {
    console.error("Print queue failed", error instanceof Error ? error.message : "UNKNOWN");
  } finally {
    printing = false;
  }
}
setInterval(() => void backgroundPrinting(), 1_000).unref();
void backgroundPrinting();
