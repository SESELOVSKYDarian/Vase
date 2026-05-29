import { platformModules } from "@/config/modules";

export const userAccessModuleIds = {
  business: "vase_business",
  labs: "vase_labs",
} as const;

type TenantModuleAccess = {
  moduleId: string;
  isActive: boolean;
};

const moduleLabels: Map<string, string> = new Map(
  platformModules.map((module) => [
    module.id,
    module.key === "business" ? "Vase Business" : "Vase Labs",
  ]),
);

export function getUserAccessModuleLabel(moduleId: string) {
  return moduleLabels.get(moduleId) ?? moduleId;
}

export function buildTenantModuleAccessSummary(modules: TenantModuleAccess[]) {
  const activeLabels = modules
    .filter((module) => module.isActive)
    .map((module) => getUserAccessModuleLabel(module.moduleId));

  return activeLabels.length > 0 ? activeLabels.join(", ") : "Sin modulos";
}
