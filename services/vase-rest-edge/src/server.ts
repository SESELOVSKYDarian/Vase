import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:https";
import { readEdgeConfig } from "./config.js";
import { openEdgeDatabase } from "./db.js";
import { edgeHealth } from "./health.js";
import { enrollEdge } from "./enrollment.js";
import { authenticateOfflinePin } from "./pin-session.js";
import { ensureLocalSecret } from "./certificates.js";

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
