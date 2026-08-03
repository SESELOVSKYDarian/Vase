import { describe, expect, it, vi } from "vitest";

import {
  buildPiquimCategoryGroups,
  fetchAllCatalogPages,
  resolvePiquimProductGroups,
} from "../apps/vase-editor/web/src/utils/piquimCatalogCategories.js";

const categories = [
  { id: "heladeria", slug: "heladeria", name: "Heladeria", parentId: null },
  { id: "estabilizantes", slug: "estabilizantes", name: "Estabilizantes", parentId: "heladeria" },
  { id: "bases", slug: "bases-en-polvo", name: "Bases en polvo", parentId: "estabilizantes" },
  { id: "neutros", slug: "neutros-artesanales", name: "Neutros artesanales", parentId: "estabilizantes" },
  { id: "aditivos", slug: "aditivos", name: "Aditivos", parentId: "heladeria" },
  { id: "pronto", slug: "pronto-mix", name: "Pronto Mix", parentId: "aditivos" },
  { id: "panaderia", slug: "panaderia-confiteria", name: "Panaderia/Confiteria", parentId: null },
];

describe("Piquim public category tree", () => {
  it("builds Tipo de Producto from the categories stored below the catalog root", () => {
    const groups = buildPiquimCategoryGroups(categories, "heladeria");

    expect(groups.map((group) => group.title)).toEqual(["Aditivos", "Estabilizantes"]);
    expect(groups.find((group) => group.id === "estabilizantes")?.categories.map((item) => item.title)).toEqual([
      "Bases en polvo",
      "Neutros artesanales",
    ]);
  });

  it("places products using their saved category ids instead of product-name keywords", () => {
    const groups = buildPiquimCategoryGroups(categories, "heladeria");

    expect(resolvePiquimProductGroups(groups, {
      id: "product-1",
      name: "Nombre sin palabras de categoria",
      category_ids: ["neutros"],
    })).toEqual([{ groupTitle: "Estabilizantes", categoryTitle: "Neutros artesanales" }]);
  });

  it("keeps products assigned only to the catalog root visible", () => {
    const groups = buildPiquimCategoryGroups(categories, "heladeria");

    expect(resolvePiquimProductGroups(groups, {
      id: "root-product",
      name: "Producto sin clasificacion secundaria",
      category_ids: ["heladeria"],
    }, "Sin subcategoría")).toEqual([
      { groupTitle: "Sin subcategoría", categoryTitle: "Sin subcategoría" },
    ]);
  });

  it("loads every page of a Piquim subcatalog", async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      total_pages: 3,
      items: [{ id: `product-${page}` }],
    }));

    await expect(fetchAllCatalogPages(fetchPage)).resolves.toEqual({
      items: [{ id: "product-1" }, { id: "product-2" }, { id: "product-3" }],
      total: 3,
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("publishes accumulated products after every catalog page", async () => {
    const snapshots: string[][] = [];
    const fetchPage = vi.fn(async (page: number) => ({
      total_pages: 3,
      total: 3,
      items: [{ id: `product-${page}` }],
    }));

    await fetchAllCatalogPages(fetchPage, (progress) => {
      snapshots.push(progress.items.map((item: { id: string }) => item.id));
    });

    expect(snapshots).toEqual([
      ["product-1"],
      ["product-1", "product-2"],
      ["product-1", "product-2", "product-3"],
    ]);
  });
});
