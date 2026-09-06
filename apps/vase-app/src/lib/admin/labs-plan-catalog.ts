import type { LabsEntitlementPlan } from "@/lib/admin/client-product-access";

export type LabsPlanCatalogItem = {
  submoduleId: string;
  plan: LabsEntitlementPlan;
  label: string;
};

type LabsCatalogModule = {
  id: string;
  product: string;
  submodules: Array<{ id: string; key: string }>;
};

const labsPlanOrder: LabsEntitlementPlan[] = ["STARTER", "PRO", "GROWTH"];

export function getLabsPlanCatalog(modules: readonly LabsCatalogModule[]): LabsPlanCatalogItem[] {
  const labsModule = modules.find((module) => module.id === "vase_labs" && module.product === "LABS");

  return labsPlanOrder
    .map((plan) => labsModule?.submodules.find((submodule) => submodule.key.toUpperCase() === plan))
    .filter((submodule): submodule is { id: string; key: string } => Boolean(submodule))
    .map((submodule) => ({
      submoduleId: submodule.id,
      plan: submodule.key.toUpperCase() as LabsEntitlementPlan,
      label: submodule.key.charAt(0).toUpperCase() + submodule.key.slice(1).toLowerCase(),
    }));
}
