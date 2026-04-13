"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export async function markPlatformUpdateAsReadAction(updateId: string) {
  try {
    const session = await requireVerifiedUser();

    await prisma.platformUpdateRead.upsert({
      where: {
        updateId_userId: {
          updateId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        updateId,
        userId: session.user.id,
      },
    });

    revalidatePath("/app");
    return { success: true };
  } catch (error) {
    console.error("Error marking update as read:", error);
    return { error: "No pudimos marcar el anuncio como leído." };
  }
}
