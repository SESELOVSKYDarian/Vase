"use server";

// Acciones de la ficha del cliente (Admin › Clientes): productos y plan, características, cobros y notas.
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_PRODUCTS } from "@/lib/admin/product-catalog";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { activateAfterPayment } from "@/server/services/billing-activation";
import { syncAutoDebitAmount } from "@/server/services/mercadopago-autodebit";
import { setTenantFeatures } from "@/server/services/product-features";

export type ClientActionResult = { ok: boolean; message?: string };

async function requireBilling() {
  try {
    return await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    return null;
  }
}

function refresh(tenantId: string) {
  revalidatePath(`/app/admin/clients/${tenantId}`);
  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

/** Producto prendido o apagado, su plan y sus características, todo de una vez (ventana "Ajustar"). */
export async function saveClientProductAction(input: {
  tenantId: string;
  moduleId: string;
  active: boolean;
  submoduleId: string | null;
  enabledFeatures: string[];
  trialDays?: number | null;
}): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const product = ADMIN_PRODUCTS.find((item) => item.moduleId === input.moduleId);
  if (!product) return { ok: false, message: "Producto desconocido." };
  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };

  const plans = await prisma.moduleSubmodule.findMany({ where: { moduleId: input.moduleId }, select: { id: true, name: true } });
  if (input.submoduleId && !plans.some((plan) => plan.id === input.submoduleId)) return { ok: false, message: "Ese plan no es de este producto." };
  const now = new Date();
  const trialEndsAt = input.trialDays && input.trialDays > 0 ? new Date(now.getTime() + input.trialDays * 24 * 60 * 60 * 1000) : null;
  const commercialStatus = trialEndsAt ? "TRIAL" : "ACTIVE";

  await prisma.$transaction(async (tx) => {
    await tx.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: input.tenantId, moduleId: input.moduleId } },
      create: { tenantId: input.tenantId, moduleId: input.moduleId, isActive: input.active, commercialStatus, trialEndsAt, activatedAt: input.active ? now : null },
      update: input.active
        ? { isActive: true, commercialStatus, trialEndsAt, activatedAt: now }
        : { isActive: false },
    });
    if (plans.length) {
      await tx.tenantSubmodule.updateMany({
        where: { tenantId: input.tenantId, submoduleId: { in: plans.map((plan) => plan.id) }, ...(input.submoduleId ? { NOT: { submoduleId: input.submoduleId } } : {}) },
        data: { isActive: false },
      });
      if (input.active && input.submoduleId) {
        await tx.tenantSubmodule.upsert({
          where: { tenantId_submoduleId: { tenantId: input.tenantId, submoduleId: input.submoduleId } },
          create: { tenantId: input.tenantId, submoduleId: input.submoduleId, isActive: true, commercialStatus, trialEndsAt, activatedAt: now },
          update: { isActive: true, commercialStatus, trialEndsAt, activatedAt: now },
        });
      }
    }
  });
  await setTenantFeatures(input.tenantId, input.moduleId, input.enabledFeatures);

  await createAuditLog({
    action: "admin.client_product_saved",
    targetType: "tenant",
    targetId: input.tenantId,
    tenantId: input.tenantId,
    actorUserId: session.user.id,
    metadata: {
      moduleId: input.moduleId,
      active: input.active,
      plan: plans.find((plan) => plan.id === input.submoduleId)?.name ?? null,
      disabledFeatures: product.features.map((feature) => feature.key).filter((key) => !input.enabledFeatures.includes(key)),
      trialDays: input.trialDays ?? null,
    },
  });
  refresh(input.tenantId);
  return { ok: true, message: input.active ? `${product.name} quedó guardado.` : `${product.name} quedó apagado.` };
}

const CATEGORIES = ["DEVELOPMENT", "HOSTING", "MAINTENANCE", "LABS_MONTHLY", "TOKENS", "OTHER"] as const;

/** Cargar un cobro (ventana). Si se marca como pagado, queda acreditado. */
export async function createClientChargeAction(input: {
  tenantId: string;
  concept: string;
  amount: number;
  category: string;
  dueAt: string;
  paid: boolean;
  method?: string;
}): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const concept = sanitizeText(String(input.concept ?? "")).trim().slice(0, 180);
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (concept.length < 2) return { ok: false, message: "Poné un concepto." };
  if (!(amount > 0 && amount < 1_000_000_000)) return { ok: false, message: "El monto no es válido." };
  const category = (CATEGORIES as readonly string[]).includes(input.category) ? (input.category as (typeof CATEGORIES)[number]) : "OTHER";
  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true, name: true, billingEmail: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };
  const dueAt = input.dueAt ? new Date(`${input.dueAt}T12:00:00`) : new Date();

  const account =
    (await prisma.clientAccount.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" }, select: { id: true } })) ??
    (await prisma.clientAccount.create({ data: { tenantId: tenant.id, name: tenant.name, email: tenant.billingEmail }, select: { id: true } }));

  const created = await prisma.clientPayment.create({
    data: {
      tenantId: tenant.id,
      clientAccountId: account.id,
      createdByUserId: session.user.id,
      concept,
      category,
      totalAmount: amount,
      paidAmount: input.paid ? amount : 0,
      paidAt: input.paid ? new Date() : null,
      method: input.paid ? sanitizeText(String(input.method ?? "")).slice(0, 80) || "Manual" : null,
      dueAt: Number.isNaN(dueAt.getTime()) ? new Date() : dueAt,
    },
    select: { id: true },
  });
  await syncAutoDebitAmount(tenant.id);
  // Cobro cargado como pagado: la cuenta se pone al día igual que si hubiera pagado online
  // (sale de la prueba y se destraban los productos).
  if (input.paid) await activateAfterPayment(created.id, "transfer");
  await createAuditLog({
    action: "platform.client_payment_created",
    targetType: "client_payment",
    targetId: created.id,
    tenantId: tenant.id,
    actorUserId: session.user.id,
    metadata: { amount, category, paid: input.paid },
  });
  refresh(tenant.id);
  return { ok: true, message: input.paid ? "Cobro cargado como pagado." : "Cobro cargado. El cliente ya lo ve en Plan y pagos." };
}

export async function addClientNoteAction(tenantId: string, rawBody: string): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const body = sanitizeText(String(rawBody ?? "")).trim().slice(0, 4000);
  if (body.length < 2) return { ok: false, message: "Escribí la nota." };
  await prisma.tenantAdminNote.create({ data: { tenantId, body, authorUserId: session.user.id } });
  refresh(tenantId);
  return { ok: true };
}

export async function toggleClientNoteAction(noteId: string, done: boolean): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const note = await prisma.tenantAdminNote.update({ where: { id: noteId }, data: { done }, select: { tenantId: true } });
  refresh(note.tenantId);
  return { ok: true };
}

export async function deleteClientNoteAction(noteId: string): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const note = await prisma.tenantAdminNote.delete({ where: { id: noteId }, select: { tenantId: true } });
  refresh(note.tenantId);
  return { ok: true };
}
