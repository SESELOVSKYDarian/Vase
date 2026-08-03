import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  buildPiquimCategoryGroups,
  fetchAllCatalogPages,
  paginateCatalogItems,
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

  it("shows exactly 20 Piquim products per page", () => {
    const products = Array.from({ length: 45 }, (_, index) => ({ id: `product-${index + 1}` }));

    expect(paginateCatalogItems(products, 2, 20)).toEqual({
      items: products.slice(20, 40), currentPage: 2, totalPages: 3, totalItems: 45,
    });
  });

  it("clamps a Piquim page after filters reduce the result", () => {
    const products = Array.from({ length: 5 }, (_, index) => ({ id: `product-${index + 1}` }));

    expect(paginateCatalogItems(products, 4, 20)).toEqual({
      items: products, currentPage: 1, totalPages: 1, totalItems: 5,
    });
  });

  it("normalizes Piquim pagination inputs", () => {
    const products = Array.from({ length: 45 }, (_, index) => ({ id: `product-${index + 1}` }));

    expect(paginateCatalogItems(products, 1.5, 2)).toMatchObject({
      items: products.slice(0, 2), currentPage: 1, totalPages: 23, totalItems: 45,
    });
    expect(paginateCatalogItems(products, 2, 2.5)).toMatchObject({
      items: products.slice(2, 4), currentPage: 2, totalPages: 23, totalItems: 45,
    });
    [Infinity, Number.NaN, "invalid"].forEach((pageSize) => {
      expect(paginateCatalogItems(products, 2, pageSize)).toMatchObject({
        items: products.slice(20, 40), currentPage: 2, totalPages: 3, totalItems: 45,
      });
    });
    expect(paginateCatalogItems(products, 2, 0)).toMatchObject({
      items: products.slice(1, 2), currentPage: 2, totalPages: 45, totalItems: 45,
    });
    [Infinity, "invalid"].forEach((requestedPage) => {
      expect(paginateCatalogItems(products, requestedPage, 20)).toMatchObject({
        items: products.slice(0, 20), currentPage: 1, totalPages: 3, totalItems: 45,
      });
    });
    expect(paginateCatalogItems(null, "invalid", "invalid")).toEqual({
      items: [], currentPage: 1, totalPages: 1, totalItems: 0,
    });
  });

  it("renders progressive Piquim loading and retry states", async () => {
    const source = await readFile(
      new URL("../apps/vase-editor/web/src/pages/store/CatalogPage.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Cargando productos...");
    expect(source).toContain("Cargando más productos...");
    expect(source).toContain("No se pudieron cargar algunos productos");
    expect(source).toContain("onRetry");
  });
});
