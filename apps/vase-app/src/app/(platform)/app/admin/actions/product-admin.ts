"use server";

// Admin › Productos: precio de cada plan y características prendidas o apagadas para todos.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getAdminProduct } from "@/lib/admin/product-catalog";
import { createAuditLog } from "@/server/services/audit-log";
import { ensureProductFeatures } from "@/server/services/product-features";

export type ProductActionResult = { ok: boolean; message?: string };

async function requireSuperAdmin() {
  try {
    return await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    return null;
  }
}

const TYPES = ["ONE_TIME", "MONTHLY", "YEARLY"] as const;

/** Nuevo precio de un plan. El anterior queda guardado como histórico (inactivo). */
export async function setPlanPriceAction(input: { productId: string; submoduleId: string; price: number; type: string }): Promise<ProductActionResult> {
  const session = await requireSuperAdmin();
  if (!session) return { ok: false, message: "Solo el admin cambia precios." };
  const product = getAdminProduct(input.productId);
  if (!product) return { ok: false, message: "Producto desconocido." };
  const price = Math.round(Number(input.price) * 100) / 100;
  if (!(price >= 0 && price < 1_000_000_000)) return { ok: false, message: "El precio no es válido." };
  const type = (TYPES as readonly string[]).includes(input.type) ? (input.type as (typeof TYPES)[number]) : "MONTHLY";
  const plan = await prisma.moduleSubmodule.findFirst({ where: { id: input.submoduleId, moduleId: product.moduleId }, select: { id: true, name: true } });
  if (!plan) return { ok: false, message: "Ese plan no es de este producto." };

  await prisma.$transaction([
    prisma.moduleSubmodulePricing.updateMany({ where: { submoduleId: plan.id, isActive: true }, data: { isActive: false } }),
    prisma.moduleSubmodulePricing.create({ data: { submoduleId: plan.id, price, currency: "ARS", type, isActive: true } }),
  ]);
  await createAuditLog({
    action: "platform.module_submodule_pricing_updated",
    targetType: "module_submodule_pricing",
    targetId: plan.id,
    actorUserId: session.user.id,
    metadata: { product: product.id, plan: plan.name, price, type },
  });
  revalidatePath(`/app/admin/modules/${product.id}`);
  revalidatePath("/app/admin/modules");
  return { ok: true, message: `Precio de ${plan.name} guardado.` };
}

/** Precio del producto cuando no tiene planes (un solo precio). */
export async function setProductPriceAction(input: { productId: string; price: number; type: string }): Promise<ProductActionResult> {
  const session = await requireSuperAdmin();
  if (!session) return { ok: false, message: "Solo el admin cambia precios." };
  const product = getAdminProduct(input.productId);
  if (!product) return { ok: false, message: "Producto desconocido." };
  const price = Math.round(Number(input.price) * 100) / 100;
  if (!(price >= 0 && price < 1_000_000_000)) return { ok: false, message: "El precio no es válido." };
  const type = (TYPES as readonly string[]).includes(input.type) ? (input.type as (typeof TYPES)[number]) : "MONTHLY";
  await prisma.$transaction([
    prisma.modulePricing.updateMany({ where: { moduleId: product.moduleId, isActive: true }, data: { isActive: false } }),
    prisma.modulePricing.create({ data: { moduleId: product.moduleId, price, currency: "ARS", type, isActive: true } }),
  ]);
  await createAuditLog({ action: "platform.module_pricing_updated", targetType: "module", targetId: product.moduleId, actorUserId: session.user.id, metadata: { price, type } });
  revalidatePath(`/app/admin/modules/${product.id}`);
  revalidatePath("/app/admin/modules");
  return { ok: true, message: "Precio guardado." };
}

/** Prende o apaga una característica para todos los clientes del producto. */
export async function setFeatureForEveryoneAction(input: { productId: string; key: string; active: boolean }): Promise<ProductActionResult> {
  const session = await requireSuperAdmin();
  if (!session) return { ok: false, message: "Solo el admin cambia esto." };
  const product = getAdminProduct(input.productId);
  if (!product) return { ok: false, message: "Producto desconocido." };
  const features = await ensureProductFeatures(product);
  const feature = features.get(input.key);
  if (!feature) return { ok: false, message: "Característica desconocida." };
  await prisma.moduleFeature.update({ where: { id: feature.id }, data: { isActive: input.active } });
  await createAuditLog({
    action: "platform.module_feature_updated",
    targetType: "module_feature",
    targetId: feature.id,
    actorUserId: session.user.id,
    metadata: { product: product.id, key: input.key, active: input.active },
  });
  revalidatePath(`/app/admin/modules/${product.id}`);
  return { ok: true };
}
