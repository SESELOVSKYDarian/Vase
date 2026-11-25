"use server";

// Cuentas de clientes: crear, editar y borrar.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createClientAccountSchema, deleteClientAccountSchema, updateClientAccountSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState } from "./shared";

export async function createClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createClientAccountSchema.safeParse({
    tenantId: formData.get("tenantId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    companyName: sanitizeNullableText(String(formData.get("companyName") ?? "")) ?? undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    status: formData.get("status"),
    contractType: formData.get("contractType"),
  });
  if (!parsed.success) return;

  const created = await prisma.clientAccount.create({
    data: {
      tenantId: parsed.data.tenantId,
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      contractType: parsed.data.contractType,
      managedByUserId: session.user.id,
    },
  });

  await createAuditLog({
    action: "platform.client_account_created",
    targetType: "client_account",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      status: created.status,
      contractType: created.contractType,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}


export async function updateClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateClientAccountSchema.safeParse({
    clientAccountId: formData.get("clientAccountId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    companyName: sanitizeNullableText(String(formData.get("companyName") ?? "")) ?? undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: sanitizeNullableText(String(formData.get("phone") ?? "")) ?? undefined,
    status: formData.get("status"),
    contractType: formData.get("contractType"),
  });
  if (!parsed.success) return;

  const before = await prisma.clientAccount.findUnique({ where: { id: parsed.data.clientAccountId } });
  if (!before) return;

  const updated = await prisma.clientAccount.update({
    where: { id: parsed.data.clientAccountId },
    data: {
      name: parsed.data.name,
      companyName: parsed.data.companyName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      status: parsed.data.status,
      contractType: parsed.data.contractType,
    },
  });

  await createAuditLog({
    action: "platform.client_account_updated",
    targetType: "client_account",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function deleteClientAccountAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteClientAccountSchema.safeParse({
    clientAccountId: formData.get("clientAccountId"),
  });
  if (!parsed.success) return;

  const target = await prisma.clientAccount.findUnique({ where: { id: parsed.data.clientAccountId } });
  if (!target) return;

  await prisma.clientAccount.delete({ where: { id: parsed.data.clientAccountId } });
  await createAuditLog({
    action: "platform.client_account_deleted",
    targetType: "client_account",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}
