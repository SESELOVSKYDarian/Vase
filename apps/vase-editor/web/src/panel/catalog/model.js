// Lógica del catálogo sin pantalla: árbol de categorías, filtros y armado del producto para guardar.

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const productImages = (product) => {
    const raw = product?.data?.images;
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((image) => (typeof image === 'string' ? image : image?.url || image?.src || ''))
        .filter(Boolean);
};

export const productThumb = (product) => productImages(product)[0] || '';

// Árbol: raíces (rubros) con sus hijas en orden alfabético y la profundidad de cada una.
export function buildCategoryTree(categories = []) {
    const byParent = new Map();
    categories.forEach((category) => {
        const key = category.parent_id || '';
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(category);
    });
    byParent.forEach((list) => list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'es')));
    const ids = new Set(categories.map((category) => category.id));
    const out = [];
    const walk = (parentKey, depth, seen) => {
        (byParent.get(parentKey) || []).forEach((category) => {
            if (seen.has(category.id)) return;
            const nextSeen = new Set(seen).add(category.id);
            out.push({ ...category, depth });
            walk(category.id, depth + 1, nextSeen);
        });
    };
    walk('', 0, new Set());
    // categorías cuyo padre ya no existe: van como raíces para no perderlas
    categories.filter((category) => category.parent_id && !ids.has(category.parent_id)).forEach((category) => {
        if (!out.some((item) => item.id === category.id)) {
            out.push({ ...category, depth: 0 });
            walk(category.id, 1, new Set([category.id]));
        }
    });
    return out;
}

// Ids de una categoría y todas las que tiene adentro.
export function descendantIds(categories, rootId) {
    const result = new Set([rootId]);
    let added = true;
    while (added) {
        added = false;
        categories.forEach((category) => {
            if (category.parent_id && result.has(category.parent_id) && !result.has(category.id)) {
                result.add(category.id);
                added = true;
            }
        });
    }
    return result;
}

export function categoryPath(categories, id) {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const names = [];
    let cursor = byId.get(id);
    for (let guard = 0; cursor && guard < 10; guard += 1) {
        names.unshift(cursor.name);
        cursor = cursor.parent_id ? byId.get(cursor.parent_id) : null;
    }
    return names.join(' › ');
}

export function countByCategory(products = [], categories = []) {
    const direct = new Map();
    products.forEach((product) => (product.category_ids || []).forEach((id) => direct.set(id, (direct.get(id) || 0) + 1)));
    const counts = new Map();
    categories.forEach((category) => {
        const ids = descendantIds(categories, category.id);
        const set = new Set();
        products.forEach((product) => {
            if ((product.category_ids || []).some((id) => ids.has(id))) set.add(product.id);
        });
        counts.set(category.id, set.size);
    });
    return { direct, counts };
}

export function buildFilters(products = [], categories = []) {
    // Solo los rubros que tienen una parte importante del catálogo (las raíces sueltas que crea el sistema no).
    const roots = categories
        .filter((category) => !category.parent_id)
        .map((root) => {
            const ids = descendantIds(categories, root.id);
            return { root, count: products.filter((product) => (product.category_ids || []).some((id) => ids.has(id))).length };
        })
        .filter((item) => item.count >= Math.max(1, products.length * 0.15))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item) => item.root);
    const rootFilters = roots.map((root) => {
        const ids = descendantIds(categories, root.id);
        return {
            id: `rubro:${root.id}`,
            label: root.name,
            test: (product) => (product.category_ids || []).some((id) => ids.has(id)),
        };
    });
    const filters = [
        { id: 'todos', label: 'Todos', test: () => true },
        ...rootFilters,
        { id: 'sinstock', label: 'Sin stock', test: (product) => Number(product.stock || 0) <= 0 },
        { id: 'ocultos', label: 'Ocultos', test: (product) => product.is_visible_web === false },
        { id: 'sistema', label: 'Del sistema', test: (product) => product.sync_status !== 'manual' },
        { id: 'manuales', label: 'Manuales', test: (product) => product.sync_status === 'manual' },
    ];
    return filters.map((filter) => ({ ...filter, count: products.filter(filter.test).length }));
}

export function searchProducts(products, query) {
    const q = normalize(query);
    if (!q) return products;
    return products.filter((product) => normalize(`${product.name} ${product.sku || ''} ${product.brand || ''}`).includes(q));
}

// Borrador editable a partir del producto que llega del servidor.
export function productToDraft(product = {}) {
    const data = product.data || {};
    const specs = data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications) ? data.specifications : {};
    return {
        id: product.id || null,
        name: product.name || '',
        sku: product.sku || '',
        price: product.price ?? '',
        stock: product.stock ?? 0,
        brand: product.brand || '',
        short_description: product.short_description || data.short_description || '',
        long_description: product.long_description || data.long_description || product.description || '',
        images: productImages(product),
        category_ids: [...(product.category_ids || [])],
        is_visible_web: product.is_visible_web !== false,
        is_featured: product.is_featured === true,
        admin_locked: product.admin_locked === true,
        specifications: Object.entries(specs).map(([key, value]) => ({ key, value: String(value ?? '') })),
        variant_group: data.variant_group || data.variantGroup || '',
        variant_label: data.variant_label || data.variantLabel || '',
    };
}

// Cuerpo para PUT/POST /tenant/products a partir del borrador.
export function draftToPayload(draft) {
    const specifications = {};
    (draft.specifications || []).forEach(({ key, value }) => {
        const cleanKey = String(key || '').trim();
        if (cleanKey) specifications[cleanKey] = String(value || '').trim();
    });
    return {
        name: String(draft.name || '').trim(),
        sku: String(draft.sku || '').trim(),
        price: Number(String(draft.price).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0,
        stock: Math.max(0, Math.round(Number(draft.stock) || 0)),
        brand: String(draft.brand || '').trim(),
        short_description: String(draft.short_description || '').trim(),
        long_description: String(draft.long_description || '').trim(),
        images: draft.images.map((url, index) => ({ url, primary: index === 0 })),
        category_ids: draft.category_ids,
        is_visible_web: draft.is_visible_web,
        is_featured: draft.is_featured,
        admin_locked: draft.admin_locked,
        specifications,
        show_specifications: Object.keys(specifications).length > 0,
        variant_group: String(draft.variant_group || '').trim() || null,
        variant_label: String(draft.variant_label || '').trim() || null,
    };
}

export const variantMembers = (products, group) => {
    const key = normalize(group);
    if (!key) return [];
    return products.filter((product) => normalize(product.data?.variant_group || product.data?.variantGroup) === key);
};

// La categoría más específica (la más profunda) de un producto, para mostrarla en la lista.
export function mainCategory(product, categories) {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const depthOf = (id) => {
        let depth = 0;
        let cursor = byId.get(id);
        while (cursor && cursor.parent_id && depth < 10) {
            depth += 1;
            cursor = byId.get(cursor.parent_id);
        }
        return depth;
    };
    return (product.category_ids || [])
        .filter((id) => byId.has(id))
        .sort((a, b) => depthOf(b) - depthOf(a))
        .map((id) => byId.get(id))[0] || null;
}
