import type { EdgeConfig } from "./config.js";
import type { EdgeDatabase } from "./db.js";

export function edgeHealth(config: EdgeConfig, database: EdgeDatabase) {
  const identity = database.raw.prepare(
    "SELECT status, installation_id FROM edge_identity WHERE id = 'current'",
  ).get() as { status: string; installation_id: string } | undefined;
  return {
    service: "vase-rest-edge",
    status: identity?.status === "ACTIVE" ? "ok" : "unpaired",
    installationId: identity?.installation_id ?? null,
    checks: {
      sqlite: "ok",
      journalMode: database.pragma("journal_mode"),
      tls: config.tlsKeyPath && config.tlsCertPath ? "ok" : "error",
      enrollment: identity?.status ?? "MISSING",
    },
    timestamp: new Date().toISOString(),
  };
}
