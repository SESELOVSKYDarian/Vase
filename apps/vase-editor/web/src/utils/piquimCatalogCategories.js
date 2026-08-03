const normalizeLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sortByName = (a, b) =>
  String(a?.name || a?.title || "").localeCompare(
    String(b?.name || b?.title || ""),
    "es",
    { sensitivity: "base" },
  );

const getCatalogAliases = (catalogSlug) => {
  const normalized = normalizeLabel(catalogSlug);
  if (["panaderia", "confiteria", "panaderia-confiteria"].includes(normalized)) {
    return new Set(["panaderia", "confiteria", "panaderia-confiteria"]);
  }
  return new Set(normalized ? [normalized] : []);
};

const getCategoryValues = (category) => [
  category?.id,
  category?.slug,
  category?.name,
].map(normalizeLabel).filter(Boolean);

const collectDescendants = (node) => {
  const descendants = [];
  const visit = (current) => {
    [...current.children].sort(sortByName).forEach((child) => {
      descendants.push(child);
      visit(child);
    });
  };
  visit(node);
  return descendants;
};

export function buildPiquimCategoryGroups(categories, catalogSlug) {
  const nodes = new Map();
  (Array.isArray(categories) ? categories : []).forEach((category) => {
    const id = String(category?.id || "").trim();
    const name = String(category?.name || category?.slug || "").trim();
    if (!id || !name) return;
    nodes.set(id, {
      ...category,
      id,
      name,
      parentId: String(category?.parentId || category?.parent_id || "").trim() || null,
      children: [],
    });
  });

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId).children.push(node);
    }
  });

  const aliases = getCatalogAliases(catalogSlug);
  const candidates = [...nodes.values()].filter((node) =>
    getCategoryValues(node).some((value) => aliases.has(value)),
  );
  const root = candidates.find((node) => !node.parentId) || candidates[0];
  if (!root) return [];

  return [...root.children].sort(sortByName).map((group) => {
    const descendants = collectDescendants(group);
    return {
      id: group.id,
      title: group.name,
      categoryIds: [group.id, ...descendants.map((item) => item.id)],
      categories: descendants.map((category) => ({
        id: category.id,
        title: category.name,
        categoryIds: [category.id],
      })),
    };
  });
}

export function resolvePiquimProductGroups(groups, product, fallbackGroupTitle = "") {
  const assignedIds = new Set([
    ...(Array.isArray(product?.category_ids) ? product.category_ids : []),
    ...(Array.isArray(product?.variations)
      ? product.variations.flatMap((variation) =>
          Array.isArray(variation?.category_ids) ? variation.category_ids : [],
        )
      : []),
  ].map((id) => String(id)));

  const matches = [];
  (Array.isArray(groups) ? groups : []).forEach((group) => {
    const matchedCategories = (Array.isArray(group?.categories) ? group.categories : [])
      .filter((category) => (category.categoryIds || [category.id]).some((id) => assignedIds.has(String(id))));

    matchedCategories.forEach((category) => {
      matches.push({ groupTitle: group.title, categoryTitle: category.title });
    });

    if (!matchedCategories.length && assignedIds.has(String(group?.id))) {
      matches.push({ groupTitle: group.title, categoryTitle: group.title });
    }
  });

  if (!matches.length && fallbackGroupTitle) {
    return [{ groupTitle: fallbackGroupTitle, categoryTitle: fallbackGroupTitle }];
  }

  return matches;
}

export function paginateCatalogItems(items, requestedPage, pageSize = 20) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const normalizedPageSize = Math.max(1, Number(pageSize) || 20);
  const totalItems = normalizedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Number(requestedPage) || 1));
  const start = (currentPage - 1) * normalizedPageSize;
  return { items: normalizedItems.slice(start, start + normalizedPageSize), currentPage, totalPages, totalItems };
}

export async function fetchAllCatalogPages(fetchPage, onProgress) {
  const firstPage = await fetchPage(1);
  const pageCount = Math.max(1, Number(firstPage?.total_pages || 1));
  const items = Array.isArray(firstPage?.items) ? [...firstPage.items] : [];
  const reportedTotal = firstPage?.total === undefined || firstPage?.total === null
    ? null
    : Number(firstPage.total);
  const total = Number.isFinite(reportedTotal) ? Math.max(items.length, reportedTotal) : null;

  onProgress?.({ items: [...items], total: total ?? items.length, page: 1, totalPages: pageCount });

  for (let page = 2; page <= pageCount; page += 1) {
    const response = await fetchPage(page);
    if (Array.isArray(response?.items)) items.push(...response.items);
    onProgress?.({ items: [...items], total: total ?? items.length, page, totalPages: pageCount });
  }

  return { items, total: total ?? items.length };
}
