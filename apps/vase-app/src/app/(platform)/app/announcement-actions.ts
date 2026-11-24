"use server";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { dismissAnnouncements } from "@/server/services/announcements";

/** La persona cerró los anuncios: no se los mostramos más y su notificación queda leída. */
export async function dismissAnnouncementsAction(ids: string[]) {
  try {
    const session = await requireUser();
    const list = Array.isArray(ids) ? ids.map(String).slice(0, 20) : [];
    await dismissAnnouncements(session.user.id, list);
    const rows = await prisma.announcement.findMany({ where: { id: { in: list }, notificationId: { not: null } }, select: { notificationId: true } });
    const notificationIds = rows.map((row) => row.notificationId).filter((id): id is string => Boolean(id));
    if (notificationIds.length) {
      await prisma.adminNotificationRead.createMany({
        data: notificationIds.map((notificationId) => ({ notificationId, userId: session.user.id })),
        skipDuplicates: true,
      });
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
