"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

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

export async function markAllNotificationsAsReadAction(input: {
  platformUpdateIds: string[];
  adminNotificationIds: string[];
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

    revalidatePath("/app");
    return { success: true };
  } catch {
    return { error: "No pudimos marcar todas las notificaciones como leidas." };
  }
}
