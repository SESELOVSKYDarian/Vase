import { createHealthResponse } from "@vase/internal-api";
import { db } from "./db";

interface RestReadinessInput {
  pingDatabase?: () => Promise<unknown>;
  timeoutMs?: number;
  now?: Date;
}

async function withinTimeout(operation: Promise<unknown>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("READINESS_TIMEOUT")), timeoutMs);
  });

  try {
    await Promise.race([operation, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getRestReadinessPayload(input: RestReadinessInput = {}) {
  const checks: Record<string, string> = {
    app: "ok",
    database: "postgres-rest",
    redis: process.env.REDIS_URL ? "redis-platform" : "not_configured",
  };

  try {
    const pingDatabase =
      input.pingDatabase ??
      (() => db.$queryRaw`SELECT 1`);
    await withinTimeout(Promise.resolve().then(pingDatabase), input.timeoutMs ?? 2_000);
  } catch {
    checks.database = "error";
  }

  return {
    ...createHealthResponse({
      service: "vase-rest",
      domain: "rest.vase.ar",
      checks,
    }),
    status: checks.database === "error" ? "degraded" as const : "ok" as const,
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}
