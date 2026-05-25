import type { PlatformRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AutoAdminNotificationInput = {
  title: string;
  message: string;
  category: "platform" | "business" | "labs" | "billing" | "support";
  tone?: "info" | "warning" | "danger";
  targetRole?: PlatformRole;
  tenantId?: string | null;
};

export async function createAutoAdminNotification(input: AutoAdminNotificationInput) {
  await prisma.adminNotification.create({
    data: {
      title: input.title,
      message: input.message,
      category: input.category,
      tone: input.tone ?? "info",
      target: input.targetRole ? "PLATFORM_ROLE" : "ALL",
      targetRole: input.targetRole ?? null,
      tenantId: input.tenantId ?? null,
      isActive: true,
      startsAt: new Date(),
    },
  });
}

