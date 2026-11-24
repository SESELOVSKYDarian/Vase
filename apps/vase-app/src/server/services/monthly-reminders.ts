import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { sendNoticeEmail } from "@/server/services/auth-email";

/**
 * Recordatorios de pago que se repiten todos los meses para una cuenta puntual.
 * Cada uno sale una sola vez por mes: notificación + anuncio (solo para esa cuenta) + mail desde no-reply@vase.ar
 * con las respuestas dirigidas a facturación.
 */
type MonthlyReminder = {
  /** Identificador fijo: se usa para no mandarlo dos veces en el mismo mes. */
  key: string;
  tenantSlug: string;
  /** Día del mes (hora de Argentina) desde el que sale. */
  day: number;
  title: string;
  body: (monthLabel: string) => string;
};

export const MONTHLY_REMINDERS: readonly MonthlyReminder[] = [
  {
    key: "teflon-labs-ia",
    tenantSlug: "sanitarios-el-teflon",
    day: 26,
    title: "Pago del mes: IA de Vase Labs",
    body: (month) =>
      `Te recordamos que vence el pago de $90.000 del servicio de IA de Vase Labs correspondiente a ${month}.\nSi ya lo pagaste, no tenés que hacer nada.`,
  },
];

const BILLING_EMAIL = "facturacion@vase.ar";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

function argentinaToday(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

async function sendReminder(reminder: MonthlyReminder, period: string, label: string, now: Date) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: reminder.tenantSlug }, select: { id: true, billingEmail: true } });
  if (!tenant) {
    console.warn(`[monthly-reminders] cuenta no encontrada: ${reminder.tenantSlug}`);
    return;
  }
  const members = await prisma.membership.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
    select: { user: { select: { id: true, email: true } } },
  });
  const userIds = members.map((member) => member.user.id);
  const message = reminder.body(label);
  const endsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // Se registra primero: si algo falla después, no se repite el mes.
  await createAuditLog({
    action: "billing.monthly_reminder_sent",
    targetType: "monthly_reminder",
    targetId: `${reminder.key}:${period}`,
    tenantId: tenant.id,
    metadata: { key: reminder.key, period, users: userIds.length },
  });

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
        ctaLabel: "Ver plan y pagos",
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
        button: { label: "Ver plan y pagos", url: "https://app.vase.ar/app/billing" },
        note: `Este mail sale de una casilla que no recibe respuestas. Si tenés dudas sobre el pago, escribinos a ${BILLING_EMAIL}.`,
        reason: "Te llega porque sos parte de una cuenta de Vase con este servicio contratado.",
        replyTo: BILLING_EMAIL,
      });
    } catch (error) {
      console.warn(`[monthly-reminders:failed] to=${email}`, error instanceof Error ? error.message : error);
    }
  }
  console.info(`[monthly-reminders:sent] key=${reminder.key} period=${period} users=${userIds.length} emails=${emails.size}`);
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
