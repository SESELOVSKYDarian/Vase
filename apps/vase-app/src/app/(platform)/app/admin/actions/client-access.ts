"use server";

// Acciones de la ficha del cliente para manejar el acceso a mano:
// - habilitar la cuenta sin esperar el pago (el cobro se carga aparte con "Cargar cobro");
// - marcarla como cuenta de prueba interna (todos los productos, la prueba nunca vence).
import { revalidatePath } from "next/cache";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_PRODUCTS } from "@/lib/admin/product-catalog";
import { createAuditLog } from "@/server/services/audit-log";
import { setTenantFeatures } from "@/server/services/product-features";
import type { ClientActionResult } from "./client-admin";

/** Solo quien maneja cobros puede tocar el acceso de una cuenta. */
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
}

/** Deja la cuenta como activa (sale de la prueba y se destraban los productos), sin esperar a que pague. */
export async function activateClientAccountAction(tenantId: string): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, status: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };

  const data = { billingStatus: "ACTIVE" as const, businessBlockedAt: null, graceEndsAt: null, temporaryPagesEnabled: true };
  await prisma.tenantSubscription.upsert({ where: { tenantId }, update: data, create: { tenantId, ...data } });
  if (tenant.status === "TRIAL") await prisma.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } });

  await createAuditLog({ action: "admin.client_account_activated", targetType: "tenant", targetId: tenantId, tenantId, actorUserId: session.user.id });
  refresh(tenantId);
  return { ok: true, message: "Cuenta habilitada. Ya puede usar sus productos." };
}

/** Prende todos los productos de Vase, con todos sus planes y características, para una cuenta de prueba interna. */
async function enableAllProducts(tenantId: string) {
  const now = new Date();
  for (const product of ADMIN_PRODUCTS) {
    const plans = await prisma.moduleSubmodule.findMany({ where: { moduleId: product.moduleId }, select: { id: true } });
    await prisma.$transaction([
      prisma.tenantModule.upsert({
        where: { tenantId_moduleId: { tenantId, moduleId: product.moduleId } },
        create: { tenantId, moduleId: product.moduleId, isActive: true, commercialStatus: "ACTIVE", trialEndsAt: null, activatedAt: now },
        update: { isActive: true, commercialStatus: "ACTIVE", trialEndsAt: null, activatedAt: now },
      }),
      ...plans.map((plan) =>
        prisma.tenantSubmodule.upsert({
          where: { tenantId_submoduleId: { tenantId, submoduleId: plan.id } },
          create: { tenantId, submoduleId: plan.id, isActive: true, commercialStatus: "ACTIVE", trialEndsAt: null, activatedAt: now },
          update: { isActive: true, commercialStatus: "ACTIVE", trialEndsAt: null, activatedAt: now },
        }),
      ),
    ]);
    await setTenantFeatures(tenantId, product.moduleId, product.features.map((feature) => feature.key));
  }
}

/**
 * Marca o desmarca una cuenta como "de prueba interna" (para que el equipo pruebe Vase).
 * Al marcarla: todos los productos quedan prendidos y la prueba nunca vence.
 * Al desmarcarla: vuelve a las reglas normales; los productos quedan como estaban.
 */
export async function setTestAccountAction(tenantId: string, isTestAccount: boolean): Promise<ClientActionResult> {
  const session = await requireBilling();
  if (!session) return { ok: false, message: "No tenés permiso para esto." };
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return { ok: false, message: "No encontramos la cuenta." };

  const data = isTestAccount ? { isTestAccount: true, businessBlockedAt: null, graceEndsAt: null } : { isTestAccount: false };
  await prisma.tenantSubscription.upsert({ where: { tenantId }, update: data, create: { tenantId, ...data } });
  if (isTestAccount) await enableAllProducts(tenantId);

  await createAuditLog({
    action: isTestAccount ? "admin.test_account_on" : "admin.test_account_off",
    targetType: "tenant",
    targetId: tenantId,
    tenantId,
    actorUserId: session.user.id,
  });
  refresh(tenantId);
  return { ok: true, message: isTestAccount ? "Cuenta de prueba: tiene todos los productos y no vence." : "Ya no es cuenta de prueba." };
}
