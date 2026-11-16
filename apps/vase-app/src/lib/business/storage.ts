// Topes de espacio de una web según el plan, y cuentas para mostrarlos.
import type { PlanSnapshot } from "@/lib/business/plans";

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type StorageLimits = { maxImages: number; maxBytes: number };

export type StorageBreakdown = { images: number; catalog: number; orders: number; design: number };

/** A partir de este porcentaje se avisa al cliente. */
export const STORAGE_ALERT_PERCENT = 85;
/** Por debajo de este porcentaje el aviso se "rearma" para la próxima vez. */
export const STORAGE_ALERT_RESET_PERCENT = 75;

export function getStorageLimits(plan: Pick<PlanSnapshot, "plan" | "premiumEnabled">): StorageLimits {
  if (plan.plan === "PREMIUM" || plan.premiumEnabled) return { maxImages: 3000, maxBytes: 5 * GB };
  return { maxImages: 500, maxBytes: 1 * GB };
}

export const percentOf = (used: number, max: number) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0);

/** El porcentaje que manda es el más alto entre cantidad de imágenes y espacio. */
export function storagePercent(usage: { imageCount: number; totalBytes: number }, limits: StorageLimits) {
  return Math.max(percentOf(usage.imageCount, limits.maxImages), percentOf(usage.totalBytes, limits.maxBytes));
}

/** 1536 -> "1,5 KB"; 1073741824 -> "1 GB". */
export function formatBytes(bytes: number) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value >= GB) return `${trim(value / GB)} GB`;
  if (value >= MB) return `${Math.round(value / MB)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

const trim = (value: number) => value.toLocaleString("es-AR", { maximumFractionDigits: 1 });

export const formatCount = (value: number) => Math.max(0, Math.round(value)).toLocaleString("es-AR");
