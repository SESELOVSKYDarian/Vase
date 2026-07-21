import { createHealthResponse } from "@vase/internal-api";
import { labsPrisma } from "./db";

interface LabsReadinessInput {
  pingDatabase?: () => Promise<unknown>;
  now?: Date;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "UNKNOWN_DATABASE_ERROR";
}

export async function getLabsReadinessPayload(input: LabsReadinessInput = {}) {
  const checks: Record<string, string> = {
    app: "ok",
    database: "mysql-labs",
    redis: process.env.REDIS_URL ? "redis-platform" : "not_configured",
    meta: process.env.META_APP_ID && process.env.META_APP_SECRET ? "configured" : "not_configured",
    openai: "configured_per_assistant",
  };

  try {
    await (input.pingDatabase ?? (() => (labsPrisma as any).$queryRaw`SELECT 1`))();
  } catch (error) {
    checks.database = "error";
    checks.databaseError = getErrorMessage(error);
  }

  return {
    ...createHealthResponse({
      service: "vase-labs",
      domain: "labs.vase.ar",
      checks,
    }),
    status: checks.database === "error" ? "degraded" : "ok",
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}
