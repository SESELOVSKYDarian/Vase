import type { Prisma } from "@prisma/client";

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toOptionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readText(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toInputJsonValue(
  value: unknown,
): Prisma.InputJsonValue | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toInputJsonValue(entry) ?? null);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    const result: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value)) {
      const normalized = toInputJsonValue(entry);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }

    return result;
  }

  return undefined;
}

export function toInputJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject {
  return toInputJsonValue(value) as Prisma.InputJsonObject;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function createOrderNumber(date = new Date()) {
  const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `VASE-${stamp}-${random}`;
}
