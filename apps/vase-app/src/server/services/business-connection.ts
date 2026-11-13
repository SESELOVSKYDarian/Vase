// La conexión con el sistema de gestión del cliente vive en Business (dirección, clave y lo que llegó).
// Mi negocio la pide acá, con el token interno, para mostrarla sin que el cliente entre a Business.

export type BusinessConnection = {
  syncUrl: string | null;
  pingUrl: string | null;
  token: string | null;
  compatibility: { domain: string | null; consumerKey: string | null; consumerSecret: string | null };
  stats: { products: number; lastSyncAt: string | null };
};

const TIMEOUT_MS = 5_000;

function upstream(tenantId: string, suffix = "") {
  const base = process.env.BUSINESS_EDITOR_URL?.trim();
  const token = process.env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!base || !token) return null;
  try {
    const origin = new URL(base);
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return null;
    const url = new URL(`/api/v1/integrations/internal/tenant/${encodeURIComponent(tenantId)}/connection-status${suffix}`, origin.origin);
    return { url, token };
  } catch {
    return null;
  }
}

async function call(tenantId: string, suffix: string, method: "GET" | "POST"): Promise<BusinessConnection | null> {
  const target = upstream(tenantId, suffix);
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(target.url, {
      method,
      headers: { authorization: `Bearer ${target.token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as BusinessConnection;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** null si Business no contesta o la cuenta no tiene Business conectado. */
export function getBusinessConnection(tenantId: string) {
  return call(tenantId, "", "GET");
}

export function rotateBusinessConnectionToken(tenantId: string) {
  return call(tenantId, "/rotate-token", "POST");
}
