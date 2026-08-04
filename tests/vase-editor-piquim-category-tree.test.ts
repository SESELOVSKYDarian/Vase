import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

import {
  buildCatalogPaginationModel,
  buildPiquimCategoryGroups,
  fetchAllCatalogPages,
  paginateCatalogItems,
  resolvePiquimProductGroups,
  selectCanonicalCatalogMemberships,
  synchronizeCatalogPageRequest,
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

  it("synchronizes a clamped page so it does not resurrect after products grow", () => {
    let requestedPage = 3;
    const shrunken = paginateCatalogItems(
      Array.from({ length: 5 }, (_, index) => ({ id: `product-${index + 1}` })),
      requestedPage,
      20,
    );

    requestedPage = synchronizeCatalogPageRequest(requestedPage, shrunken.currentPage);
    expect(requestedPage).toBe(1);

    const regrown = paginateCatalogItems(
      Array.from({ length: 45 }, (_, index) => ({ id: `product-${index + 1}` })),
      requestedPage,
      20,
    );
    expect(regrown.currentPage).toBe(1);
  });

  it("deduplicates product identities before taking a 20-item page", () => {
    const products = Array.from({ length: 21 }, (_, index) => ({
      id: `product-${index + 1}`,
      sectionTitle: "canonical",
    }));
    const membershipRows = [
      products[0],
      { ...products[0], sectionTitle: "duplicate" },
      ...products.slice(1),
    ];

    const uniqueProducts = selectCanonicalCatalogMemberships(membershipRows);
    const firstPage = paginateCatalogItems(uniqueProducts, 1, 20);

    expect(uniqueProducts?.[0]).toBe(products[0]);
    expect(firstPage.totalItems).toBe(21);
    expect(firstPage.items).toHaveLength(20);
    expect(new Set(firstPage.items.map((item) => item.id)).size).toBe(20);
  });

  it("selects the first stable membership after applying category filters", () => {
    const primaryMembership = {
      id: "multi-category-product",
      sectionTitle: "Primary group",
      familyTitle: "Primary category",
    };
    const secondaryMembership = {
      id: "multi-category-product",
      sectionTitle: "Secondary group",
      familyTitle: "Secondary category",
    };
    const orderedMemberships = [primaryMembership, secondaryMembership];

    const unfilteredCards = selectCanonicalCatalogMemberships(orderedMemberships);
    const secondaryMatches = orderedMemberships.filter(
      (membership) => membership.familyTitle === "Secondary category",
    );
    const filteredCards = selectCanonicalCatalogMemberships(secondaryMatches);

    expect(unfilteredCards).toEqual([primaryMembership]);
    expect(filteredCards).toEqual([secondaryMembership]);
    expect(new Set(filteredCards.map((item) => item.id))).toEqual(new Set(["multi-category-product"]));
  });

  it("builds a compact Piquim page and ellipsis model", () => {
    expect(buildCatalogPaginationModel(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
    expect(buildCatalogPaginationModel(1, 3)).toEqual([1, 2, 3]);
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

  it("paginates the filtered Piquim catalog in the interface", async () => {
    const source = await readFile(
      new URL("../apps/vase-editor/web/src/pages/store/CatalogPage.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const PIQUIM_PAGE_SIZE = 20");
    expect(source).toContain("paginateCatalogItems(filteredProducts, catalogPage, PIQUIM_PAGE_SIZE)");
    expect(source).toContain("return selectCanonicalCatalogMemberships(normalizedProducts.filter((item) => {");
    expect(source).toContain("synchronizeCatalogPageRequest(currentPage, paginatedProducts.currentPage)");
    expect(source).toContain("buildCatalogPaginationModel(paginatedProducts.currentPage, paginatedProducts.totalPages)");
    expect(source).toContain('<nav aria-label="Paginacion del catalogo">');
    const paginationNav = source.match(/<nav aria-label="Paginacion del catalogo">[\s\S]*?<\/nav>/)?.[0];
    expect(paginationNav).toContain('label="Anterior"');
    expect(paginationNav).toContain('label="Siguiente"');
    expect(paginationNav).toContain('aria-hidden="true"');
  });

  it("resets the Piquim page in all six local filter interactions", async () => {
    const source = await readFile(
      new URL("../apps/vase-editor/web/src/pages/store/CatalogPage.jsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/const handleQueryChange = \(value\) => \{\s*setQuery\(value\);\s*setCatalogPage\(1\);\s*\};/);
    expect(source).toMatch(/const handleSuggestionPick = \(value\) => \{\s*handleQueryChange\(value\);\s*\};/);
    expect(source).toMatch(/const toggleFilter = \(setter, value\) => \{[\s\S]*?setCatalogPage\(1\);\s*\};/);
    expect(source).toContain("onToggleType={(value) => toggleFilter(setTypeFilters, value)}");
    expect(source).toContain("onToggleFormat={(value) => toggleFilter(setFormatFilters, value)}");
    expect(source).toContain("onToggleFlavor={(value) => toggleFilter(setFlavorFilters, value)}");
    expect(source).toMatch(/const handleStockChange = \(value\) => \{\s*setStockOnly\(value\);\s*setCatalogPage\(1\);\s*\};/);
    expect(source).toContain("onChange={(event) => onQueryChange(event.target.value)}");
    expect(source).toContain("onChange={(event) => onStockChange(event.target.checked)}");
  });
});
