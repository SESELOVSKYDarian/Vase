// Pregunta a la app de Vase si una cuenta puede usar la IA (por ejemplo, si su prueba gratis venció y no pagó, no).
// Guarda la respuesta 5 minutos para no preguntar en cada mensaje.
// Si la app no contesta, deja usar la IA: preferimos no cortar un asistente por un error de red.

const CACHE_MS = 5 * 60 * 1000;

export function createTenantAiAccessChecker(input: {
  appInternalUrl: string | undefined;
  serviceToken: string | undefined;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const fetcher = input.fetcher ?? fetch;
  const now = input.now ?? Date.now;
  const cache = new Map<string, { allowed: boolean; until: number }>();

  /** true si la cuenta puede usar la IA ahora. */
  return async function isAiAllowed(globalTenantId: string) {
    const cached = cache.get(globalTenantId);
    if (cached && cached.until > now()) return cached.allowed;
    if (!input.appInternalUrl || !input.serviceToken) return true;

    try {
      const url = new URL("/api/internal/labs/ai-access", input.appInternalUrl);
      url.searchParams.set("tenantId", globalTenantId);
      const response = await fetcher(url, {
        headers: { authorization: `Bearer ${input.serviceToken}`, accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return true;
      const payload = (await response.json().catch(() => ({}))) as { aiAllowed?: unknown };
      const allowed = payload.aiAllowed !== false;
      cache.set(globalTenantId, { allowed, until: now() + CACHE_MS });
      return allowed;
    } catch {
      return true;
    }
  };
}
