"use server";

// Admin › Anuncios: crear, pausar y borrar. Cada anuncio también deja una notificación para todos.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { ANNOUNCEMENT_ACCENTS, ANNOUNCEMENT_ICONS, isAnnouncementSurface, safeAnnouncementUrl } from "@/lib/announcements";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { sendAnnouncementEmails, sendAnnouncementTestEmail } from "@/server/services/announcements";

export type AnnouncementActionResult = { ok: boolean; message?: string };

export type AnnouncementInput = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  icon?: string | null;
  accent?: string | null;
  /** data:image/webp;base64,... ya achicada en el navegador. */
  imageData?: string | null;
  surfaces: string[];
  /** Vacío = para todas las personas. */
  userIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  sendEmail: boolean;
};

const MAX_IMAGE_CHARS = 1_400_000;
const MAX_TARGETS = 500;
const ID_RE = /^[a-z0-9]{20,40}$/i;

async function requireNotifications() {
  try {
    return await requireAdminPermission(adminPermissions.NOTIFICATIONS);
  } catch {
    return null;
  }
}

function day(value: string | null | undefined, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function refresh() {
  revalidatePath("/app/admin/announcements");
}

export async function createAnnouncementAction(input: AnnouncementInput): Promise<AnnouncementActionResult> {
  const session = await requireNotifications();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };

  const title = sanitizeText(String(input.title ?? "")).trim().slice(0, 160);
  const body = sanitizeText(String(input.body ?? "")).trim().slice(0, 2000);
  if (title.length < 3) return { ok: false, message: "Poné un título." };
  if (body.length < 3) return { ok: false, message: "Escribí el texto del anuncio." };
  const surfaces = [...new Set((input.surfaces ?? []).filter(isAnnouncementSurface))];
  if (!surfaces.length) return { ok: false, message: "Elegí al menos un lugar donde mostrarlo." };
  const ctaUrl = safeAnnouncementUrl(input.ctaUrl);
  if (input.ctaUrl?.trim() && !ctaUrl) return { ok: false, message: "El link del botón tiene que empezar con https:// o /." };
  const ctaLabel = ctaUrl ? sanitizeText(String(input.ctaLabel ?? "")).trim().slice(0, 60) || "Ver más" : null;
  const icon = input.icon && (ANNOUNCEMENT_ICONS as readonly string[]).includes(input.icon) ? input.icon : null;
  const accent = input.accent && input.accent in ANNOUNCEMENT_ACCENTS ? input.accent : "green";
  let imageData: string | null = null;
  if (input.imageData) {
    if (!/^data:image\/(webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(input.imageData)) return { ok: false, message: "La imagen no es válida." };
    if (input.imageData.length > MAX_IMAGE_CHARS) return { ok: false, message: "La imagen es muy pesada. Probá con una más chica." };
    imageData = input.imageData;
  }
  const startsAt = day(input.startsAt);
  const endsAt = day(input.endsAt, true);
  if (startsAt && endsAt && endsAt < startsAt) return { ok: false, message: "La fecha de fin es anterior a la de inicio." };
  const wanted = [...new Set((input.userIds ?? []).filter((id) => typeof id === "string" && ID_RE.test(id)))];
  if (wanted.length > MAX_TARGETS) return { ok: false, message: `Podés elegir hasta ${MAX_TARGETS} personas.` };
  const targets = wanted.length
    ? (await prisma.user.findMany({ where: { id: { in: wanted } }, select: { id: true } })).map((user) => user.id)
    : null;
  if (wanted.length && !targets?.length) return { ok: false, message: "No encontramos a las personas elegidas." };

  const notification = await prisma.adminNotification.create({
    data: {
      title,
      message: body.slice(0, 600),
      href: ctaUrl,
      tone: "info",
      category: "announcement",
      target: targets ? "USERS" : "ALL",
      ...(targets ? { targetUserIds: targets } : {}),
      startsAt,
      endsAt,
      createdByUserId: session.user.id,
    },
    select: { id: true },
  });
  const created = await prisma.announcement.create({
    data: {
      title,
      body,
      ctaLabel,
      ctaUrl,
      icon,
      accent,
      imageData,
      surfaces,
      ...(targets ? { targetUserIds: targets } : {}),
      startsAt,
      endsAt,
      sendEmail: Boolean(input.sendEmail),
      notificationId: notification.id,
      createdByUserId: session.user.id,
    },
    select: { id: true },
  });

  await createAuditLog({
    action: "platform.announcement_created",
    targetType: "announcement",
    targetId: created.id,
    actorUserId: session.user.id,
    metadata: { surfaces, audience: targets ? targets.length : "all", sendEmail: Boolean(input.sendEmail), hasImage: Boolean(imageData) },
  });

  // El mail sale después de responder, para no dejar la pantalla esperando.
  if (input.sendEmail && (!startsAt || startsAt <= new Date())) {
    after(async () => {
      try {
        await sendAnnouncementEmails(created.id);
      } catch (error) {
        console.error("[announcements:email-error]", error);
      }
    });
  }
  refresh();
  return {
    ok: true,
    message: input.sendEmail
      ? startsAt && startsAt > new Date()
        ? "Anuncio creado. El mail sale cuando toques Enviar mail el día que empieza."
        : "Anuncio publicado. El mail está saliendo."
      : "Anuncio publicado.",
  };
}

export async function setAnnouncementActiveAction(id: string, active: boolean): Promise<AnnouncementActionResult> {
  const session = await requireNotifications();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const row = await prisma.announcement.update({ where: { id }, data: { isActive: active }, select: { notificationId: true } });
  if (row.notificationId) await prisma.adminNotification.updateMany({ where: { id: row.notificationId }, data: { isActive: active } });
  await createAuditLog({ action: active ? "platform.announcement_resumed" : "platform.announcement_paused", targetType: "announcement", targetId: id, actorUserId: session.user.id });
  refresh();
  return { ok: true, message: active ? "Anuncio activo de nuevo." : "Anuncio pausado." };
}

export async function sendAnnouncementEmailNowAction(id: string): Promise<AnnouncementActionResult> {
  const session = await requireNotifications();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const row = await prisma.announcement.update({ where: { id }, data: { sendEmail: true }, select: { emailSentAt: true } });
  if (row.emailSentAt) return { ok: false, message: "Este anuncio ya se mandó por mail." };
  after(async () => {
    try {
      await sendAnnouncementEmails(id);
    } catch (error) {
      console.error("[announcements:email-error]", error);
    }
  });
  await createAuditLog({ action: "platform.announcement_email_sent", targetType: "announcement", targetId: id, actorUserId: session.user.id });
  refresh();
  return { ok: true, message: "El mail está saliendo." };
}

export async function deleteAnnouncementAction(id: string): Promise<AnnouncementActionResult> {
  const session = await requireNotifications();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const row = await prisma.announcement.findUnique({ where: { id }, select: { notificationId: true, title: true } });
  if (!row) return { ok: false, message: "Ese anuncio ya no existe." };
  await prisma.$transaction([
    prisma.announcementDismissal.deleteMany({ where: { announcementId: id } }),
    prisma.announcement.delete({ where: { id } }),
    ...(row.notificationId ? [prisma.adminNotification.deleteMany({ where: { id: row.notificationId } })] : []),
  ]);
  await createAuditLog({ action: "platform.announcement_deleted", targetType: "announcement", targetId: id, actorUserId: session.user.id, metadata: { title: row.title } });
  refresh();
  return { ok: true, message: "Anuncio borrado." };
}

/** Manda el anuncio solo a la casilla de quien lo pide, para ver cómo llega. */
export async function sendAnnouncementTestAction(id: string): Promise<AnnouncementActionResult> {
  const session = await requireNotifications();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!me?.email) return { ok: false, message: "Tu cuenta no tiene mail." };
  try {
    const sent = await sendAnnouncementTestEmail(id, me.email);
    if (!sent) return { ok: false, message: "No pudimos mandarlo: falta configurar el correo." };
  } catch (error) {
    console.error("[announcements:test-error]", error);
    return { ok: false, message: "El correo no salió. Revisá la configuración de mail." };
  }
  await createAuditLog({ action: "platform.announcement_test_email", targetType: "announcement", targetId: id, actorUserId: session.user.id });
  return { ok: true, message: `Prueba enviada a ${me.email}.` };
}

export type AnnouncementUserOption = { id: string; name: string; email: string; detail: string | null };

/** Buscador de personas para elegir a quién mostrarle un anuncio. */
export async function searchAnnouncementUsersAction(query: string): Promise<AnnouncementUserOption[]> {
  const session = await requireNotifications();
  if (!session) return [];
  const q = String(query ?? "").trim().slice(0, 80);
  if (q.length < 2) return [];
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
        { memberships: { some: { tenant: { name: { contains: q } } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, name: true, email: true, memberships: { take: 1, select: { tenant: { select: { name: true } } } } },
  });
  return users.map((user) => ({
    id: user.id,
    name: user.name.trim() || user.email,
    email: user.email,
    detail: user.memberships[0]?.tenant.name ?? null,
  }));
}
