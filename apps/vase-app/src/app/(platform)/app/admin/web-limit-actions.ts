"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { MAX_BUSINESS_WEB_LIMIT } from "@/lib/business/plans";
import { createAuditLog } from "@/server/services/audit-log";

const inputSchema = z.object({
  tenantId: z.string().trim().min(1),
  limit: z.number().int().min(1).max(MAX_BUSINESS_WEB_LIMIT),
});

export async function updateTenantWebLimitAction(input: {
  tenantId: string;
  limit: number;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: `Poné un número entre 1 y ${MAX_BUSINESS_WEB_LIMIT}.` };

    const { tenantId, limit } = parsed.data;
    await prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: { businessProjectLimit: limit },
      create: { tenantId, businessProjectLimit: limit },
    });
    await createAuditLog({
      action: "platform.tenant_web_limit_updated",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      actorUserId: session.user.id,
      metadata: { limit },
    });

    revalidatePath("/app/admin/users");
    revalidatePath("/app/business");
    return { ok: true, message: "Guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardar el límite." };
  }
}
