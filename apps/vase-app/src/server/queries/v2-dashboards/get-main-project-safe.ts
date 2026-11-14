// Parte de v2-dashboards.ts: isMissingProjectStatusColumnError, getProjectCountsSafe, getUpcomingDeliveriesSafe, getMainProjectSafe, startOfDay, endOfDay y más.
import { prisma } from "@/lib/db/prisma";

export function isMissingProjectStatusColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; meta?: { column?: string } };
  return maybeError.code === "P2022" && maybeError.meta?.column === "vase.Project.status";
}

export async function getProjectCountsSafe() {
  try {
    return await prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getUpcomingDeliveriesSafe(now: Date, weekEnd: Date) {
  try {
    return await prisma.project.count({
      where: { dueAt: { gte: now, lt: weekEnd }, status: { in: ["DEPLOYMENT", "TESTING", "DEVELOPMENT"] } },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function getMainProjectSafe(tenantId: string) {
  try {
    return await prisma.project.findFirst({
      where: { tenantId, status: { in: ["DISCOVERY", "DESIGN", "DEVELOPMENT", "TESTING", "DEPLOYMENT", "PENDING"] } },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        updates: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { actorUser: { select: { name: true } } },
        },
      },
    });
  } catch (error) {
    if (isMissingProjectStatusColumnError(error)) {
      return null;
    }
    throw error;
  }
}

export function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date = new Date()) {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}
