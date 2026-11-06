// Todas las fotos que usa la tienda, con dónde se usa cada una.

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i;

export function isImageUrl(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (!text || text.startsWith('data:')) return false;
    if (/^\/public\/products\/[^/]+\/images\/\d+/.test(text)) return true;
    if (!/^(https?:)?\/\//.test(text) && !text.startsWith('/')) return false;
    return IMAGE_EXT.test(text) || /uploads\.vase\.ar|\/uploads\//.test(text);
}

// Recorre un objeto y junta las URLs de imagen (sin repetir, con un tope para no colgar la pantalla).
function walk(value, found, depth = 0) {
    if (depth > 8 || found.size > 2000 || value === null || value === undefined) return;
    if (typeof value === 'string') {
        if (isImageUrl(value)) found.add(value.trim());
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item) => walk(item, found, depth + 1));
        return;
    }
    if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, found, depth + 1));
}

const collect = (value) => {
    const found = new Set();
    walk(value, found);
    return found;
};

export function collectStoreImages({ settings = {}, pageSections = {}, products = [], categories = [] } = {}) {
    const map = new Map();
    const add = (set, group, where) => set.forEach((src) => {
        const row = map.get(src) || { src, groups: new Set(), where: new Set() };
        row.groups.add(group);
        if (where) row.where.add(where);
        map.set(src, row);
    });
    add(collect(pageSections.home), 'paginas', 'Inicio');
    add(collect(pageSections.about), 'paginas', 'Nosotros');
    add(collect(settings), 'marca', 'Colores, logo y catálogo');
    categories.forEach((category) => add(collect(category.data || {}), 'marca', `Categoría ${category.name}`));
    products.forEach((product) => add(collect(product.images || product.data?.images || []), 'productos', product.name));
    return [...map.values()].map((row) => ({ src: row.src, groups: [...row.groups], where: [...row.where] }));
}

export const fileName = (src) => decodeURIComponent(String(src).split('?')[0].split('/').filter(Boolean).pop() || 'imagen');
