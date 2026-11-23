// Características por cliente. El catálogo vive en código (lib/admin/product-catalog.ts) y se copia a
// ModuleFeature la primera vez que hace falta. Un cliente tiene todo prendido salvo lo que se apague a mano
// (TenantFeatureGrant con enabled=false). Una característica apagada para todos (isActive=false) no la tiene nadie.
import { prisma } from "@/lib/db/prisma";
import { ADMIN_PRODUCTS, type AdminProduct } from "@/lib/admin/product-catalog";

/** Crea en la base las características del catálogo que falten. Devuelve id por clave. */
export async function ensureProductFeatures(product: AdminProduct) {
  const existing = await prisma.moduleFeature.findMany({
    where: { moduleId: product.moduleId, submoduleId: null },
    select: { id: true, key: true, isActive: true, name: true, description: true },
  });
  const byKey = new Map(existing.map((row) => [row.key, row]));
  for (const [index, feature] of product.features.entries()) {
    if (byKey.has(feature.key)) continue;
    const created = await prisma.moduleFeature
      .create({
        data: { moduleId: product.moduleId, key: feature.key, name: feature.name, description: feature.description, sortOrder: index, valueType: "BOOLEAN" },
        select: { id: true, key: true, isActive: true, name: true, description: true },
      })
      .catch(() => null);
    if (created) byKey.set(created.key, created);
  }
  return byKey;
}

/** Qué características tiene apagadas una cuenta, por producto (claves). */
export async function getDisabledFeatureKeys(tenantId: string) {
  const [grants, globallyOff] = await Promise.all([
    prisma.tenantFeatureGrant.findMany({
      where: { tenantId, enabled: false },
      select: { feature: { select: { moduleId: true, key: true } } },
    }),
    prisma.moduleFeature.findMany({ where: { isActive: false, submoduleId: null }, select: { moduleId: true, key: true } }),
  ]);
  const result: Record<string, string[]> = {};
  for (const row of [...grants.map((grant) => grant.feature), ...globallyOff]) {
    const keys = (result[row.moduleId] ??= []);
    if (!keys.includes(row.key)) keys.push(row.key);
  }
  return result;
}

/** Guarda qué queda prendido para la cuenta en un producto. */
export async function setTenantFeatures(tenantId: string, moduleId: string, enabledKeys: string[]) {
  const product = ADMIN_PRODUCTS.find((item) => item.moduleId === moduleId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  const features = await ensureProductFeatures(product);
  const enabled = new Set(enabledKeys);
  await prisma.$transaction(
    [...features.values()].map((feature) =>
      prisma.tenantFeatureGrant.upsert({
        where: { tenantId_featureId: { tenantId, featureId: feature.id } },
        create: { tenantId, featureId: feature.id, enabled: enabled.has(feature.key) },
        update: { enabled: enabled.has(feature.key) },
      }),
    ),
  );
}
