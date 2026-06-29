import { prisma } from "@/lib/db/prisma";
import { appConfig } from "@/config/app";

const processStartedAt = Date.now();

export function getLivenessPayload() {
  return {
    status: "ok" as const,
    service: appConfig.name,
    environment: process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}

export async function getReadinessPayload() {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;

  return {
    ...getLivenessPayload(),
    checks: {
      database: "ok" as const,
    },
    latencyMs: Date.now() - startedAt,
  };
}
