"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { MAX_BUSINESS_WEB_LIMIT } from "@/lib/business/plans";
import { MAX_TEAM_MEMBER_LIMIT } from "@/lib/team/team-access";
import { createAuditLog } from "@/server/services/audit-log";

export type TenantLimitKind = "webs" | "team";

const MAX_BY_KIND: Record<TenantLimitKind, number> = {
  webs: MAX_BUSINESS_WEB_LIMIT,
  team: MAX_TEAM_MEMBER_LIMIT,
};

const inputSchema = z.object({
  tenantId: z.string().trim().min(1),
  kind: z.enum(["webs", "team"]),
  limit: z.number().int().min(1),
});

/** Límites por cuenta que define el superadmin: webs de Business y personas del equipo. */
export async function updateTenantLimitAction(input: {
  tenantId: string;
  kind: TenantLimitKind;
  limit: number;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const parsed = inputSchema.safeParse(input);
    const max = parsed.success ? MAX_BY_KIND[parsed.data.kind] : 0;
    if (!parsed.success || parsed.data.limit > max) {
      return { ok: false, message: `Poné un número entre 1 y ${max || 100}.` };
    }

    const { tenantId, kind, limit } = parsed.data;
    const data = kind === "webs" ? { businessProjectLimit: limit } : { teamMemberLimit: limit };
    await prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
    await createAuditLog({
      action: kind === "webs" ? "platform.tenant_web_limit_updated" : "platform.tenant_team_limit_updated",
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      actorUserId: session.user.id,
      metadata: { limit },
    });

    revalidatePath("/app/admin/users");
    revalidatePath(kind === "webs" ? "/app/business" : "/app/team");
    return { ok: true, message: "Guardado." };
  } catch {
    return { ok: false, message: "No pudimos guardar el límite." };
  }
}
