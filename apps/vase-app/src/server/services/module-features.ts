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

const businessFeatureSubmoduleKeys = new Set(["plantilla", "personalizado"]);

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

  if (!businessFeatureSubmoduleKeys.has(submodule.key)) {
    throw new Error("Las características solo pueden asignarse a Plantilla o Personalizado.");
  }

  return { moduleId: parentModule.id, submoduleId: submodule.id };
}
