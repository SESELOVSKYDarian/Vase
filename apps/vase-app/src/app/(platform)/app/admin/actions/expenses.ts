"use server";

// Gastos: registrar, editar y borrar.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createExpenseSchema, deleteExpenseSchema, updateExpenseSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { toNullableDate } from "./shared";

export async function createExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = createExpenseSchema.safeParse({
    tenantId: formData.get("tenantId"),
    clientAccountId: formData.get("clientAccountId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    category: sanitizeText(String(formData.get("category") ?? "")),
    amount: formData.get("amount"),
    startsAt: String(formData.get("startsAt") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    frequency: formData.get("frequency"),
    status: formData.get("status"),
    responsible: sanitizeNullableText(String(formData.get("responsible") ?? "")) ?? undefined,
    notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
  });
  if (!parsed.success) return;

  const created = await prisma.expense.create({
    data: {
      tenantId: parsed.data.tenantId,
      clientAccountId: parsed.data.clientAccountId || null,
      createdByUserId: session.user.id,
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      startsAt: toNullableDate(parsed.data.startsAt ?? ""),
      dueAt: toNullableDate(parsed.data.dueAt ?? ""),
      frequency: parsed.data.frequency,
      status: parsed.data.status,
      responsible: parsed.data.responsible || null,
      notes: parsed.data.notes || null,
    },
  });

  await createAuditLog({
    action: "platform.expense_created",
    targetType: "expense",
    targetId: created.id,
    tenantId: created.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      category: created.category,
      status: created.status,
      amount: Number(created.amount),
      frequency: created.frequency,
    },
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}


export async function updateExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = updateExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
    name: sanitizeText(String(formData.get("name") ?? "")),
    category: sanitizeText(String(formData.get("category") ?? "")),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const before = await prisma.expense.findUnique({ where: { id: parsed.data.expenseId } });
  if (!before) return;

  const updated = await prisma.expense.update({
    where: { id: parsed.data.expenseId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      frequency: parsed.data.frequency,
      status: parsed.data.status,
    },
  });

  await createAuditLog({
    action: "platform.expense_updated",
    targetType: "expense",
    targetId: updated.id,
    tenantId: updated.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: { before, after: updated },
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();
  const parsed = deleteExpenseSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });
  if (!parsed.success) return;

  const target = await prisma.expense.findUnique({ where: { id: parsed.data.expenseId } });
  if (!target) return;

  await prisma.expense.delete({ where: { id: parsed.data.expenseId } });
  await createAuditLog({
    action: "platform.expense_deleted",
    targetType: "expense",
    targetId: target.id,
    tenantId: target.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  revalidatePath("/app/admin/expenses");
  revalidatePath("/app/admin/finance");
}
