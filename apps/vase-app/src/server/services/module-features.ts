type FeatureScopeDatabase = {
  module: {
    findUnique(args: { where: { id: string }; select: { id: true; product: true } }): Promise<{
      id: string;
      product: string;
    } | null>;
  };
  moduleSubmodule: {
    findUnique(args: { where: { id: string }; select: { id: true; moduleId: true; key: true } }): Promise<{
      id: string;
      moduleId: string;
      key: string;
    } | null>;
  };
};

type FeatureScopeInput = {
  moduleId: string;
  submoduleId?: string | null;
};

export function parseModuleFeatureDefault(
  formData: FormData,
  field: string,
  valueType: unknown,
): boolean | number | string | null | undefined {
  const mode = formData.get(`${field}Mode`);
  if (mode !== null) {
    if (mode === "null") return null;
    if (mode !== "value") return undefined;
  }

  const rawValue = formData.get(field);
  if (mode === "value" && valueType === "INTEGER" && (rawValue === null || rawValue === "")) {
    return undefined;
  }
  if (rawValue === null) return null;
  const value = String(rawValue);

  if (valueType === "TEXT") return value;
  if (value === "") return null;
  if (valueType === "BOOLEAN") {
    return value === "true" ? true : value === "false" ? false : value;
  }
  if (valueType === "INTEGER") {
    return /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return value;
}

export async function getBusinessFeatureScope(
  database: FeatureScopeDatabase,
  input: FeatureScopeInput,
): Promise<{ moduleId: string; submoduleId: string | null }> {
  const parentModule = await database.module.findUnique({
    where: { id: input.moduleId },
    select: { id: true, product: true },
  });

  if (!parentModule || parentModule.product !== "BUSINESS") {
    throw new Error("Las características solo están disponibles para Vase Business.");
  }

  if (!input.submoduleId) {
    return { moduleId: parentModule.id, submoduleId: null };
  }

  const submodule = await database.moduleSubmodule.findUnique({
    where: { id: input.submoduleId },
    select: { id: true, moduleId: true, key: true },
  });

  if (!submodule || submodule.moduleId !== parentModule.id) {
    throw new Error("El submódulo no pertenece al módulo Business seleccionado.");
  }

  if (!isBusinessFeatureSubmoduleKey(submodule.key)) {
    throw new Error("Las características solo pueden asignarse a Plantilla o Personalizado.");
  }

  return { moduleId: parentModule.id, submoduleId: submodule.id };
}
import { isBusinessFeatureSubmoduleKey } from "@/lib/admin/module-features";
