// Avisos automáticos de la prueba gratis. Lo corre el programador de tareas (server/scheduler.ts) cada hora.
// - Un día antes de terminar: aviso en el panel, anuncio y mail.
// - Cuando termina: se frenan los productos hasta que pague (no se borra nada ni se cierra la cuenta),
//   con aviso, anuncio y mail pidiendo el pago.
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { notifyTenant } from "@/server/services/notices/notify-tenant";
import { trialPhase } from "./trial-rules";

const BILLING_URL = "https://app.vase.ar/app/billing";
const BILLING_EMAIL = "facturacion@vase.ar";
/** Si la prueba terminó hace más de esto (cuentas viejas), se avisa solo en el panel, sin mail. */
const EMAIL_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/** ¿Ya se mandó este aviso a la cuenta? */
async function alreadyNotified(tenantId: string, action: string) {
  const found = await prisma.auditLog.findFirst({ where: { tenantId, action }, select: { id: true } });
  return Boolean(found);
}

const emailExtras = {
  button: { label: "Pagar ahora", url: BILLING_URL },
  note: `Este mail sale de una casilla que no recibe respuestas. Si tenés dudas sobre el pago, escribinos a ${BILLING_EMAIL}.`,
  reason: "Te llega porque creaste una cuenta en Vase.",
  replyTo: BILLING_EMAIL,
};

/** Aviso de "tu prueba termina mañana". */
async function warnEnding(tenantId: string, endsAt: Date) {
  await createAuditLog({ action: "trial.ending_notice", targetType: "tenant", targetId: tenantId, tenantId });
  await notifyTenant({
    tenantId,
    title: "Tu prueba gratis termina mañana",
    message: [
      "Te queda un día de prueba en Vase.",
      "Para seguir usando los productos sin cortes, elegí cómo pagar desde Vase › Plan y pagos.",
    ].join("\n"),
    href: "/app/billing",
    tone: "warning",
    category: "trial",
    endsAt,
    announcement: { ctaLabel: "Ver cómo pagar", ctaUrl: "/app/billing" },
    includeBillingEmail: true,
    emailExtras,
  });
}

/** La prueba terminó: se frenan los productos y se pide el pago. */
async function lockExpired(subscriptionId: string, tenantId: string, endedAt: Date, now: Date) {
  await prisma.tenantSubscription.update({ where: { id: subscriptionId }, data: { businessBlockedAt: now } });
  await createAuditLog({ action: "trial.expired", targetType: "tenant_subscription", targetId: subscriptionId, tenantId });
  await notifyTenant({
    tenantId,
    title: "Tu prueba gratis terminó",
    message: [
      "Los productos de Vase quedaron en pausa hasta que pagues. No se borró nada: todo sigue como lo dejaste.",
      "Pagá desde Vase › Plan y pagos y se habilitan al instante.",
    ].join("\n"),
    href: "/app/billing",
    tone: "danger",
    category: "trial",
    announcement: { ctaLabel: "Pagar ahora", ctaUrl: "/app/billing" },
    email: now.getTime() - endedAt.getTime() <= EMAIL_WINDOW_MS,
    includeBillingEmail: true,
    emailExtras,
  });
}

/** Revisa todas las cuentas en prueba y manda lo que toque, una sola vez por cuenta. */
export async function runTrialLifecycle(now = new Date()) {
  const subscriptions = await prisma.tenantSubscription.findMany({
    where: { billingStatus: "TRIAL", isTestAccount: false, trialEndsAt: { not: null } },
    select: { id: true, tenantId: true, billingStatus: true, trialEndsAt: true, isTestAccount: true, businessBlockedAt: true },
  });

  for (const subscription of subscriptions) {
    const phase = trialPhase(subscription, now);
    const endsAt = subscription.trialEndsAt as Date;
    try {
      if (phase === "ending" && !(await alreadyNotified(subscription.tenantId, "trial.ending_notice"))) {
        await warnEnding(subscription.tenantId, endsAt);
      }
      if (phase === "expired" && !subscription.businessBlockedAt) {
        await lockExpired(subscription.id, subscription.tenantId, endsAt, now);
      }
    } catch (error) {
      console.error(`[trial-lifecycle] cuenta ${subscription.tenantId}`, error instanceof Error ? error.message : error);
    }
  }
}
