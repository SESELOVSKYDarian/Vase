// Lectura de productos, rubros y marcas para mostrarlos en el catálogo.
import { FALLBACK_IMAGE, normalizeCatalogLabel, normalizeFilterValue } from "./filters.js";

export const getProductImage = (product) => {
    const data = product?.data || {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        FALLBACK_IMAGE
    );
};

export const getRealProductImage = (product) => {
    const data = product?.data || {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        ""
    );
};

export const getVariationName = (product) => {
    const explicit = String(product?.variation_label || "").trim();
    if (explicit) return explicit;
    const data = product?.data || {};
    const specs = data.specifications && typeof data.specifications === "object" ? data.specifications : {};
    return (
        String(data.variant_label || data.variant || specs.color || specs.acabado || specs.modelo || product?.sku || product?.name || "")
            .trim() || "Variacion"
    );
};

export const CATALOG_STYLES = {
    shell: { backgroundColor: "var(--catalog-shell-bg, #f7f3ee)" },
    panel: {
        backgroundColor: "var(--catalog-panel-bg, #fffdfb)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    surface: {
        backgroundColor: "var(--catalog-surface-bg, #fcfbfa)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    card: {
        backgroundColor: "var(--catalog-card-bg, #ffffff)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    media: { backgroundColor: "var(--catalog-surface-bg, #fcfbfa)" },
    border: { borderColor: "var(--catalog-border, #e5e1de)" },
    muted: { color: "var(--catalog-muted-text, #8a7560)" },
};

export const normalizeCategory = (item) => {
    if (!item || (!item.id && !item.slug && !item.name)) return null;
    const name = String(item.name || item.slug || item.id).trim();
    if (!name) return null;

    return {
        id: String(item.id || item.slug || name).trim(),
        slug: String(item.slug || "").trim() || null,
        name,
        parentId: String(item.parent_id || "").trim() || null,
        parentName: String(item.parent_name || "").trim() || null,
    };
};

export const normalizeBrand = (item) => {
    if (typeof item === "string") {
        const name = item.trim();
        return name ? { id: name, name } : null;
    }

    if (!item) return null;
    const name = String(item.name || item.id || "").trim();
    if (!name) return null;

    return {
        id: String(item.id || name).trim(),
        name,
    };
};

export const findCategory = (categories, value) => {
    const normalized = normalizeFilterValue(value);
    if (!normalized) return null;
    return categories.find((item) => item.id === normalized || item.slug === normalized || item.name === normalized) || null;
};

export const findBrand = (brands, value) => {
    const normalized = normalizeFilterValue(value);
    if (!normalized) return null;
    return brands.find((item) => item.id === normalized || item.name === normalized) || null;
};

export const findCatalogCardCategory = (categories, card) => {
    const target = normalizeCatalogLabel(card?.category || card?.categorySlug || card?.title || card?.id);
    if (!target) return null;
    return categories.find((item) => {
        const values = [item.id, item.slug, item.name].map(normalizeCatalogLabel);
        return values.includes(target);
    }) || null;
};
