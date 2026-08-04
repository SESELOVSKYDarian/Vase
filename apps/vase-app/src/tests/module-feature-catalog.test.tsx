import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createModuleFeatureSchema,
  updateModuleFeatureSchema,
} from "@/lib/validators/admin";
import { AdminModulesConsole } from "@/components/admin/admin-modules-console";
import { getBusinessFeatureScope } from "@/server/services/module-features";
import { serializeModuleFeature } from "@/server/queries/modules-admin";

vi.mock("@/app/(platform)/app/admin/actions", () => ({
  createAdminModuleAction: vi.fn(),
  createModuleSubmoduleAction: vi.fn(),
  deleteAdminModuleAction: vi.fn(),
  deleteModuleSubmoduleAction: vi.fn(),
  updateAdminModuleAction: vi.fn(),
  updateModuleSubmoduleAction: vi.fn(),
  createModuleFeatureAction: vi.fn(),
  updateModuleFeatureAction: vi.fn(),
  deleteModuleFeatureAction: vi.fn(),
}));

const moduleId = "business";
const submoduleId = "ckabcdefghijklmnopqrstuv";

describe("module feature catalog validation", () => {
  it("normalizes a stable key and accepts defaults matching its BOOLEAN value type", () => {
    const parsed = createModuleFeatureSchema.safeParse({
      moduleId,
      key: "  Public Feature ",
      name: "Feature pública",
      description: "Visible para clientes",
      valueType: "BOOLEAN",
      trialDefault: true,
      activeDefault: false,
      minValue: null,
      maxValue: null,
      sortOrder: 2,
      isActive: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.key).toBe("public-feature");
  });

  it("accepts constrained INTEGER defaults and rejects invalid bounds or defaults", () => {
    expect(createModuleFeatureSchema.safeParse({
      moduleId,
      key: "max_users",
      name: "Usuarios máximos",
      valueType: "INTEGER",
      trialDefault: 2,
      activeDefault: 10,
      minValue: 1,
      maxValue: 20,
      sortOrder: 0,
      isActive: true,
    }).success).toBe(true);

    expect(createModuleFeatureSchema.safeParse({
      moduleId,
      key: "max_users",
      name: "Usuarios máximos",
      valueType: "INTEGER",
      trialDefault: 21,
      activeDefault: 10,
      minValue: 1,
      maxValue: 20,
      sortOrder: 0,
      isActive: true,
    }).success).toBe(false);

    expect(updateModuleFeatureSchema.safeParse({
      featureId: "ckabcdefghijklmnopqrstuv",
      name: "Usuarios máximos",
      valueType: "INTEGER",
      trialDefault: 1,
      activeDefault: 3,
      minValue: 8,
      maxValue: 2,
      sortOrder: 0,
      isActive: true,
    }).success).toBe(false);
  });

  it("rejects defaults that do not match TEXT or BOOLEAN types", () => {
    expect(createModuleFeatureSchema.safeParse({
      moduleId,
      key: "welcome_text",
      name: "Texto de bienvenida",
      valueType: "TEXT",
      trialDefault: true,
      activeDefault: "Hola",
      minValue: null,
      maxValue: null,
      sortOrder: 0,
      isActive: true,
    }).success).toBe(false);
  });
});

describe("Business feature catalog console", () => {
  it("renders characteristics exclusively for Business modules", () => {
    const html = renderToStaticMarkup(
      <AdminModulesConsole initialExpandedModuleIds={[moduleId]} modules={[
        {
          id: "business",
          name: "Business",
          description: null,
          product: "BUSINESS",
          route: "/business",
          isActive: true,
          features: [],
          submodules: [{
            id: submoduleId,
            key: "plantilla",
            name: "Plantilla",
            description: null,
            route: "/business/plantilla",
            isActive: true,
            features: [],
          }],
        },
        {
          id: "labs",
          name: "Labs",
          description: null,
          product: "LABS",
          route: "/labs",
          isActive: true,
          features: [],
          submodules: [],
        },
      ]}
    />,
    );

    expect(html).toContain("Características");
    expect(html).toContain("Crear característica");
    expect(html).not.toContain("Características de Labs");
  });
});

describe("Business feature ownership", () => {
  it("accepts only a Plantilla or Personalizado submodule owned by the Business module", async () => {
    const database = {
      module: { findUnique: vi.fn().mockResolvedValue({ id: moduleId, product: "BUSINESS" }) },
      moduleSubmodule: { findUnique: vi.fn().mockResolvedValue({ id: submoduleId, moduleId, key: "plantilla" }) },
    };

    await expect(getBusinessFeatureScope(database, { moduleId, submoduleId })).resolves.toEqual({
      moduleId,
      submoduleId,
    });

    database.moduleSubmodule.findUnique.mockResolvedValueOnce({ id: submoduleId, moduleId: "labs", key: "plantilla" });
    await expect(getBusinessFeatureScope(database, { moduleId, submoduleId })).rejects.toThrow("no pertenece");
  });
});

describe("module feature query serialization", () => {
  it("only exposes primitive feature defaults to the client catalog", () => {
    expect(serializeModuleFeature({
      id: "feature-1",
      key: "catalog_enabled",
      name: "Catálogo",
      description: null,
      valueType: "BOOLEAN",
      trialDefault: true,
      activeDefault: { unexpected: true },
      minValue: null,
      maxValue: null,
      sortOrder: 1,
      isActive: true,
    })).toMatchObject({ trialDefault: true, activeDefault: null, valueType: "BOOLEAN" });
  });
});
