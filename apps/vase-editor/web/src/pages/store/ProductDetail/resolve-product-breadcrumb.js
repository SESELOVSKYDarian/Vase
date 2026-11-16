// Parte de ProductDetail.jsx: FALLBACK_IMAGE, getProductId, normalizeBreadcrumbText, toTitleLabel, getSearchParam, resolveCatalogSlugFromText y más.
import { createPlaceholderImage } from "../../../utils/productImage";

export const FALLBACK_IMAGE = createPlaceholderImage({ label: "Producto", width: 900, height: 900 });

export const getProductId = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "product") return null;
    return parts[1] || null;
};

export const normalizeBreadcrumbText = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

export const toTitleLabel = (value) =>
    String(value || "")
        .replace(/^de\s+/i, "")
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const getSearchParam = (name) => {
    try {
        return new URLSearchParams(window.location.search || "").get(name) || "";
    } catch {
        return "";
    }
};

export const resolveCatalogSlugFromText = (...values) => {
    const text = normalizeBreadcrumbText(values.filter(Boolean).join(" "));
    if (!text) return "";
    if (text.includes("heladeria") || text.includes("helado")) return "heladeria";
    if (text.includes("panaderia") || text.includes("pan ") || text.includes("bolleria")) return "panaderia";
    if (text.includes("confiteria") || text.includes("reposteria") || text.includes("pasteleria")) return "panaderia";
    return "";
};

export const getCatalogLabel = (slug) => {
    const fixedLabels = {
        heladeria: "Heladería",
        panaderia: "Panadería/Confitería",
        confiteria: "Panadería/Confitería",
    };
    if (fixedLabels[slug]) return fixedLabels[slug];
    const catalog = PIQUIM_SUBCATALOGS[slug];
    if (!catalog) return toTitleLabel(slug);
    return toTitleLabel(catalog.headingAccent || slug);
};

export const findBreadcrumbGroupForFilter = (catalogSlug, filterLabel) => {
    const catalog = PIQUIM_SUBCATALOGS[catalogSlug];
    const normalizedFilter = normalizeBreadcrumbText(filterLabel);
    if (!catalog || !normalizedFilter || !Array.isArray(catalog.productGroups)) return "";

    const group = catalog.productGroups.find((item) => {
        if (normalizeBreadcrumbText(item.title) === normalizedFilter) return true;
        const categories = Array.isArray(item.categories) ? item.categories : [];
        return categories.some((category) => normalizeBreadcrumbText(category.title) === normalizedFilter);
    });

    return group?.title || "";
};

export const getSpecificationValue = (specifications = {}, keys = []) => {
    if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return "";
    const entries = Object.entries(specifications);
    const normalizedKeys = keys.map(normalizeBreadcrumbText);
    const match = entries.find(([key]) => normalizedKeys.includes(normalizeBreadcrumbText(key)));
    return String(match?.[1] || "").trim();
};

export const getProductKicker = (breadcrumbItems = [], sourcePath = []) => {
    const path = Array.isArray(sourcePath) ? sourcePath.filter(Boolean) : [];
    const catalog = path[0] || breadcrumbItems[1]?.label || "";
    const group = path[1] || breadcrumbItems[2]?.label || "";
    return [group, catalog].filter(Boolean).join(" + ");
};

export const getProductImageUrl = (item, fallback = FALLBACK_IMAGE) => {
    const data = item?.data && typeof item.data === "object" ? item.data : {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        fallback
    );
};

export const normalizePresentationOptionLabel = (value) =>
    String(value || "")
        .replace(/^precio\s+\d+$/i, "")
        .replace(/^price[_\s-]?\d+$/i, "")
        .trim();

export const resolveProductBreadcrumb = (product, view, categories = []) => {
    const data = product?.data && typeof product.data === "object" ? product.data : {};
    const categoryNames = (Array.isArray(product?.category_ids) ? product.category_ids : [])
        .map((id) => categories.find((category) => category.id === id))
        .filter(Boolean)
        .flatMap((category) => [category.parent_name, category.name, category.slug])
        .filter(Boolean);
    const sourcePath = Array.isArray(product?.source_category_path)
        ? product.source_category_path
        : Array.isArray(data.source_category_path)
            ? data.source_category_path
            : [];
    const rawCatalogFromUrl = normalizeBreadcrumbText(getSearchParam("catalog"));
    const catalogFromUrl = rawCatalogFromUrl === "confiteria" ? "panaderia" : rawCatalogFromUrl;
    const catalogSlug = PIQUIM_SUBCATALOGS[catalogFromUrl]
        ? catalogFromUrl
        : resolveCatalogSlugFromText(
            sourcePath.join(" "),
            product?.source_category,
            data.source_category,
            data.category,
            product?.category?.name,
            categoryNames.join(" "),
            view?.brand,
            view?.name,
        );
    const groupFromUrl = String(getSearchParam("group") || "").trim();
    const rawFilter =
        getSearchParam("filter") ||
        sourcePath.find((item) => normalizeBreadcrumbText(item) && normalizeBreadcrumbText(item) !== catalogSlug) ||
        data.subtype ||
        data.presentation ||
        "";
    const filterLabel = String(rawFilter || "").trim();
    const groupLabel = groupFromUrl || findBreadcrumbGroupForFilter(catalogSlug, filterLabel);
    const normalizedGroup = normalizeBreadcrumbText(groupLabel);
    const normalizedFilter = normalizeBreadcrumbText(filterLabel);
    const showGroup = Boolean(groupLabel);
    const showFilter = Boolean(filterLabel) && normalizedFilter !== normalizedGroup;
    const catalogHref = catalogSlug ? `/catalog?category=${encodeURIComponent(catalogSlug)}` : "/catalog";

    return [
        { label: "Productos", href: "/catalog" },
        ...(catalogSlug ? [{ label: getCatalogLabel(catalogSlug), href: catalogHref }] : []),
        ...(showGroup ? [{ label: groupLabel, href: catalogHref }] : []),
        ...(showFilter ? [{ label: filterLabel, href: catalogHref }] : []),
        { label: view?.name || product?.name || "Producto" },
    ];
};
