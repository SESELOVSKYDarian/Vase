import type { PaymentCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { sendNoticeEmail } from "@/server/services/auth-email";
import { createCheckoutUrl, isMercadoPagoConfigured } from "@/server/services/mercadopago";
import { syncAutoDebitAmount } from "@/server/services/mercadopago-autodebit";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";

/**
 * Cobros que se repiten todos los meses para una cuenta puntual. El día indicado:
 * 1. se carga la factura del mes en Pagos de Vase (la cuenta la ve en Plan y pagos, con link y QR de Mercado Pago);
 * 2. se saca de ahí el link directo de Mercado Pago;
 * 3. se avisa con notificación + anuncio (solo para esa cuenta) + mail desde no-reply@vase.ar, con las
 *    respuestas dirigidas a facturación.
 * Sale una sola vez por mes.
 */
type MonthlyReminder = {
  /** Identificador fijo: se usa para no mandarlo dos veces en el mismo mes. */
  key: string;
  tenantSlug: string;
  /** Día del mes (hora de Argentina) desde el que sale. */
  day: number;
  title: string;
  /** Concepto de la factura (se le agrega el mes). */
  concept: string;
  category: PaymentCategory;
  amount: number;
  /** Alias para pagar por transferencia. */
  transferAlias: string;
};

export const MONTHLY_REMINDERS: readonly MonthlyReminder[] = [
  {
    key: "teflon-labs-ia",
    tenantSlug: "sanitarios-el-teflon",
    day: 26,
    title: "Pago del mes: IA de Vase Labs",
    concept: "IA de Vase Labs",
    category: "LABS_MONTHLY",
    amount: 90000,
    transferAlias: "dariansese",
  },
];

const BILLING_EMAIL = "facturacion@vase.ar";
const BILLING_PAGE = "https://app.vase.ar/app/billing";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

function argentinaToday(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function formatAmount(amount: number) {
  return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount)}`;
}

/** Carga la factura del mes en Pagos (o reusa la que ya esté) y devuelve su link de Mercado Pago. */
async function ensureMonthInvoice(reminder: MonthlyReminder, tenantId: string, label: string, now: Date) {
  const concept = `${reminder.concept} — ${label}`;
  const account = await prisma.clientAccount.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!account) return { invoiceId: null, payUrl: null };

  let invoice = await prisma.clientPayment.findFirst({
    where: { tenantId, concept, status: { not: "CANCELED" } },
    select: { id: true, concept: true, totalAmount: true, paidAmount: true, paidAt: true },
  });
  if (!invoice) {
    invoice = await prisma.clientPayment.create({
      data: {
        tenantId,
        clientAccountId: account.id,
        concept,
        category: reminder.category,
        totalAmount: reminder.amount,
        paidAmount: 0,
        dueAt: now,
        status: "ACTIVE",
        notes: "Cargado solo por el recordatorio mensual.",
      },
      select: { id: true, concept: true, totalAmount: true, paidAmount: true, paidAt: true },
    });
    await rebuildPaymentAllocations(invoice.id);
    await syncAutoDebitAmount(tenantId);
  }
  if (invoice.paidAt) return { invoiceId: invoice.id, payUrl: null };

  let payUrl: string | null = null;
  if (isMercadoPagoConfigured()) {
    try {
      payUrl = await createCheckoutUrl(invoice);
    } catch (error) {
      console.warn("[monthly-reminders] sin link de Mercado Pago", error instanceof Error ? error.message : error);
    }
  }
  return { invoiceId: invoice.id, payUrl };
}

async function sendReminder(reminder: MonthlyReminder, period: string, label: string, now: Date) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: reminder.tenantSlug }, select: { id: true, billingEmail: true } });
  if (!tenant) {
    console.warn(`[monthly-reminders] cuenta no encontrada: ${reminder.tenantSlug}`);
    return;
  }

  // Se registra primero: si algo falla después, no se repite el mes.
  await createAuditLog({
    action: "billing.monthly_reminder_sent",
    targetType: "monthly_reminder",
    targetId: `${reminder.key}:${period}`,
    tenantId: tenant.id,
    metadata: { key: reminder.key, period },
  });

  const { invoiceId, payUrl } = await ensureMonthInvoice(reminder, tenant.id, label, now);
  const members = await prisma.membership.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    select: { user: { select: { id: true, email: true } } },
  });
  const userIds = members.map((member) => member.user.id);
  const amount = formatAmount(reminder.amount);
  const message = [
    `Te recordamos que vence el pago de ${amount} del servicio de IA de Vase Labs correspondiente a ${label}.`,
    `Podés pagarlo con el link directo de Mercado Pago, con el QR que está en Vase › Plan y pagos, o por transferencia al alias ${reminder.transferAlias}.`,
    "Si ya lo pagaste, no tenés que hacer nada.",
  ].join("\n");
  const action = payUrl ? { label: "Pagar con Mercado Pago", url: payUrl } : { label: "Pagar desde Vase", url: BILLING_PAGE };
  const endsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const notification = await prisma.adminNotification.create({
    data: {
      title: reminder.title,
      message,
      href: "/app/billing",
      tone: "warning",
      category: "billing",
      target: "TENANT",
      tenantId: tenant.id,
      endsAt,
      isActive: true,
    },
  });

  if (userIds.length) {
    await prisma.announcement.create({
      data: {
        title: reminder.title,
        body: `${message}\nSi tenés dudas, escribinos a ${BILLING_EMAIL}.`,
        // En el panel lleva a Plan y pagos: ahí el link y el QR se generan al momento y nunca vencen.
        ctaLabel: "Pagar ahora",
        ctaUrl: "/app/billing",
        icon: "bell",
        accent: "ink",
        surfaces: ["app", "labs", "business"],
        targetUserIds: userIds,
        endsAt,
        sendEmail: false,
        notificationId: notification.id,
      },
    });
  }

  const emails = new Set<string>();
  for (const member of members) if (member.user.email?.includes("@")) emails.add(member.user.email.trim().toLowerCase());
  if (tenant.billingEmail?.includes("@")) emails.add(tenant.billingEmail.trim().toLowerCase());

  for (const email of emails) {
    try {
      await sendNoticeEmail({
        email,
        subject: reminder.title,
        title: reminder.title,
        message,
        details: [
          ["Monto", amount],
          ["Mercado Pago", payUrl ? "Link directo: botón de abajo" : "Desde Vase › Plan y pagos"],
          ["QR", "Vase › Plan y pagos"],
          ["Transferencia", `Alias ${reminder.transferAlias}`],
        ],
        button: action,
        note: `Este mail sale de una casilla que no recibe respuestas. Si tenés dudas sobre el pago, escribinos a ${BILLING_EMAIL}.`,
        reason: "Te llega porque sos parte de una cuenta de Vase con este servicio contratado.",
        replyTo: BILLING_EMAIL,
      });
    } catch (error) {
      console.warn(`[monthly-reminders:failed] to=${email}`, error instanceof Error ? error.message : error);
    }
  }
  console.info(`[monthly-reminders:sent] key=${reminder.key} period=${period} invoice=${invoiceId ?? "-"} link=${payUrl ? "si" : "no"} users=${userIds.length} emails=${emails.size}`);
}

/** Revisa si hoy toca mandar algún recordatorio del mes y lo manda una sola vez. */
export async function runMonthlyReminders(now = new Date()) {
  const today = argentinaToday(now);
  const period = `${today.year}-${String(today.month).padStart(2, "0")}`;
  for (const reminder of MONTHLY_REMINDERS) {
    if (today.day < reminder.day) continue;
    const already = await prisma.auditLog.findFirst({
      where: { action: "billing.monthly_reminder_sent", targetId: `${reminder.key}:${period}` },
      select: { id: true },
    });
    if (already) continue;
    await sendReminder(reminder, period, monthLabel(today.year, today.month), now);
  }
}
