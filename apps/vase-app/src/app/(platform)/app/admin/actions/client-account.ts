"use server";

// Acciones de la ficha del cliente para la cuenta en sí: editar sus datos y eliminarla.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import type { ClientActionResult } from "./client-admin";

/** Solo el equipo con permiso de usuarios puede tocar los datos de una cuenta. */
async function requireUsersAdmin() {
  try {
    return await requireAdminPermission(adminPermissions.USERS);
  } catch {
    return null;
  }
}

/** Limpia un texto del formulario: sin etiquetas, sin espacios de más y con largo máximo. Vacío = null. */
function clean(value: unknown, max: number) {
  const text = sanitizeText(String(value ?? "")).trim().slice(0, max);
  return text || null;
}

export type ClientAccountInfo = {
  name: string;
  accountName: string;
  billingEmail: string;
  industry: string;
  phone: string;
  whatsapp: string;
};

/** Guarda los datos de la cuenta: nombre del negocio, nombre de la cuenta, mail de facturación, rubro y teléfonos. */
export async function updateClientAccountInfoAction(tenantId: string, input: ClientAccountInfo): Promise<ClientActionResult> {
  const session = await requireUsersAdmin();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };

  const name = clean(input.name, 160);
  const accountName = clean(input.accountName, 160);
  const billingEmail = clean(input.billingEmail, 190)?.toLowerCase() ?? null;
  if (!name || !accountName) return { ok: false, message: "Poné el nombre del negocio y de la cuenta." };
  if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) return { ok: false, message: "El mail de facturación no es válido." };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };

  const contact = { phone: clean(input.phone, 40), whatsapp: clean(input.whatsapp, 40) };
  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { name, accountName, billingEmail, industry: clean(input.industry, 120) ?? "" } }),
    prisma.tenantBusinessInfo.upsert({ where: { tenantId }, update: contact, create: { tenantId, ...contact } }),
  ]);

  await createAuditLog({ action: "admin.client_account_updated", targetType: "tenant", targetId: tenantId, tenantId, actorUserId: session.user.id });
  revalidatePath(`/app/admin/clients/${tenantId}`);
  revalidatePath("/app/admin/clients");
  return { ok: true, message: "Datos guardados." };
}

/** Borra lo que guarda la cuenta en tablas que no se borran solas con ella (agenda, tickets, presupuestos, notas…). */
async function deleteLooseTenantData(tenantId: string) {
  const meetings = await prisma.meetingV2.findMany({ where: { tenantId }, select: { id: true } });
  const meetingIds = meetings.map((meeting) => meeting.id);
  await prisma.$transaction([
    prisma.meetingTaskV2.deleteMany({ where: { meetingId: { in: meetingIds } } }),
    prisma.meetingDecisionV2.deleteMany({ where: { meetingId: { in: meetingIds } } }),
    prisma.meetingAttachmentV2.deleteMany({ where: { meetingId: { in: meetingIds } } }),
    prisma.meetingV2.deleteMany({ where: { tenantId } }),
    prisma.tenantAdminNote.deleteMany({ where: { tenantId } }),
    prisma.supportContact.updateMany({ where: { tenantId }, data: { tenantId: null } }),
  ]);
}

/**
 * Personas que solo están en esta cuenta (no en otras) y no son del equipo de Vase.
 * Son las que quedarían sin cuenta si se elimina.
 */
async function usersOnlyInTenant(tenantId: string) {
  const members = await prisma.membership.findMany({
    where: { tenantId },
    select: { user: { select: { id: true, platformRole: true, _count: { select: { memberships: true } } } } },
  });
  return members
    .map((member) => member.user)
    .filter((user) => user.platformRole === "USER" && user._count.memberships === 1)
    .map((user) => user.id);
}

/**
 * Elimina una cuenta de cliente para siempre: sus productos, cobros, equipo y todo lo que cuelga de ella.
 * Hay que escribir el nombre exacto de la cuenta para confirmar. Opcional: borrar también a las personas
 * que solo estaban en esta cuenta (si alguna no se puede borrar, queda desactivada).
 * No toca al equipo de Vase.
 */
export async function deleteClientAccountAction(tenantId: string, confirmName: string, deleteUsers: boolean): Promise<ClientActionResult> {
  const session = await requireUsersAdmin();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  if (session.user.platformRole !== "SUPER_ADMIN") return { ok: false, message: "Solo un Super Admin puede eliminar cuentas." };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };
  if (confirmName.trim() !== tenant.name.trim()) return { ok: false, message: "El nombre no coincide. Escribilo igual que arriba." };

  const userIds = deleteUsers ? await usersOnlyInTenant(tenantId) : [];
  try {
    await deleteLooseTenantData(tenantId);
    await prisma.tenant.delete({ where: { id: tenantId } });
  } catch (error) {
    console.error("[admin] no se pudo eliminar la cuenta", tenantId, error instanceof Error ? error.message : error);
    return { ok: false, message: "No pudimos eliminar la cuenta. No se borró nada importante; probá de nuevo o avisá a desarrollo." };
  }

  let disabled = 0;
  for (const userId of userIds) {
    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Tiene datos que lo atan a otros lados: lo dejamos sin acceso en vez de borrarlo.
      await prisma.user.update({ where: { id: userId }, data: { isDisabled: true, disabledAt: new Date(), disabledReason: "ACCOUNT_DELETED" } }).catch(() => undefined);
      disabled += 1;
    }
  }

  await createAuditLog({
    action: "admin.client_account_deleted",
    targetType: "tenant",
    targetId: tenantId,
    actorUserId: session.user.id,
    metadata: { name: tenant.name, slug: tenant.slug, usersDeleted: userIds.length - disabled, usersDisabled: disabled },
  });
  revalidatePath("/app/admin/clients");
  return { ok: true, message: `Cuenta "${tenant.name}" eliminada.` };
}
