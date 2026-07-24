import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  type LabsOrderCreateRequest,
  type LabsOrderQuoteRequest,
  labsOrderCreateRequestSchema,
  labsOrderQuoteRequestSchema,
} from "@vase/contracts";
import { prisma } from "@/lib/db/prisma";
import { type CheckoutItemInput, validateCheckoutItems } from "@/server/services/business/checkout";
import { createOrderFromCheckout } from "@/server/services/business/orders";
import { listShippingBranchesByTenant, listShippingZonesByTenant } from "@/server/queries/business/shipping";
import { listOrdersByTenant } from "@/server/queries/business/orders";

type Tenant = { id: string };

type CheckoutResult = Awaited<ReturnType<typeof validateCheckoutItems>>;
type CreatedOrderResult = Awaited<ReturnType<typeof createOrderFromCheckout>>;

export type LabsBusinessOrderDependencies = {
  findTenant(globalTenantId: string): Promise<Tenant | null>;
  validateCheckoutItems(input: Parameters<typeof validateCheckoutItems>[0]): Promise<CheckoutResult>;
  listShippingBranchesByTenant(tenantId: string): Promise<Array<Record<string, unknown>>>;
  listShippingZonesByTenant(tenantId: string): Promise<Array<Record<string, unknown>>>;
  createOrderFromCheckout(input: Parameters<typeof createOrderFromCheckout>[0]): Promise<CreatedOrderResult>;
  findOrderByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<unknown | null>;
};

const defaultDependencies: LabsBusinessOrderDependencies = {
  findTenant: (globalTenantId) => prisma.tenant.findUnique({ where: { id: globalTenantId }, select: { id: true } }),
  validateCheckoutItems,
  listShippingBranchesByTenant,
  listShippingZonesByTenant,
  createOrderFromCheckout,
  findOrderByIdempotencyKey: async (tenantId, idempotencyKey) => {
    const needle = `"labsOrderIdempotencyKey":"${escapeJsonNeedle(idempotencyKey)}"`;
    return prisma.order.findFirst({
      where: { tenantId, notes: { contains: needle } },
      include: { items: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  },
};

function escapeJsonNeedle(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function numberValue(value: unknown) {
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]),
  );
}

function quotePayload(input: LabsOrderQuoteRequest, checkout: Extract<CheckoutResult, { valid: true }>) {
  return stable({
    channel: normalizeLabsOrderChannel(input.channel),
    currency: checkout.currency,
    fulfillment: input.fulfillment ?? null,
    items: checkout.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.totalAmount,
      sku: item.sku,
    })),
    shippingAmount: checkout.shippingAmount,
    shippingQuote: checkout.shippingQuote,
    subtotal: checkout.subtotal,
    total: checkout.total,
  });
}

function hashQuote(input: LabsOrderQuoteRequest, checkout: Extract<CheckoutResult, { valid: true }>) {
  const payload = quotePayload(input, checkout);
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function quoteVersion(checkout: Extract<CheckoutResult, { valid: true }>) {
  return Math.max(1, Math.floor(checkout.total * 100), checkout.items.length);
}

async function requireTenant(globalTenantId: string, deps: Pick<LabsBusinessOrderDependencies, "findTenant">) {
  const tenant = await deps.findTenant(globalTenantId);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  return tenant;
}

export function normalizeLabsOrderChannel(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "whatsapp") return "whatsapp";
  if (normalized === "instagram") return "instagram";
  if (normalized === "messenger") return "messenger";
  return "web";
}

export async function listLabsFulfillmentOptions(
  input: { globalTenantId: string },
  deps: LabsBusinessOrderDependencies = defaultDependencies,
) {
  const tenant = await requireTenant(input.globalTenantId, deps);
  const [branches, deliveryZones] = await Promise.all([
    deps.listShippingBranchesByTenant(tenant.id),
    deps.listShippingZonesByTenant(tenant.id),
  ]);

  return {
    globalTenantId: tenant.id,
    branches: branches.map((branch) => ({
      id: String(branch.id),
      name: String(branch.name ?? ""),
      address: typeof branch.address === "string" ? branch.address : null,
      hours: typeof branch.hours === "string" ? branch.hours : null,
      phone: typeof branch.phone === "string" ? branch.phone : null,
      pickupFee: numberValue(branch.pickupFee),
    })),
    deliveryZones: deliveryZones.map((zone) => ({
      id: String(zone.id),
      branchId: typeof zone.branchId === "string" ? zone.branchId : null,
      name: String(zone.name ?? ""),
      description: typeof zone.description === "string" ? zone.description : null,
      type: String(zone.type ?? ""),
      price: numberValue(zone.price),
      enabled: Boolean(zone.enabled ?? true),
    })),
  };
}

