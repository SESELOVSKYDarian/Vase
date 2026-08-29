const labelFor = (category) => String(category?.name || category?.label || category?.slug || '').trim();

const categoryId = (category) => String(category?.id || category?.category_id || '');

const legacyPath = (product) => {
    const data = product?.data && typeof product.data === 'object' ? product.data : {};
    const path = product?.source_category_path || data.source_category_path || [];
    return Array.isArray(path) ? path.map((item) => String(item || '').trim()).filter(Boolean) : [];
};

/** Resolves storefront category copy from persisted category assignments before legacy metadata. */
export function resolveProductCategoryContext(product, categories = []) {
    const allCategories = Array.isArray(categories) ? categories : [];
    const ids = Array.isArray(product?.category_ids) ? product.category_ids.map(String) : [];
    const assigned = ids.map((id) => allCategories.find((item) => categoryId(item) === id)).filter(Boolean);
    const category = assigned[0] || null;
    const parentId = category?.parent_id || category?.parentId;
    const parentCategory = parentId
        ? allCategories.find((item) => categoryId(item) === String(parentId)) || null
        : null;
    const explicitParent = parentCategory || (category?.parent_name ? { name: category.parent_name } : null);

    if (category) {
        const parentLabel = labelFor(explicitParent);
        const categoryLabel = labelFor(category);
        const breadcrumb = [parentLabel, categoryLabel].filter(Boolean);
        return {
            category,
            parentCategory: explicitParent,
            breadcrumb,
            kicker: [categoryLabel, parentLabel].filter(Boolean).join(' + '),
        };
    }

    const data = product?.data && typeof product.data === 'object' ? product.data : {};
    const explicitCategory = product?.category || data.category;
    const explicitLabel = typeof explicitCategory === 'object' ? labelFor(explicitCategory) : String(explicitCategory || '').trim();
    const path = legacyPath(product);
    const breadcrumb = explicitLabel ? [explicitLabel] : path;
    return {
        category: explicitLabel ? { name: explicitLabel } : null,
        parentCategory: null,
        breadcrumb,
        kicker: breadcrumb.slice().reverse().join(' + '),
    };
}
