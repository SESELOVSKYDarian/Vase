import type { Prisma } from "../generated/prisma";
import { labsPrisma } from "./db";

type ProjectionRecord = {
  globalTenantId: string;
  businessOrderId: string;
  version: number;
};

type ProjectionRepository = {
  findByBusinessOrderId(globalTenantId: string, businessOrderId: string): Promise<ProjectionRecord | null>;
  upsert(input: ReturnType<typeof normalizeBusinessOrderSnapshot> & { globalTenantId: string; assistantId?: string | null; conversationId?: string | null; version: number }): Promise<unknown>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(value: unknown, fallback = new Date(0)) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeEmail(value: unknown) {
  const normalized = text(value).toLowerCase();
  return normalized || null;
}

function normalizePhone(value: unknown) {
  const normalized = text(value).replace(/\D/g, "");
  return normalized || null;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function normalizeBusinessOrderSnapshot(raw: Record<string, unknown>) {
  const updatedAt = date(raw.updatedAt ?? raw.businessUpdatedAt, new Date());
  const createdAt = raw.createdAt ? date(raw.createdAt) : null;
  return {
    businessOrderId: text(raw.id ?? raw.businessOrderId),
    orderNumber: text(raw.orderNumber ?? raw.order_number),
    status: text(raw.status) || "UNKNOWN",
    channel: text(raw.orderChannel ?? raw.channel).toUpperCase() || "WEB",
    currency: text(raw.currency).toUpperCase() || "ARS",
    subtotalAmount: amount(raw.subtotalAmount),
    shippingAmount: amount(raw.shippingAmount),
    totalAmount: amount(raw.totalAmount),
    customerName: text(raw.customerName) || null,
    customerEmail: text(raw.customerEmail) || null,
    customerEmailNormalized: normalizeEmail(raw.customerEmail),
    customerPhone: text(raw.customerPhone) || null,
    customerPhoneNormalized: normalizePhone(raw.customerPhone),
    items: Array.isArray(raw.items) ? raw.items : [],
    rawSnapshot: raw,
    businessUpdatedAt: updatedAt,
    businessCreatedAt: createdAt,
  };
}

export async function upsertBusinessOrderProjection(
  input: { globalTenantId: string; assistantId?: string | null; conversationId?: string | null; version?: number; order: Record<string, unknown> },
  repository: ProjectionRepository = prismaBusinessOrderProjectionRepository,
) {
  const normalized = normalizeBusinessOrderSnapshot(input.order);
  if (!normalized.businessOrderId) return { processed: false as const, reason: "ORDER_ID_REQUIRED" as const };
  const version = input.version ?? Math.max(1, Math.floor(normalized.businessUpdatedAt.getTime() / 1000));
  const existing = await repository.findByBusinessOrderId(input.globalTenantId, normalized.businessOrderId);
  if (existing && existing.version >= version) {
    return { processed: false as const, reason: "STALE_VERSION" as const };
  }
  await repository.upsert({
    ...normalized,
    globalTenantId: input.globalTenantId,
    assistantId: input.assistantId ?? null,
    conversationId: input.conversationId ?? null,
    version,
  });
  return { processed: true as const };
}

export const prismaBusinessOrderProjectionRepository: ProjectionRepository = {
  findByBusinessOrderId(globalTenantId, businessOrderId) {
    return labsPrisma.businessOrderProjection.findUnique({
      where: { globalTenantId_businessOrderId: { globalTenantId, businessOrderId } },
      select: { globalTenantId: true, businessOrderId: true, version: true },
    });
  },
  upsert(input) {
    return labsPrisma.businessOrderProjection.upsert({
      where: { globalTenantId_businessOrderId: { globalTenantId: input.globalTenantId, businessOrderId: input.businessOrderId } },
      update: {
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        orderNumber: input.orderNumber,
        status: input.status,
        channel: input.channel,
        currency: input.currency,
        subtotalAmount: input.subtotalAmount,
        shippingAmount: input.shippingAmount,
        totalAmount: input.totalAmount,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerEmailNormalized: input.customerEmailNormalized,
        customerPhone: input.customerPhone,
        customerPhoneNormalized: input.customerPhoneNormalized,
        items: asJson(input.items),
        rawSnapshot: asJson(input.rawSnapshot),
        version: input.version,
        businessUpdatedAt: input.businessUpdatedAt,
        businessCreatedAt: input.businessCreatedAt,
        lastSyncedAt: new Date(),
      },
      create: {
        globalTenantId: input.globalTenantId,
        assistantId: input.assistantId,
        conversationId: input.conversationId,
        businessOrderId: input.businessOrderId,
        orderNumber: input.orderNumber,
        status: input.status,
        channel: input.channel,
        currency: input.currency,
        subtotalAmount: input.subtotalAmount,
        shippingAmount: input.shippingAmount,
        totalAmount: input.totalAmount,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerEmailNormalized: input.customerEmailNormalized,
        customerPhone: input.customerPhone,
        customerPhoneNormalized: input.customerPhoneNormalized,
        items: asJson(input.items),
        rawSnapshot: asJson(input.rawSnapshot),
        version: input.version,
        businessUpdatedAt: input.businessUpdatedAt,
        businessCreatedAt: input.businessCreatedAt,
      },
    });
  },
};
