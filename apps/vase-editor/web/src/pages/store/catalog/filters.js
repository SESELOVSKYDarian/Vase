// Filtros del catálogo: valores por defecto, orden, historial de búsquedas y lectura/armado de la dirección.
import { createPlaceholderImage } from "../../../utils/productImage";

export const FALLBACK_IMAGE = createPlaceholderImage({ label: "Producto", width: 720, height: 720 });
export const PIQUIM_PAGE_SIZE = 20;
export const EXCLUDED_TERMS = [
    "accesorios de gas",
    "accesorios polietileno",
    "accesorios polipropileno",
    "accesorios sanitarios",
    "alessitech",
    "decca",
    "ferrum",
    "fogata"
];

export const isNotExcluded = (name) => {
    if (!name) return true;
    const lowerName = name.toLowerCase();
    return !EXCLUDED_TERMS.some(t => lowerName.includes(t));
};

export const filterCategoryTree = (categories) => {
    return categories
        .filter(c => isNotExcluded(c.name))
        .map(c => ({
            ...c,
            children: c.children ? filterCategoryTree(c.children) : []
        }));
};
export const DEFAULT_SORT = "name-asc";
export const SORT_OPTIONS = [
    { value: "name-asc", label: "Nombre A-Z" },
    { value: "name-desc", label: "Nombre Z-A" },
    { value: "price-asc", label: "Precio menor a mayor" },
    { value: "price-desc", label: "Precio mayor a menor" },
    { value: "stock-desc", label: "Mayor stock" },
    { value: "stock-asc", label: "Menor stock" },
];

export const normalizeFilterValue = (value) => {
    const raw = String(value || "").trim();
    return raw || null;
};

export const normalizeCatalogLabel = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

export const normalizePiquimCatalogSlug = (value) => {
    const normalized = normalizeCatalogLabel(value);
    return normalized === "confiteria" ? "panaderia" : normalized;
};

export const formatSearchTerm = (value) =>
    String(value || "")
        .trim()
        .replace(/\s+/g, " ");

export const SEARCH_HISTORY_KEY = "piquim_search_terms_v1";
export const SEARCH_HISTORY_LIMIT = 12;

export const readSearchHistory = () => {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => ({
                term: formatSearchTerm(item?.term || item),
                count: Number(item?.count || 0) || 0,
            }))
            .filter((item) => item.term);
    } catch {
        return [];
    }
};

export const writeSearchHistory = (nextHistory) => {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory.slice(0, SEARCH_HISTORY_LIMIT)));
    } catch {
        // ignore storage errors
    }
};

export const normalizePriceFilterValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return "";
    return String(parsed);
};

export const parseBooleanFilter = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return ["true", "1", "yes", "si", "on"].includes(normalized);
};

export const normalizeSortValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return SORT_OPTIONS.some((option) => option.value === normalized) ? normalized : DEFAULT_SORT;
};

export const getFiltersFromUrl = () => {
    const params = new URLSearchParams(window.location.search || "");
    return {
        category: normalizeFilterValue(params.get("category")),
        brand: normalizeFilterValue(params.get("brand")),
        minPrice: normalizePriceFilterValue(params.get("minPrice")),
        maxPrice: normalizePriceFilterValue(params.get("maxPrice")),
        inStock: parseBooleanFilter(params.get("inStock")),
        sort: normalizeSortValue(params.get("sort")),
        page: Math.max(1, Number(params.get("page") || 1) || 1),
        group: String(params.get("group") || "").trim(),
    };
};

export const buildCatalogHref = ({ category, brand, minPrice, maxPrice, inStock, sort, page }) => {
    const params = new URLSearchParams();
    if (normalizeFilterValue(category)) {
        params.set("category", normalizeFilterValue(category));
    }
    if (normalizeFilterValue(brand)) {
        params.set("brand", normalizeFilterValue(brand));
    }
    if (normalizePriceFilterValue(minPrice)) {
        params.set("minPrice", normalizePriceFilterValue(minPrice));
    }
    if (normalizePriceFilterValue(maxPrice)) {
        params.set("maxPrice", normalizePriceFilterValue(maxPrice));
    }
    if (inStock) {
        params.set("inStock", "true");
    }
    if (normalizeSortValue(sort) !== DEFAULT_SORT) {
        params.set("sort", normalizeSortValue(sort));
    }
    if (Number(page) > 1) params.set("page", String(Math.max(1, Number(page))));
    const query = params.toString();
    return query ? `/catalog?${query}` : "/catalog";
};
