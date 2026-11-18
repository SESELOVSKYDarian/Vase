import { prisma } from "@/lib/db/prisma";

/**
 * Cuántos productos distintos tiene activos la cuenta (Business, Labs, Management, Rest). Con más de uno,
 * Catálogo, Clientes y Pedidos se manejan desde app (grupo Compartido) y Business y Labs no los muestran.
 */
export async function countActiveProducts(tenantId: string) {
  const modules = await prisma.tenantModule.findMany({
    where: { tenantId, isActive: true },
    select: { module: { select: { product: true } } },
  });
  return new Set(modules.map((row) => row.module.product)).size;
}

export async function hasSharedProducts(tenantId: string) {
  return (await countActiveProducts(tenantId).catch(() => 0)) > 1;
}
