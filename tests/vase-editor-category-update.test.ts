import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/vase-editor/server/src/routes/tenant.js", "utf8");
const route = source.slice(source.indexOf("tenantRouter.put('/categories/:id'"), source.indexOf("tenantRouter.post('/categories'"));

describe("panel admin: editar categorías", () => {
  it("existe la ruta para renombrar y mover categorías, sin tocar la estructura de la base", () => {
    expect(route.length).toBeGreaterThan(200);
    expect(route).toContain("update categories set name = $3, erp_id = $4, data = $5::jsonb");
    expect(route).not.toMatch(/alter table|create table/i);
  });

  it("al renombrar guarda el nombre del sistema para que la sincronización la siga encontrando", () => {
    expect(route).toContain("String(existing.erp_id || '').trim() || (renamed ? existing.name : null)");
    expect(route).toContain("data.source_category_label = existing.name");
  });

  it("no deja meter una categoría dentro de sí misma ni de una de sus subcategorías", () => {
    expect(route).toContain("parentId === categoryId");
    expect(route).toMatch(/parentRes\.rows\[0\]\.parent_id === categoryId/);
    expect(route.match(/category_cycle/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("el listado avisa si la categoría vino del sistema y cómo se llama allá", () => {
    const list = source.slice(source.indexOf("tenantRouter.get('/categories'"), source.indexOf("tenantRouter.put('/categories/:id'"));
    expect(list).toContain("as source_name");
    expect(list).toContain("as from_sync");
  });
});
