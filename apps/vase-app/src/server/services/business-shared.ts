import { BUSINESS_EDITOR_ORIGIN } from "@/lib/business/links";

// Catálogo, Clientes y Pedidos compartidos. Los datos viven en Business; app los pide con el token interno.
// Si Business no contesta o la cuenta no tiene tienda, se devuelve null y la pantalla lo explica.

export type SharedCatalog = {
  total: number;
  outOfStock: number;
  withoutImage: number;
  fromSystem: number;
  lastSyncAt: string | null;
  items: Array<{
    id: string;
    sku: string | null;
    name: string;
    brand: string | null;
    price: number | null;
    stock: number | null;
    hasImage: boolean;
    fromSystem: boolean;
  }>;
};

export type SharedCustomers = {
  total: number;
  items: Array<{
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    wholesale: boolean;
    pending: boolean;
    orders: number;
    lastOrderAt: string | null;
    createdAt: string;
  }>;
};

export type SharedOrders = {
  total: number;
  open: number;
  items: Array<{
    id: string;
    status: string;
    whatsapp: boolean;
    currency: string;
    subtotal: number | null;
    shipping: number | null;
    total: number;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    address: string | null;
    units: number;
    lines: Array<{ sku: string | null; name: string; qty: number; unitPrice: number | null; total: number | null }>;
    createdAt: string;
  }>;
};

const TIMEOUT_MS = 6_000;

async function fetchShared<T>(tenantId: string, resource: "catalog" | "customers" | "orders" | "images", search?: string): Promise<T | null> {
  const base = process.env.BUSINESS_EDITOR_URL?.trim();
  const token = process.env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!base || !token) return null;
  let url: URL;
  try {
    const origin = new URL(base);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return null;
    url = new URL(`/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/shared/${resource}`, origin.origin);
    if (search?.trim()) url.searchParams.set("q", search.trim().slice(0, 80));
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function getSharedCatalog(tenantId: string, search?: string) {
  return fetchShared<SharedCatalog>(tenantId, "catalog", search);
}

export function getSharedCustomers(tenantId: string, search?: string) {
  return fetchShared<SharedCustomers>(tenantId, "customers", search);
}

export function getSharedOrders(tenantId: string) {
  return fetchShared<SharedOrders>(tenantId, "orders");
}

export type SharedImageGroup = "productos" | "paginas" | "marca";

export type SharedImages = {
  total: number;
  items: Array<{ src: string; groups: SharedImageGroup[]; where: string[]; productId: string | null }>;
};

/** Todas las fotos de la tienda. Las direcciones que empiezan con "/" son de Business y se completan con su dominio. */
export async function getSharedImages(tenantId: string): Promise<SharedImages | null> {
  const data = await fetchShared<SharedImages>(tenantId, "images");
  if (!data) return null;
  const origin = BUSINESS_EDITOR_ORIGIN.replace(/\/+$/, "");
  return {
    total: data.total,
    items: data.items.map((item) => ({ ...item, src: item.src.startsWith("/") && !item.src.startsWith("//") ? `${origin}${item.src}` : item.src })),
  };
}

export type SharedWriteResult = { ok: true } | { ok: false; error: string };

async function postShared(tenantId: string, path: string, body: unknown): Promise<SharedWriteResult> {
  const base = process.env.BUSINESS_EDITOR_URL?.trim();
  const token = process.env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!base || !token) return { ok: false, error: "NOT_CONFIGURED" };
  let url: URL;
  try {
    const origin = new URL(base);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return { ok: false, error: "NOT_CONFIGURED" };
    url = new URL(`/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/shared/${path}`, origin.origin);
  } catch {
    return { ok: false, error: "NOT_CONFIGURED" };
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (response.ok) return { ok: true };
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: typeof payload.error === "string" ? payload.error : `HTTP_${response.status}` };
  } catch {
    return { ok: false, error: "UNREACHABLE" };
  }
}

/** Cambia el estado de un pedido. Business devuelve o reserva stock y, si se pide, avisa al cliente. */
export function changeSharedOrderStatus(tenantId: string, orderId: string, input: { status: string; notifyCustomer: boolean; reason?: string }) {
  return postShared(tenantId, `orders/${encodeURIComponent(orderId)}/status`, {
    status: input.status,
    notify_customer: input.notifyCustomer,
    notification_reason: input.reason ?? "",
  });
}

/** Aprueba un cliente o lo pasa a mayorista/minorista. */
export function changeSharedCustomer(tenantId: string, userId: string, input: { status?: "active"; role?: "retail" | "wholesale" }) {
  return postShared(tenantId, `customers/${encodeURIComponent(userId)}`, input);
}