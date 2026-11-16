// Espacio y copia de seguridad de la web de una cuenta. Los datos viven en Vase Business:
// acá se piden, se guardan para mostrarlos rápido y se avisa cuando la web se está llenando.
import { BUSINESS_EDITOR_ORIGIN } from "@/lib/business/links";
import { getEffectivePlan } from "@/lib/business/plans";
import {
  STORAGE_ALERT_PERCENT,
  STORAGE_ALERT_RESET_PERCENT,
  getStorageLimits,
  storagePercent,
  type StorageBreakdown,
} from "@/lib/business/storage";
import { prisma } from "@/lib/db/prisma";

export type StorageBackup = { id: string; kind: string; sizeBytes: number; rowCount: number; createdAt: string };

export type StorageReport = {
  imageCount: number;
  totalBytes: number;
  breakdown: StorageBreakdown;
  lastBackupAt: Date | null;
  lastBackupBytes: number;
};

const emptyBreakdown: StorageBreakdown = { images: 0, catalog: 0, orders: 0, design: 0 };

function businessUrl(path: string) {
  const base = (process.env.BUSINESS_INTERNAL_URL || BUSINESS_EDITOR_ORIGIN).replace(/\/+$/, "");
  return `${base}/api/internal/storage/${path}`;
}

async function callBusiness<T>(path: string, init?: { method?: string; body?: unknown; timeoutMs?: number }): Promise<T> {
  const token = String(process.env.SERVICE_TO_SERVICE_TOKEN ?? "").trim();
  if (!token) throw new Error("SERVICE_TOKEN_MISSING");
  const response = await fetch(businessUrl(path), {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(init?.timeoutMs ?? 12_000),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload?.error || `business_${response.status}`);
  return payload;
}

async function getLimits(tenantId: string) {
  const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  return getStorageLimits(getEffectivePlan(subscription));
}

/**
 * Guarda lo que ocupa la web y, si pasó el 85%, deja un aviso en las notificaciones de la cuenta.
 * El aviso se manda una sola vez: se vuelve a mandar solo si el uso baja y vuelve a subir.
 */
export async function recordStorageUsage(tenantId: string, report: StorageReport) {
  const limits = await getLimits(tenantId);
  const percent = storagePercent(report, limits);
  const previous = await prisma.businessStorageUsage.findUnique({ where: { tenantId }, select: { alertedPercent: true } });
  const alreadyAlerted = (previous?.alertedPercent ?? 0) >= STORAGE_ALERT_PERCENT;
  const mustAlert = percent >= STORAGE_ALERT_PERCENT && !alreadyAlerted;
  const alertedPercent = mustAlert ? percent : percent < STORAGE_ALERT_RESET_PERCENT ? 0 : (previous?.alertedPercent ?? 0);

  const data = {
    imageCount: report.imageCount,
    totalBytes: BigInt(Math.round(report.totalBytes)),
    breakdown: report.breakdown,
    lastBackupAt: report.lastBackupAt,
    lastBackupBytes: BigInt(Math.round(report.lastBackupBytes)),
    alertedPercent,
    reportedAt: new Date(),
  };
  await prisma.businessStorageUsage.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });

  if (mustAlert) {
    await prisma.adminNotification.create({
      data: {
        title: `Tu web usa el ${percent}% del espacio de tu plan`,
        message: "Cuando llegue al 100% no vas a poder subir más imágenes. Podés borrar las que no uses o mejorar tu plan.",
        href: "/app/business",
        tone: "warning",
        category: "business",
        target: "TENANT",
        tenantId,
        isActive: true,
        startsAt: new Date(),
      },
    });
  }

  return { limits, percent, blocked: percent >= 100 };
}

type BusinessStorageResponse = {
  usage: { imageCount: number; totalBytes: number; breakdown: StorageBreakdown };
  backups: StorageBackup[];
  restoreEnabled: boolean;
};

/**
 * Lo que se muestra en "Tu plan": uso, topes y copias. Pide el dato fresco a Business; si Business
 * no contesta, muestra lo último que informó.
 */
export async function getBusinessStorage(tenantId: string) {
  const limits = await getLimits(tenantId);
  try {
    const live = await callBusiness<BusinessStorageResponse>(encodeURIComponent(tenantId));
    const main = live.backups.find((backup) => backup.kind !== "pre_restore") ?? null;
    await recordStorageUsage(tenantId, {
      ...live.usage,
      lastBackupAt: main ? new Date(main.createdAt) : null,
      lastBackupBytes: main?.sizeBytes ?? 0,
    }).catch(() => null);
    return { limits, usage: live.usage, backups: live.backups, restoreEnabled: live.restoreEnabled, state: "live" as const };
  } catch (error) {
    const noStore = error instanceof Error && error.message === "store_not_found";
    const saved = noStore ? null : await prisma.businessStorageUsage.findUnique({ where: { tenantId } });
    const backups: StorageBackup[] = saved?.lastBackupAt
      ? [{ id: "", kind: "weekly", sizeBytes: Number(saved.lastBackupBytes), rowCount: 0, createdAt: saved.lastBackupAt.toISOString() }]
      : [];
    return {
      limits,
      usage: {
        imageCount: saved?.imageCount ?? 0,
        totalBytes: Number(saved?.totalBytes ?? 0),
        breakdown: (saved?.breakdown as StorageBreakdown | null) ?? emptyBreakdown,
      },
      backups,
      restoreEnabled: false,
      state: noStore ? ("empty" as const) : ("offline" as const),
    };
  }
}

/** Hace una copia ahora (reemplaza a la última). Puede tardar en webs pesadas. */
export function createBusinessBackup(tenantId: string) {
  return callBusiness<{ backup: StorageBackup }>(`${encodeURIComponent(tenantId)}/backup`, { method: "POST", timeoutMs: 120_000 });
}

/** Deja la web como estaba en la copia. Business guarda antes una copia del estado actual. */
export function restoreBusinessBackup(tenantId: string, backupId: string) {
  return callBusiness<{ restoredBackupId: string }>(`${encodeURIComponent(tenantId)}/restore`, {
    method: "POST",
    body: { backupId },
    timeoutMs: 180_000,
  });
}
