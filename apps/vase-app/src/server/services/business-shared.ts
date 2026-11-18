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
    total: number;
    customerName: string | null;
    units: number;
    createdAt: string;
  }>;
};

const TIMEOUT_MS = 6_000;

async function fetchShared<T>(tenantId: string, resource: "catalog" | "customers" | "orders", search?: string): Promise<T | null> {
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
