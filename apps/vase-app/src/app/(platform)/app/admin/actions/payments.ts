"use server";

// Pagos de clientes: registrar, editar y borrar.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";
import { syncAutoDebitAmount } from "@/server/services/mercadopago-autodebit";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createClientPaymentSchema, deleteClientPaymentSchema, updateClientPaymentSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { toNullableDate } from "./shared";


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
  // Si la cuenta tiene débito automático, el próximo cobro se ajusta a lo que debe ahora.
  await syncAutoDebitAmount(created.tenantId);

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
  await syncAutoDebitAmount(updated.tenantId);

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
