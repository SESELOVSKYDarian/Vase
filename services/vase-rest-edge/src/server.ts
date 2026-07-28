import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { readEdgeConfig } from "./config.js";
import { openEdgeDatabase } from "./db.js";
import { edgeHealth } from "./health.js";

const config = readEdgeConfig(process.env);
const database = openEdgeDatabase(config);
const server = createServer({
  key: readFileSync(config.tlsKeyPath),
  cert: readFileSync(config.tlsCertPath),
}, (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    const health = edgeHealth(config, database);
    response.writeHead(health.status === "ok" ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(health));
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
