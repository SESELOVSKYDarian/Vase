// Cuando una factura de Vase queda pagada (Mercado Pago o transferencia aprobada), la cuenta se pone al día sola:
// el plan pasa a activo, Business se desbloquea si estaba bloqueado por la prueba vencida y, si es un cobro
// mensual, el período se corre un mes.
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";

const MONTHLY = new Set(["HOSTING", "MAINTENANCE", "LABS_MONTHLY"]);

/** Un mes después de la fecha más tardía entre hoy y el fin del período actual. */
export function extendOneMonth(current: Date | null | undefined, now = new Date()) {
  const base = current && current.getTime() > now.getTime() ? new Date(current) : new Date(now);
  const day = base.getDate();
  base.setMonth(base.getMonth() + 1);
  // 31/1 + 1 mes no puede caer en marzo: queda el último día de febrero.
  if (base.getDate() < day) base.setDate(0);
  return base;
}

/** Pone la cuenta al día después de una factura pagada. No falla: si algo sale mal, el pago igual quedó registrado. */
export async function activateAfterPayment(clientPaymentId: string, source: "mercadopago" | "transfer") {
  try {
    const payment = await prisma.clientPayment.findUnique({
      where: { id: clientPaymentId },
      select: { id: true, tenantId: true, category: true, paidAt: true },
    });
    if (!payment?.paidAt) return false;

    const now = new Date();
    const current = await prisma.tenantSubscription.findUnique({ where: { tenantId: payment.tenantId } });
    const monthly = MONTHLY.has(payment.category);
    const periodEnd = monthly ? extendOneMonth(current?.currentPeriodEndsAt, now) : undefined;

    const data = {
      billingStatus: "ACTIVE" as const,
      paidAt: now,
      businessBlockedAt: null,
      graceEndsAt: null,
      temporaryPagesEnabled: true,
      ...(monthly ? { currentPeriodEndsAt: periodEnd, nextBillingAt: periodEnd } : {}),
      ...(payment.category === "HOSTING" ? { hostingEndsAt: extendOneMonth(current?.hostingEndsAt, now) } : {}),
      ...(payment.category === "MAINTENANCE" ? { maintenanceEndsAt: extendOneMonth(current?.maintenanceEndsAt, now) } : {}),
    };

    await prisma.tenantSubscription.upsert({
      where: { tenantId: payment.tenantId },
      update: data,
      create: { tenantId: payment.tenantId, ...data },
    });
    await createAuditLog({
      action: "billing.account_activated",
      targetType: "tenant_subscription",
      targetId: payment.tenantId,
      tenantId: payment.tenantId,
      metadata: { clientPaymentId, source, category: payment.category, wasBlocked: Boolean(current?.businessBlockedAt) },
    });
    return true;
  } catch {
    return false;
  }
}
