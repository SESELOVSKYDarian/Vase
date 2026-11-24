import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";
import { safeAnnouncementUrl, type AnnouncementSurface, type AnnouncementView } from "@/lib/announcements";
import { renderEmail } from "@/server/services/email-layout";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

function activeWhere(now = new Date()) {
  return {
    isActive: true,
    AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
  };
}

function surfacesOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Null o vacío = para todas las personas. */
export function announcementTargets(value: unknown): string[] | null {
  const ids = surfacesOf(value);
  return ids.length ? ids : null;
}

/** Anuncios vigentes para un producto que la persona todavía no cerró. Del más nuevo al más viejo. */
export async function listAnnouncementsFor(surface: AnnouncementSurface, userId: string): Promise<AnnouncementView[]> {
  const [rows, dismissed] = await Promise.all([
    prisma.announcement.findMany({
      where: activeWhere(),
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, body: true, ctaLabel: true, ctaUrl: true, icon: true, accent: true, surfaces: true, targetUserIds: true, updatedAt: true, imageData: false },
    }),
    prisma.announcementDismissal.findMany({ where: { userId }, select: { announcementId: true } }),
  ]);
  const hidden = new Set(dismissed.map((row) => row.announcementId));
  const visible = rows
    .filter((row) => {
      if (hidden.has(row.id) || !surfacesOf(row.surfaces).includes(surface)) return false;
      const targets = announcementTargets(row.targetUserIds);
      return !targets || targets.includes(userId);
    })
    .slice(0, 8);
  if (!visible.length) return [];
  const withImage = new Set(
    (await prisma.announcement.findMany({ where: { id: { in: visible.map((row) => row.id) }, imageData: { not: null } }, select: { id: true } })).map((row) => row.id),
  );
  return visible.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    icon: row.icon,
    accent: row.accent,
    imageUrl: withImage.has(row.id) ? `/api/announcements/${row.id}/image?v=${row.updatedAt.getTime()}` : null,
  }));
}

export async function dismissAnnouncements(userId: string, ids: string[]) {
  const unique = [...new Set(ids)].filter((id) => /^[a-z0-9]{20,40}$/i.test(id)).slice(0, 20);
  if (!unique.length) return;
  await prisma.announcementDismissal.createMany({ data: unique.map((announcementId) => ({ announcementId, userId })), skipDuplicates: true });
}

/** Correos de las personas con una cuenta activa en Vase (sin repetir), o solo de las elegidas. */
async function announcementRecipients(targets: string[] | null) {
  const users = await prisma.user.findMany({
    where: targets ? { id: { in: targets } } : { memberships: { some: { status: "ACTIVE" } } },
    select: { email: true },
  });
  return [...new Set(users.map((user) => user.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email && email.includes("@"))))];
}

function newsTransport() {
  const host = process.env.SMTP_HOST ?? "";
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  if (!host || !user || !pass) return null;
  const address = (process.env.NEWS_FROM_EMAIL ?? "novedades@vase.ar").trim();
  return {
    from: address.includes("<") ? address : `"Vase Novedades" <${address}>`,
    replyTo: (process.env.EMAIL_REPLY_TO ?? "soporte@vase.ar").trim(),
    transporter: nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
  };
}

type MailAnnouncement = { id: string; title: string; body: string; ctaLabel: string | null; ctaUrl: string | null; imageData: string | null; updatedAt: Date };

function announcementMail(announcement: MailAnnouncement, test = false) {
  const cta = safeAnnouncementUrl(announcement.ctaUrl);
  return renderEmail({
    preheader: announcement.body.slice(0, 120),
    title: announcement.title,
    image: announcement.imageData ? { url: `${APP_URL}/api/announcements/${announcement.id}/image?v=${announcement.updatedAt.getTime()}`, alt: announcement.title } : undefined,
    paragraphs: announcement.body.split(/\n+/).map((line) => line.trim()).filter(Boolean),
    button: cta && announcement.ctaLabel ? { label: announcement.ctaLabel, url: cta.startsWith("/") ? `${APP_URL}${cta}` : cta } : { label: "Abrir Vase", url: APP_URL },
    reason: test ? "Es una prueba: solo te llegó a vos." : "Te llega porque tenés una cuenta en Vase.",
  });
}

/** Prueba: manda el anuncio solo a una casilla (la de quien lo pide). No lo marca como enviado. */
export async function sendAnnouncementTestEmail(announcementId: string, to: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  const mail = newsTransport();
  if (!announcement || !mail) return false;
  const { html, text } = announcementMail(announcement, true);
  await mail.transporter.sendMail({ from: mail.from, replyTo: mail.replyTo, to, subject: `[Prueba] ${announcement.title}`, text, html });
  return true;
}

/**
 * Manda el anuncio por mail desde novedades@vase.ar (alias de la cuenta SMTP en Google Workspace).
 * De a uno, con una pausa corta, para no pasar el límite de Gmail. Devuelve cuántos salieron.
 */
export async function sendAnnouncementEmails(announcementId: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || !announcement.sendEmail || announcement.emailSentAt) return 0;
  await prisma.announcement.update({ where: { id: announcementId }, data: { emailSentAt: new Date() } });

  const recipients = await announcementRecipients(announcementTargets(announcement.targetUserIds));
  const mail = newsTransport();
  if (!mail) {
    console.info(`[announcements:fallback] id=${announcementId} recipients=${recipients.length}`);
    return 0;
  }
  const { html, text } = announcementMail(announcement);

  let sent = 0;
  for (const to of recipients) {
    try {
      await mail.transporter.sendMail({ from: mail.from, replyTo: mail.replyTo, to, subject: announcement.title, text, html });
      sent += 1;
    } catch (error) {
      console.warn(`[announcements:failed] to=${to}`, error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  await prisma.announcement.update({ where: { id: announcementId }, data: { emailCount: sent } });
  console.info(`[announcements:sent] id=${announcementId} sent=${sent}/${recipients.length}`);
  return sent;
}
