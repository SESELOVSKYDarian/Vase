import { NextResponse } from "next/server";
import { resolveLabsRequestContext } from "./request-context";

type GuardDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ context: { tenantSlug: string; globalTenantId: string } }>;
};

/**
 * Las rutas /api/v1/.../[tenantSlug]/... leen o cambian datos de una cuenta (conversaciones, teléfonos
 * de clientes, pases a una persona). Solo responde a quien tiene sesión de Vase en ESA cuenta:
 * sin sesión, 401; con sesión de otra cuenta, 403.
 */
export async function requireTenantAccess(
  request: Request,
  tenantSlug: string,
  deps: GuardDependencies = { resolveContext: resolveLabsRequestContext },
): Promise<{ ok: true; globalTenantId: string } | { ok: false; response: NextResponse }> {
  try {
    const { context } = await deps.resolveContext(request.headers.get("cookie"));
    if (!tenantSlug || tenantSlug !== context.tenantSlug) {
      return { ok: false, response: NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 }) };
    }
    return { ok: true, globalTenantId: context.globalTenantId };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "LABS_SESSION_REQUIRED" }, { status: 401 }) };
  }
}
