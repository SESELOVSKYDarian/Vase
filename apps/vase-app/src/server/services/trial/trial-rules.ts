// Reglas de la prueba gratis. Sin base de datos: se pueden probar solas.

/** Días que dura la prueba gratis de una cuenta nueva. */
export const TRIAL_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** Fecha en que termina una prueba que empieza en `start`. */
export function trialEndsAtFrom(start: Date) {
  return new Date(start.getTime() + TRIAL_DAYS * DAY);
}

export type TrialSubscription = {
  billingStatus: string;
  trialEndsAt: Date | null;
  isTestAccount: boolean;
};

/**
 * En qué momento de la prueba está la cuenta:
 * - "none": no está en prueba (ya paga, o es cuenta de prueba interna).
 * - "running": en prueba, falta más de un día.
 * - "ending": en prueba, termina dentro de las próximas 24 horas.
 * - "expired": la prueba terminó y no pagó. No puede usar los productos hasta pagar.
 */
export function trialPhase(subscription: TrialSubscription | null | undefined, now: Date) {
  if (!subscription || subscription.isTestAccount || subscription.billingStatus !== "TRIAL" || !subscription.trialEndsAt) {
    return "none" as const;
  }
  const left = subscription.trialEndsAt.getTime() - now.getTime();
  if (left <= 0) return "expired" as const;
  if (left <= DAY) return "ending" as const;
  return "running" as const;
}

/** ¿Hay que frenarle el uso de los productos a esta cuenta? */
export function isTrialLocked(subscription: TrialSubscription | null | undefined, now = new Date()) {
  return trialPhase(subscription, now) === "expired";
}
