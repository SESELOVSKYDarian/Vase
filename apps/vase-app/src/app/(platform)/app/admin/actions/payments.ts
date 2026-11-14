"use server";

// Pagos de clientes: registrar, editar y borrar.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createClientPaymentSchema, createUserClientPaymentSchema, deleteClientPaymentSchema, updateClientPaymentSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { AdminGovernanceActionState, toNullableDate } from "./shared";

export async function createUserClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
    const parsed = createUserClientPaymentSchema.safeParse({
      userId: formData.get("userId"),
      clientAccountId: String(formData.get("clientAccountId") ?? "").trim(),
      category: formData.get("category"),
      concept: sanitizeText(String(formData.get("concept") ?? "")),
      moduleId: String(formData.get("moduleId") ?? "").trim(),
      submoduleId: String(formData.get("submoduleId") ?? "").trim(),
      totalAmount: formData.get("totalAmount"),
      paidAmount: formData.get("paidAmount"),
      paidAt: String(formData.get("paidAt") ?? "").trim() || undefined,
      method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
      status: formData.get("status"),
    });
    if (!parsed.success) return { error: "Revisa los datos del pago." };

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true },
    });
    if (!user) return { error: "No encontramos el usuario seleccionado." };

    const linkedAccounts = await prisma.clientAccount.findMany({
      where: {
        OR: [{ managedByUserId: user.id }, { email: user.email }],
      },
      select: { id: true, tenantId: true, name: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
    });
    if (linkedAccounts.length === 0) {
      return { error: "Este usuario cliente no tiene una cuenta cliente vinculada." };
    }

    const clientAccount =
      linkedAccounts.find((account) => account.id === parsed.data.clientAccountId) ??
      linkedAccounts[0];

    const paymentForm = new FormData();
    paymentForm.set("tenantId", clientAccount.tenantId);
    paymentForm.set("clientAccountId", clientAccount.id);
    paymentForm.set("concept", parsed.data.concept);
    paymentForm.set("category", parsed.data.category);
    paymentForm.set("moduleId", parsed.data.moduleId ?? "");
    paymentForm.set("submoduleId", parsed.data.submoduleId ?? "");
    paymentForm.set("totalAmount", String(parsed.data.totalAmount));
    paymentForm.set("paidAmount", String(parsed.data.paidAmount));
    paymentForm.set("paidAt", parsed.data.paidAt ?? "");
    paymentForm.set("method", parsed.data.method ?? "");
    paymentForm.set("notes", parsed.data.notes ?? "");
    paymentForm.set("status", parsed.data.status);

    await createClientPaymentAction(paymentForm);
    revalidatePath("/app/admin/users");
    return { success: `Pago registrado para ${clientAccount.name}.` };
  } catch {
    return { error: "No pudimos registrar el pago del cliente." };
  }
}


export async function createClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createClientPaymentSchema.safeParse({
    tenantId: formData.get("tenantId"),
    clientAccountId: formData.get("clientAccountId"),
    concept: sanitizeText(String(formData.get("concept") ?? "")),
    category: formData.get("category"),
    moduleId: String(formData.get("moduleId") ?? "").trim(),
    submoduleId: String(formData.get("submoduleId") ?? "").trim(),
    totalAmount: formData.get("totalAmount"),
    paidAmount: formData.get("paidAmount"),
    paidAt: String(formData.get("paidAt") ?? ""),
    method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
    notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const created = await prisma.clientPayment.create({
    data: {
      tenantId: parsed.data.tenantId,
      clientAccountId: parsed.data.clientAccountId,
      createdByUserId: session.user.id,
      moduleId: parsed.data.moduleId || null,
      submoduleId: parsed.data.submoduleId || null,
      concept: parsed.data.concept,
      category: parsed.data.category,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      paidAt: toNullableDate(parsed.data.paidAt ?? ""),
      method: parsed.data.method || null,
      notes: parsed.data.notes || null,
      status: parsed.data.status,
    },
  });
  await rebuildPaymentAllocations(created.id);

  await createAuditLog({
    action: "platform.client_payment_created",
    targetType: "client_payment",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      category: created.category,
      status: created.status,
      totalAmount: Number(created.totalAmount),
      paidAmount: Number(created.paidAmount),
    },
  });
  if (created.status === "PAST_DUE" || Number(created.totalAmount) > Number(created.paidAmount)) {
    await createAutoAdminNotification({
      title: "Pago con deuda pendiente",
      message: `El pago "${created.concept}" quedÃ³ pendiente o parcial.`,
      category: "billing",
      tone: "warning",
      targetRole: "SUPER_ADMIN",
      tenantId: created.tenantId,
    });
  }

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function createClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await createClientPaymentAction(formData);
    return { success: "Pago registrado correctamente." };
  } catch {
    return { error: "No pudimos registrar el pago." };
  }
}


export async function updateClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateClientPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    concept: sanitizeText(String(formData.get("concept") ?? "")),
    category: formData.get("category"),
    moduleId: String(formData.get("moduleId") ?? "").trim(),
    submoduleId: String(formData.get("submoduleId") ?? "").trim(),
    totalAmount: formData.get("totalAmount"),
    paidAmount: formData.get("paidAmount"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const before = await prisma.clientPayment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!before) return;

  const updated = await prisma.clientPayment.update({
    where: { id: parsed.data.paymentId },
    data: {
      concept: parsed.data.concept,
      category: parsed.data.category,
      moduleId: parsed.data.moduleId || null,
      submoduleId: parsed.data.submoduleId || null,
      totalAmount: parsed.data.totalAmount,
      paidAmount: parsed.data.paidAmount,
      status: parsed.data.status,
    },
  });
  await rebuildPaymentAllocations(updated.id);

  await createAuditLog({
    action: "platform.client_payment_updated",
    targetType: "client_payment",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });
  if (updated.status === "PAST_DUE" || Number(updated.totalAmount) > Number(updated.paidAmount)) {
    await createAutoAdminNotification({
      title: "Pago vencido o parcial",
      message: `El pago "${updated.concept}" requiere seguimiento de cobro.`,
      category: "billing",
      tone: "warning",
      targetRole: "SUPER_ADMIN",
      tenantId: updated.tenantId,
    });
  }

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function updateClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await updateClientPaymentAction(formData);
    return { success: "Pago actualizado." };
  } catch {
    return { error: "No pudimos actualizar el pago." };
  }
}

export async function deleteClientPaymentAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteClientPaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
  });
  if (!parsed.success) return;

  const target = await prisma.clientPayment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!target) return;

  await prisma.clientPayment.delete({ where: { id: parsed.data.paymentId } });
  await createAuditLog({
    action: "platform.client_payment_deleted",
    targetType: "client_payment",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function deleteClientPaymentWithStateAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await deleteClientPaymentAction(formData);
    return { success: "Pago eliminado." };
  } catch {
    return { error: "No pudimos eliminar el pago." };
  }
}
