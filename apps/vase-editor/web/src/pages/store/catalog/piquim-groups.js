// Reglas para ubicar cada producto de Piquim en su grupo y sabor.
import { normalizeCatalogLabel } from "./filters.js";

export const getConfiguredGroupTitles = (catalog) =>
    Array.isArray(catalog?.productGroups)
        ? catalog.productGroups.map((group) => group.title).filter(Boolean)
        : [];

export const getConfiguredCategoryTitles = (catalog) =>
    Array.isArray(catalog?.productGroups)
        ? catalog.productGroups.flatMap((group) =>
            (Array.isArray(group.categories) ? group.categories : []).map((category) => category.title).filter(Boolean)
        )
        : [];

export const getPiquimCatalogDisplayLabel = (catalog) => {
    const fixedLabels = {
        heladeria: 'Heladería',
        panaderia: 'Panadería/Confitería',
        confiteria: 'Panadería/Confitería',
    };
    return fixedLabels[catalog?.slug] || String(catalog?.headingAccent || catalog?.slug || 'Catalogo').replace(/^de\s+/i, '');
};

export const matchesCatalogKeyword = (haystack, value) => {
    const normalized = normalizeCatalogLabel(value);
    return Boolean(normalized) && haystack.includes(normalized);
};

export const getFlavorSearchTerms = (flavor) => [
    flavor?.name,
    ...(Array.isArray(flavor?.keywords) ? flavor.keywords : []),
    ...String(flavor?.name || "").split("/"),
].map((item) => String(item || "").trim()).filter(Boolean);

export const resolveConfiguredProductGroups = (catalog, product, labels = {}) => {
    if (!Array.isArray(catalog?.productGroups) || !catalog.productGroups.length) return [];

    const data = product?.data || {};
    const categoryNames = Array.isArray(product?.category_names) ? product.category_names : [];
    const categoryPaths = Array.isArray(product?.category_paths) ? product.category_paths : [];
    const sourcePath = [
        ...categoryPaths,
        ...categoryNames,
        ...(Array.isArray(product?.source_category_path) ? product.source_category_path : []),
        ...(Array.isArray(data?.source_category_path) ? data.source_category_path : []),
    ];
    const haystack = normalizeCatalogLabel([
        product?.name,
        product?.sku,
        product?.erp_id,
        product?.category?.name,
        data?.category,
        data?.source_category,
        labels.category,
        labels.type,
        labels.format,
        ...sourcePath,
    ].filter(Boolean).join(" "));
    const matches = [];
    const seen = new Set();

    const addMatch = (groupTitle, categoryTitle) => {
        const key = `${groupTitle}::${categoryTitle}`;
        if (seen.has(key)) return;
        seen.add(key);
        matches.push({ groupTitle, categoryTitle });
    };

    for (const group of catalog.productGroups) {
        const groupKeywords = [
            group.title,
            ...(Array.isArray(group.keywords) ? group.keywords : []),
            ...(Array.isArray(group.flavors) ? group.flavors.flatMap(getFlavorSearchTerms) : []),
        ];
        const groupMatches = groupKeywords.some((keyword) => matchesCatalogKeyword(haystack, keyword));
        const categories = Array.isArray(group.categories) ? group.categories : [];

        for (const category of categories) {
            const categoryKeywords = [category.title, ...(Array.isArray(category.keywords) ? category.keywords : [])];
            if (categoryKeywords.some((keyword) => matchesCatalogKeyword(haystack, keyword))) {
                addMatch(group.title, category.title);
            }
        }

        if (groupMatches && !matches.some((item) => item.groupTitle === group.title)) {
            addMatch(group.title, categories[0]?.title || group.title);
        }
    }

    return matches;
};

export const resolveConfiguredProductGroup = (catalog, product, labels = {}) =>
    resolveConfiguredProductGroups(catalog, product, labels)[0] || null;

export const resolveConfiguredProductFlavor = (catalog, groupTitle, product, labels = {}) => {
    if (!Array.isArray(catalog?.productGroups) || !groupTitle) return null;
    const group = catalog.productGroups.find((item) => item.title === groupTitle);
    const flavors = Array.isArray(group?.flavors) ? group.flavors : [];
    if (!flavors.length) return null;

    const data = product?.data || {};
    const categoryNames = Array.isArray(product?.category_names) ? product.category_names : [];
    const categoryPaths = Array.isArray(product?.category_paths) ? product.category_paths : [];
    const sourcePath = [
        ...categoryPaths,
        ...categoryNames,
        ...(Array.isArray(product?.source_category_path) ? product.source_category_path : []),
        ...(Array.isArray(data?.source_category_path) ? data.source_category_path : []),
    ];
    const haystack = normalizeCatalogLabel([
        product?.name,
        product?.sku,
        product?.erp_id,
        product?.category?.name,
        data?.category,
        data?.source_category,
        labels.category,
        labels.type,
        labels.format,
        ...sourcePath,
    ].filter(Boolean).join(" "));

    return flavors.find((flavor) => getFlavorSearchTerms(flavor).some((term) => matchesCatalogKeyword(haystack, term))) || null;
};
