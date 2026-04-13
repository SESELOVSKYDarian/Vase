"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export async function saveUserShortcutsAction(shortcuts: any) {
  const session = await requireUser();

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { shortcuts },
    });

    revalidatePath("/app/shortcuts");
    return { success: true };
  } catch (error) {
    console.error("[saveUserShortcutsAction] failed", error);
    return { error: "No pudimos guardar tus atajos. Intenta nuevamente." };
  }
}
