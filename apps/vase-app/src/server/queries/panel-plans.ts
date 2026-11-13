import { prisma } from "@/lib/db/prisma";
import { formatPlanPrice, planSortAmount, type PanelPlan } from "@/components/panel/products";

/** Planes activos con los precios cargados en el panel de administración, por módulo. */
export async function getPanelPlanCatalog() {
  const rows = await prisma.moduleSubmodule.findMany({
    where: { isActive: true },
    select: {
      moduleId: true,
      key: true,
      name: true,
      description: true,
      pricing: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        select: { price: true, currency: true, type: true },
      },
    },
  });

  const catalog = new Map<string, Array<PanelPlan & { sort: number }>>();
  for (const row of rows) {
    const pricing = row.pricing.map((item) => ({ price: Number(item.price), currency: item.currency, type: item.type }));
    const plans = catalog.get(row.moduleId) ?? [];
    plans.push({
      key: row.key,
      name: row.name,
      description: row.description ?? "",
      price: formatPlanPrice(pricing),
      sort: planSortAmount(pricing),
    });
    catalog.set(row.moduleId, plans);
  }

  return (moduleId: string): PanelPlan[] =>
    (catalog.get(moduleId) ?? [])
      .sort((left, right) => left.sort - right.sort)
      .map(({ key, name, description, price }) => ({ key, name, description, price }));
}
