// Datos de "Mi negocio" (app.vase.ar) para que el asistente no tenga que repetirlos en sus instrucciones.
// Nunca frena una respuesta: si app.vase.ar no contesta, el asistente sigue con lo que ya sabe.

export type VaseBusinessProfile = {
  name?: string | null;
  industry?: string | null;
  tagline?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  hours?: string | null;
  socialLinks?: Array<{ network?: string; url?: string; label?: string }>;
  branches?: Array<{ id?: string; name?: string | null; address?: string | null; phone?: string | null; hours?: string | null; isMain?: boolean }>;
  fiscal?: { legalName?: string | null } | null;
};

type FetchLike = typeof fetch;

const CACHE_MS = 60_000;
const TIMEOUT_MS = 3_000;
const cache = new Map<string, { at: number; profile: VaseBusinessProfile | null }>();

export const MI_NEGOCIO_URL = "https://app.vase.ar/app/settings?tab=negocio";

function appOrigin(value?: string) {
  const configured = value?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function clearBusinessProfileCache() {
  cache.clear();
}

export async function fetchBusinessProfile(
  globalTenantId: string,
  options: { fetcher?: FetchLike; env?: NodeJS.ProcessEnv; now?: () => number } = {},
): Promise<VaseBusinessProfile | null> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now;
  const cached = cache.get(globalTenantId);
  if (cached && now() - cached.at < CACHE_MS) return cached.profile;

  const origin = appOrigin(env.APP_INTERNAL_URL);
  const token = env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!origin || !token || !globalTenantId) return null;

  try {
    const url = new URL("/api/internal/business/business-profile", origin);
    url.searchParams.set("globalTenantId", globalTenantId);
    const response = await (options.fetcher ?? fetch)(url, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const profile = response.ok ? (((await response.json()) as { profile?: VaseBusinessProfile }).profile ?? null) : null;
    // Un 404 (todavía no cargó nada) también se guarda para no preguntar en cada mensaje.
    if (response.ok || response.status === 404) cache.set(globalTenantId, { at: now(), profile });
    return profile;
  } catch {
    return cached?.profile ?? null;
  }
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

/** Lo que el asistente lee de Mi negocio, en texto. Vacío si no hay nada cargado. */
export function formatBusinessProfileContext(profile: VaseBusinessProfile | null) {
  if (!profile) return "";
  const lines: string[] = [];
  const add = (label: string, value: unknown) => {
    const clean = text(value);
    if (clean) lines.push(`- ${label}: ${clean}`);
  };
  add("Nombre", profile.name);
  add("Rubro", profile.industry);
  add("Descripcion", profile.tagline);
  add("Horarios", profile.hours);
  add("Telefono", profile.phone);
  add("WhatsApp", profile.whatsapp);
  add("Correo", profile.email);
  add("Sitio web", profile.website);
  add("Razon social", profile.fiscal?.legalName);
  const socials = (profile.socialLinks ?? [])
    .map((link) => text(link.url) && `${text(link.label) ?? text(link.network) ?? "red"} ${text(link.url)}`)
    .filter(Boolean);
  if (socials.length) lines.push(`- Redes: ${socials.join(", ")}`);
  const branches = (profile.branches ?? []).filter((branch) => text(branch.name) || text(branch.address));
  if (branches.length) {
    lines.push("- Sucursales:");
    for (const branch of branches) {
      const parts = [text(branch.address), text(branch.hours) && `horario ${text(branch.hours)}`, text(branch.phone) && `tel ${text(branch.phone)}`].filter(Boolean);
      lines.push(`  - ${text(branch.name) ?? "Sucursal"}${branch.isMain ? " (principal)" : ""}${parts.length ? `: ${parts.join(", ")}` : ""}`);
    }
  }
  if (!lines.length) return "";
  return `Datos del negocio (cargados por el negocio en Mi negocio; son la fuente correcta para horarios, contacto y sucursales):\n${lines.join("\n")}`;
}

export async function buildBusinessProfileContext(globalTenantId: string) {
  return formatBusinessProfileContext(await fetchBusinessProfile(globalTenantId));
}

export type BusinessProfileChange =
  | { action: "contact"; data: Record<string, string> }
  | { action: "saveBranch"; data: { id?: string; name: string; address: string; phone: string; hours: string; isMain: boolean } }
  | { action: "deleteBranch"; data: { id: string } };

/** Guarda un cambio de Mi negocio en app.vase.ar. app decide si la persona puede (solo el Dueño). */
export async function changeBusinessProfile(
  globalTenantId: string,
  actorUserId: string,
  change: BusinessProfileChange,
  options: { fetcher?: FetchLike; env?: NodeJS.ProcessEnv } = {},
): Promise<{ ok: boolean; message: string; status: number }> {
  const env = options.env ?? process.env;
  const origin = appOrigin(env.APP_INTERNAL_URL);
  const token = env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!origin || !token) return { ok: false, message: "Mi negocio no está disponible ahora.", status: 503 };
  try {
    const response = await (options.fetcher ?? fetch)(new URL("/api/internal/business/business-profile/manage", origin), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ globalTenantId, actorUserId, ...change }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    cache.delete(globalTenantId);
    return { ok: response.ok, message: body.message ?? (response.ok ? "Guardado." : "No pudimos guardar."), status: response.status };
  } catch {
    return { ok: false, message: "No pudimos guardar. Probá de nuevo.", status: 502 };
  }
}
