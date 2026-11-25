// Ruta interna para Labs: ¿esta cuenta puede usar la IA ahora?
// Labs la consulta antes de contestar un mensaje. Si la prueba gratis venció y no pagó, la IA queda en pausa.
// Solo responde con el token de servicio (nadie de afuera puede preguntar).
import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { isTenantTrialLocked } from "@/server/services/trial/trial-access";

export async function GET(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const tenantId = new URL(request.url).searchParams.get("tenantId")?.trim();
  if (!tenantId) return NextResponse.json({ error: "TENANT_ID_REQUIRED" }, { status: 400 });

  const locked = await isTenantTrialLocked(tenantId);
  return NextResponse.json({ aiAllowed: !locked, reason: locked ? "TRIAL_EXPIRED" : null });
}
