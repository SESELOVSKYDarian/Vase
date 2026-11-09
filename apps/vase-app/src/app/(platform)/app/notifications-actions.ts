"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, requireVerifiedUser, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import {
  DISMISSED_NOTIFICATION_SOURCE,
  buildDismissedNotificationKey,
} from "@/lib/navigation/panel-sections";
import { buildNotificationReadKey, type ShellNotificationType } from "@/server/services/labs-notifications";

export async function markAdminNotificationAsReadAction(notificationId: string) {
  try {
    const session = await requireVerifiedUser();
    await prisma.adminNotificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        notificationId,
        userId: session.user.id,
      },
    });
    revalidatePath("/app");
    return { success: true };
  } catch {
    return { error: "No pudimos marcar la notificacion como leida." };
  }
}

export async function markSystemNotificationAsReadAction(input: {
  notificationId: string;
  notificationType: Extract<ShellNotificationType, "system_hint" | "labs_system">;
}) {
  try {
    const { session, membership } = await requireTenantRole(tenantRoles.MEMBER);
    const notificationKey = buildNotificationReadKey(input.notificationType, input.notificationId);

    await prisma.systemNotificationRead.upsert({
      where: {
        tenantId_userId_notificationKey: {
          tenantId: membership.tenantId,
          userId: session.user.id,
          notificationKey,
        },
      },
      update: {},
      create: {
        tenantId: membership.tenantId,
        userId: session.user.id,
        notificationKey,
        source: input.notificationType,
      },
    });

    revalidatePath("/app");
    revalidatePath("/app/labs");
    revalidatePath("/app/owner/labs");
    return { success: true };
  } catch {
    return { error: "No pudimos marcar la notificacion como leida." };
  }
}

export async function markAllNotificationsAsReadAction(input: {
  platformUpdateIds: string[];
  adminNotificationIds: string[];
  systemNotifications?: Array<{
    id: string;
    notificationType: Extract<ShellNotificationType, "system_hint" | "labs_system">;
  }>;
}) {
  try {
    const session = await requireVerifiedUser();
    const userId = session.user.id;

    if (input.platformUpdateIds.length > 0) {
      await prisma.platformUpdateRead.createMany({
        data: input.platformUpdateIds.map((updateId) => ({ updateId, userId })),
        skipDuplicates: true,
      });
    }

    if (input.adminNotificationIds.length > 0) {
      await prisma.adminNotificationRead.createMany({
        data: input.adminNotificationIds.map((notificationId) => ({ notificationId, userId })),
        skipDuplicates: true,
      });
    }

    if (input.systemNotifications && input.systemNotifications.length > 0) {
      const { membership } = await requireTenantRole(tenantRoles.MEMBER);
      await prisma.systemNotificationRead.createMany({
        data: input.systemNotifications.map((item) => ({
          tenantId: membership.tenantId,
          userId,
          notificationKey: buildNotificationReadKey(item.notificationType, item.id),
          source: item.notificationType,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/app");
    revalidatePath("/app/labs");
    revalidatePath("/app/owner/labs");
    return { success: true };
  } catch {
    return { error: "No pudimos marcar todas las notificaciones como leidas." };
  }
}

const NOTIFICATION_TYPES: readonly ShellNotificationType[] = [
  "platform_update",
  "admin_notification",
  "system_hint",
  "labs_system",
];
const MAX_DISMISS_BATCH = 200;

export async function dismissNotificationsAction(
  items: Array<{ id: string; notificationType: ShellNotificationType }>,
) {
  try {
    const { session, membership } = await requireTenantRole(tenantRoles.MEMBER);
    const valid = items
      .slice(0, MAX_DISMISS_BATCH)
      .filter((item) => typeof item.id === "string" && item.id && NOTIFICATION_TYPES.includes(item.notificationType));

    if (valid.length > 0) {
      await prisma.systemNotificationRead.createMany({
        data: valid.map((item) => ({
          tenantId: membership.tenantId,
          userId: session.user.id,
          notificationKey: buildDismissedNotificationKey(buildNotificationReadKey(item.notificationType, item.id)),
          source: DISMISSED_NOTIFICATION_SOURCE,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/app", "layout");
    return { success: true };
  } catch {
    return { error: "No pudimos borrar las notificaciones." };
  }
}
