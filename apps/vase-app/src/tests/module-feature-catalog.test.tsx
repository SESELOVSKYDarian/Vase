import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createModuleFeatureSchema,
  deleteModuleFeatureSchema,
  updateModuleFeatureSchema,
} from "@/lib/validators/admin";
import { AdminModulesConsole, FeatureDefaultInput } from "@/components/admin/admin-modules-console";
import { getBusinessFeatureScope, parseModuleFeatureDefault } from "@/server/services/module-features";
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

  it("rejects unknown fields on every feature mutation schema", () => {
    const values = {
      name: "Catálogo",
      valueType: "BOOLEAN" as const,
      trialDefault: true,
      activeDefault: false,
      minValue: null,
      maxValue: null,
      sortOrder: 0,
      isActive: true,
      unexpected: "nope",
    };
    expect(createModuleFeatureSchema.safeParse({ moduleId, key: "catalog", ...values }).success).toBe(false);
    expect(updateModuleFeatureSchema.safeParse({ featureId: submoduleId, ...values }).success).toBe(false);
    expect(deleteModuleFeatureSchema.safeParse({ featureId: submoduleId, unexpected: "nope" }).success).toBe(false);
  });
});

describe("module feature FormData defaults", () => {
  it("keeps invalid boolean and integer values invalid while preserving an explicit empty TEXT default", () => {
    const defaults = new FormData();
    defaults.set("boolean", "not-a-boolean");
    defaults.set("integer", "2.5");
    defaults.set("text", "");

    const invalidBoolean = parseModuleFeatureDefault(defaults, "boolean", "BOOLEAN");
    const invalidInteger = parseModuleFeatureDefault(defaults, "integer", "INTEGER");
    const emptyText = parseModuleFeatureDefault(defaults, "text", "TEXT");
    expect(invalidBoolean).toBe("not-a-boolean");
    expect(invalidInteger).toBe("2.5");
    expect(emptyText).toBe("");
    expect(parseModuleFeatureDefault(new FormData(), "missing", "TEXT")).toBeNull();
    expect(createModuleFeatureSchema.safeParse({
      moduleId, key: "flag", name: "Flag", valueType: "BOOLEAN", trialDefault: invalidBoolean,
      activeDefault: false, minValue: null, maxValue: null, sortOrder: 0, isActive: true,
    }).success).toBe(false);
    expect(createModuleFeatureSchema.safeParse({
      moduleId, key: "integer", name: "Entero", valueType: "INTEGER", trialDefault: invalidInteger,
      activeDefault: 1, minValue: null, maxValue: null, sortOrder: 0, isActive: true,
    }).success).toBe(false);
    const textResult = createModuleFeatureSchema.safeParse({
      moduleId, key: "text", name: "Texto", valueType: "TEXT", trialDefault: emptyText,
      activeDefault: "", minValue: null, maxValue: null, sortOrder: 0, isActive: true,
    });
    expect(textResult.success).toBe(true);
    if (textResult.success) expect(textResult.data.trialDefault).toBe("");
  });

  it("round-trips explicit null, empty TEXT, and zero INTEGER values through default modes", () => {
    const defaults = new FormData();
    defaults.set("textMode", "null");
    defaults.set("text", "");
    defaults.set("integerMode", "value");
    defaults.set("integer", "0");
    expect(parseModuleFeatureDefault(defaults, "text", "TEXT")).toBeNull();
    expect(parseModuleFeatureDefault(defaults, "integer", "INTEGER")).toBe(0);

    defaults.set("textMode", "value");
    expect(parseModuleFeatureDefault(defaults, "text", "TEXT")).toBe("");
    defaults.set("integerMode", "null");
    expect(parseModuleFeatureDefault(defaults, "integer", "INTEGER")).toBeNull();
    defaults.set("integerMode", "invalid");
    const invalidMode = parseModuleFeatureDefault(defaults, "integer", "INTEGER");
    expect(invalidMode).toBeUndefined();
    expect(createModuleFeatureSchema.safeParse({
      moduleId, key: "invalid-mode", name: "Modo", valueType: "INTEGER", trialDefault: invalidMode,
      activeDefault: 0, minValue: null, maxValue: null, sortOrder: 0, isActive: true,
    }).success).toBe(false);
  });
});

describe("module feature default input", () => {
  it("renders null and explicit empty TEXT defaults with different modes", () => {
    const nullMarkup = renderToStaticMarkup(
      <FeatureDefaultInput label="Trial" field="trialDefault" valueType="TEXT" defaultValue={null} />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <FeatureDefaultInput label="Trial" field="trialDefault" valueType="TEXT" defaultValue="" />,
    );

    expect(nullMarkup).toContain('name="trialDefaultMode"');
    expect(nullMarkup).toContain('value="null" selected=""');
    expect(emptyMarkup).toContain('value="value" selected=""');
    expect(emptyMarkup).toContain('name="trialDefault"');
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
