import { PIQUIM_CATALOG_CARDS } from '../data/piquimBranding';

// Las tarjetas de la pagina Catalogo de Piquim viven en `branding.catalog_cards`. Si no hay nada guardado
// (o hay una lista vacia) se usan las dos tarjetas por defecto; cada tarjeta guardada pisa solo los campos
// que trae, y `hidden: true` la saca de la pagina sin perder su contenido.

const cardKey = (card) => String(card?.id || card?.categorySlug || card?.category || '').trim().toLowerCase();

export const normalizeCardTags = (tags) => {
    const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
    return list.map((tag) => String(tag || '').trim()).filter(Boolean);
};

const textOr = (value, fallback) => (typeof value === 'string' ? value : fallback);

export function resolveCatalogCards(configured) {
    const saved = Array.isArray(configured) ? configured : [];
    return PIQUIM_CATALOG_CARDS.map((base) => {
        const override = saved.find((card) => cardKey(card) === base.id);
        if (!override) return { ...base, hidden: false };
        return {
            ...base,
            ...override,
            id: base.id,
            category: base.category,
            categorySlug: base.categorySlug,
            title: String(override.title || '').trim() || base.title,
            prefix: textOr(override.prefix, base.prefix),
            description: textOr(override.description, base.description),
            tags: override.tags === undefined ? base.tags : normalizeCardTags(override.tags),
            image: String(override.image || '').trim() || base.image,
            objectPosition: override.objectPosition || base.objectPosition,
            overlay: override.overlay || base.overlay,
            hidden: override.hidden === true,
        };
    });
}

export const getVisibleCatalogCards = (configured) => resolveCatalogCards(configured).filter((card) => !card.hidden);