export async function buildLabsOrderQuote(
  rawInput: LabsOrderQuoteRequest,
  deps: LabsBusinessOrderDependencies = defaultDependencies,
) {
  const input = labsOrderQuoteRequestSchema.parse(rawInput);
  const tenant = await requireTenant(input.globalTenantId, deps);
  const checkout = await deps.validateCheckoutItems({
    tenantId: tenant.id,
    customerType: input.customerType,
    items: input.items as CheckoutItemInput[],
    shippingCustomer: input.fulfillment?.type === "PICKUP" ? undefined : input.customer,
    preferredBranchId: input.fulfillment?.branchId,
  });

  if (!checkout.valid) {
    return {
      valid: false as const,
      errors: checkout.errors,
      currency: "currency" in checkout ? checkout.currency : "ARS",
      subtotal: "subtotal" in checkout ? checkout.subtotal : 0,
      shippingAmount: "shippingAmount" in checkout ? checkout.shippingAmount : 0,
      total: "total" in checkout ? checkout.total : 0,
    };
  }

  return {
    valid: true as const,
    globalTenantId: tenant.id,
    quoteVersion: quoteVersion(checkout),
    quoteHash: hashQuote(input, checkout),
    currency: checkout.currency,
    subtotal: checkout.subtotal,
    shippingAmount: checkout.shippingAmount,
    total: checkout.total,
    items: checkout.items,
    shippingQuote: checkout.shippingQuote,
  };
}

export async function createLabsOrderFromConfirmedQuote(
  rawInput: LabsOrderCreateRequest,
  deps: LabsBusinessOrderDependencies = defaultDependencies,
) {
  const input = labsOrderCreateRequestSchema.parse(rawInput);
  const tenant = await requireTenant(input.globalTenantId, deps);
  const existing = await deps.findOrderByIdempotencyKey(tenant.id, input.idempotencyKey);
  if (existing) return { idempotent: true as const, order: existing };

  const quote = await buildLabsOrderQuote(input, deps);
  if (!quote.valid) return { idempotent: false as const, error: "invalid_quote" as const, details: quote.errors };
  if (quote.quoteVersion !== input.quoteVersion || quote.quoteHash !== input.quoteHash) {
    return { idempotent: false as const, error: "quote_changed" as const, quote };
  }

  const notes = JSON.stringify({
    source: "vase-labs",
    labsOrderIdempotencyKey: input.idempotencyKey,
    customerNotes: input.notes ?? null,
  });
  const result = await deps.createOrderFromCheckout({
    tenantId: tenant.id,
    customerType: input.customerType,
    items: input.items as CheckoutItemInput[],
    customer: input.customer,
    preferredBranchId: input.fulfillment?.branchId,
    requestedOrderChannel: normalizeLabsOrderChannel(input.channel),
    requestedCheckoutMethod: "manual",
    notes,
  });

  if ("error" in result) return { idempotent: false as const, ...result };
  return { idempotent: false as const, order: result.order, checkout: result.checkout };
}

export async function listLabsOrderSnapshot(
  input: { globalTenantId: string; since?: string; limit?: number },
  deps: Pick<LabsBusinessOrderDependencies, "findTenant"> & { listOrdersByTenant(tenantId: string): Promise<unknown[]> } = {
    findTenant: defaultDependencies.findTenant,
    listOrdersByTenant,
  },
) {
  const tenant = await requireTenant(input.globalTenantId, deps);
  const since = input.since ? new Date(input.since) : null;
  const orders = await deps.listOrdersByTenant(tenant.id);
  return {
    globalTenantId: tenant.id,
    orders: orders
      .filter((order) => {
        if (!since) return true;
        const updatedAt = (order as { updatedAt?: Date }).updatedAt;
        return updatedAt instanceof Date && updatedAt >= since;
      })
      .slice(0, input.limit ?? 100),
  };
}

export type LabsBusinessOrderQuote = Awaited<ReturnType<typeof buildLabsOrderQuote>>;
export type LabsBusinessOrderCreateResult = Awaited<ReturnType<typeof createLabsOrderFromConfirmedQuote>>;
