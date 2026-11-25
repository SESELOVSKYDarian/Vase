// Consulta a la base si una cuenta tiene la prueba vencida y sin pagar.
// La usan todas las puertas de entrada a los productos (Business, Labs, Management, Rest y el panel).
import { prisma } from "@/lib/db/prisma";
import { isTrialLocked } from "./trial-rules";

/** Error que tiran las puertas de entrada cuando la prueba venció. */
export const TRIAL_EXPIRED = "TRIAL_EXPIRED";

/** true si la cuenta terminó la prueba y todavía no pagó. Si la consulta falla, no bloquea. */
export async function isTenantTrialLocked(tenantId: string) {
  try {
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { billingStatus: true, trialEndsAt: true, isTestAccount: true },
    });
    return isTrialLocked(subscription);
  } catch (error) {
    console.warn("[trial-access] no se pudo revisar la prueba", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Corta con TRIAL_EXPIRED si la cuenta tiene la prueba vencida. */
export async function assertTenantNotTrialLocked(tenantId: string) {
  if (await isTenantTrialLocked(tenantId)) throw new Error(TRIAL_EXPIRED);
}

/**
 * Filtro para las consultas de "¿esta persona puede entrar a este producto?":
 * deja afuera a las cuentas con la prueba vencida y sin pagar (las de prueba interna pasan siempre).
 * Se usa adentro de `tenant: { ... }` en las búsquedas de membresías.
 */
export function notTrialLockedTenantWhere(now = new Date()) {
  return {
    NOT: { subscription: { is: { billingStatus: "TRIAL" as const, isTestAccount: false, trialEndsAt: { lte: now } } } },
  };
}
