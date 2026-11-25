// Avisarle algo a una cuenta por todos lados a la vez: notificación en el panel, anuncio que salta
// al entrar (opcional) y mail a cada persona de la cuenta. Lo usan la prueba gratis y las reuniones.
import { prisma } from "@/lib/db/prisma";
import { sendNoticeEmail } from "@/server/services/auth-email";

type NoticeEmailExtras = Pick<Parameters<typeof sendNoticeEmail>[0], "details" | "button" | "note" | "reason" | "replyTo">;

export type TenantNotice = {
  tenantId: string;
  title: string;
  /** Texto del aviso. Cada línea sale como un párrafo en el mail. */
  message: string;
  /** Adónde lleva el aviso dentro del panel (por ejemplo /app/billing). */
  href: string;
  tone: "info" | "warning" | "danger";
  /** Agrupa los avisos de un mismo tema (trial, meeting...). */
  category: string;
  /** Hasta cuándo se muestra. Sin fecha queda hasta que se cumpla lo que pide. */
  endsAt?: Date | null;
  /** Además del aviso, un anuncio que salta al entrar a Vase, con este botón. */
  announcement?: { ctaLabel: string; ctaUrl: string };
  /** Mandar mail. Si es false, solo aviso en el panel. */
  email?: boolean;
  emailExtras?: NoticeEmailExtras;
  /** Sumar el mail de facturación de la cuenta a los destinatarios. */
  includeBillingEmail?: boolean;
};

/** Mails de las personas activas de la cuenta (y el de facturación si se pide), sin repetir. */
async function tenantRecipients(tenantId: string, includeBillingEmail: boolean) {
  const [members, tenant] = await Promise.all([
    prisma.membership.findMany({ where: { tenantId, status: "ACTIVE" }, select: { user: { select: { id: true, email: true } } } }),
    includeBillingEmail ? prisma.tenant.findUnique({ where: { id: tenantId }, select: { billingEmail: true } }) : null,
  ]);
  const emails = new Set<string>();
  for (const member of members) if (member.user.email?.includes("@")) emails.add(member.user.email.trim().toLowerCase());
  if (tenant?.billingEmail?.includes("@")) emails.add(tenant.billingEmail.trim().toLowerCase());
  return { userIds: members.map((member) => member.user.id), emails };
}

/** Crea el aviso, el anuncio y los mails. Un mail que falla no frena a los demás. Devuelve cuántos mails salieron. */
export async function notifyTenant(notice: TenantNotice) {
  const { userIds, emails } = await tenantRecipients(notice.tenantId, Boolean(notice.includeBillingEmail));

  const notification = await prisma.adminNotification.create({
    data: {
      title: notice.title,
      message: notice.message,
      href: notice.href,
      tone: notice.tone,
      category: notice.category,
      target: "TENANT",
      tenantId: notice.tenantId,
      endsAt: notice.endsAt ?? null,
      isActive: true,
    },
  });

  if (notice.announcement && userIds.length) {
    await prisma.announcement.create({
      data: {
        title: notice.title,
        body: notice.message,
        ctaLabel: notice.announcement.ctaLabel,
        ctaUrl: notice.announcement.ctaUrl,
        icon: "bell",
        accent: "ink",
        surfaces: ["app", "labs", "business"],
        targetUserIds: userIds,
        endsAt: notice.endsAt ?? null,
        sendEmail: false,
        notificationId: notification.id,
      },
    });
  }

  if (notice.email === false) return 0;
  let sent = 0;
  for (const email of emails) {
    try {
      await sendNoticeEmail({ email, subject: notice.title, title: notice.title, message: notice.message, ...notice.emailExtras });
      sent += 1;
    } catch (error) {
      console.warn(`[notify-tenant:failed] to=${email}`, error instanceof Error ? error.message : error);
    }
  }
  return sent;
}
