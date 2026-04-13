import { useCallback, useMemo, useState } from 'react';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const createEmptyProduct = () => ({
    name: '',
    sku: '',
    price: '',
    stock: 0,
    brand: '',
    short_description: '',
    long_description: '',
    images: [],
    is_featured: false,
    category_id: '',
    category_ids: [],
    features: [],
    specifications: [],
    show_specifications: true,
    collection: '',
    variant_group: '',
    variant_group_label: '',
    variant_label: '',
    is_variant_root: false,
    is_visible_web: true,
    admin_locked: false,
    external_id: '',
    source_system: '',
    is_active_source: true,
    last_sync_at: null,
    sync_status: 'manual',
});

const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

const mapSpecificationsObjectToRows = (specifications) => {
    if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) {
        return [];
    }

    return Object.entries(specifications).map(([key, value]) => ({
        key: String(key || '').trim(),
        value: String(value ?? '').trim(),
    }));
};

const mapSpecificationRowsToObject = (rows) => {
    const list = Array.isArray(rows) ? rows : [];
    return list.reduce((acc, row) => {
        const key = String(row?.key || '').trim();
        const value = String(row?.value || '').trim();
        if (!key || !value) return acc;
        acc[key] = value;
        return acc;
    }, {});
};

const buildProductFormFromProduct = (product) => {
    const data = product?.data && typeof product.data === 'object' ? product.data : {};
    const rawImages = Array.isArray(data.images)
        ? data.images
        : Array.isArray(product?.images)
            ? product.images
            : [];
    const images = rawImages
        .map((item, index) => {
            if (typeof item === 'string') {
                return { url: item, alt: product?.name || 'Producto', primary: index === 0 };
            }
            if (!item || typeof item !== 'object') return null;
            const url = item.url || item.src || '';
            if (!url) return null;
            return {
                url,
                alt: item.alt || product?.name || 'Producto',
                primary: item.primary === true || index === 0,
            };
        })
        .filter(Boolean);

    if (images.length && !images.some((item) => item.primary)) {
        images[0] = { ...images[0], primary: true };
    }

    const categoryIds = Array.isArray(product?.category_ids)
        ? product.category_ids.filter(Boolean)
        : product?.category_id
            ? [product.category_id].filter(Boolean)
            : [];

    return {
        name: product?.name || '',
        sku: product?.sku || '',
        price: product?.price ?? '',
        stock: Number(product?.stock ?? 0),
        brand: product?.brand || '',
        short_description:
            data.short_description ||
            data.shortDescription ||
            product?.short_description ||
            '',
        long_description:
            data.long_description ||
            data.longDescription ||
            product?.long_description ||
            product?.description ||
            '',
        images,
        is_featured: Boolean(product?.is_featured),
        category_id: categoryIds[0] || '',
        category_ids: categoryIds,
        features: Array.isArray(data.features) ? data.features : [],
        specifications: mapSpecificationsObjectToRows(data.specifications),
        show_specifications: data.show_specifications !== false,
        collection: data.collection || '',
        variant_group: data.variant_group || data.variantGroup || '',
        variant_group_label: data.variant_group_label || data.variantGroupLabel || '',
        variant_label: data.variant_label || data.variantLabel || data.variant || '',
        is_variant_root: data.is_variant_root === true || data.isVariantRoot === true,
        is_visible_web: product?.is_visible_web !== false,
        admin_locked: Boolean(product?.admin_locked),
        external_id: product?.external_id || '',
        source_system: product?.source_system || '',
        is_active_source: product?.is_active_source !== false,
        last_sync_at: product?.last_sync_at || null,
        sync_status: product?.sync_status || (product?.external_id ? 'synced' : 'manual'),
    };
};

const normalizeCategoryIds = (draft, availableCategories = []) => {
    const rawIds = Array.from(
        new Set((Array.isArray(draft.category_ids) ? draft.category_ids : []).filter(Boolean))
    );
    const validIds = new Set(
        (Array.isArray(availableCategories) ? availableCategories : [])
            .map((item) => String(item?.id || '').trim())
            .filter(Boolean)
    );

    if (!validIds.size) {
        return rawIds;
    }

    return rawIds.filter((id) => validIds.has(String(id).trim()));
};

const sanitizeDraftCategories = (draft, availableCategories = []) => {
    const categoryIds = normalizeCategoryIds(draft, availableCategories);
    return {
        ...draft,
        category_id: categoryIds[0] || '',
        category_ids: categoryIds,
    };
};

const mapProductPayloadToLocalItem = (payload, productId, categoryIds = []) => ({
    id: productId,
    sku: payload.sku || null,
    name: payload.name || '',
    description: payload.long_description || payload.description || null,
    short_description: payload.short_description || null,
    long_description: payload.long_description || payload.description || null,
    price: Number(payload.price || 0),
    stock: Number(payload.stock || 0),
    brand: payload.brand || null,
    category_id: categoryIds[0] || '',
    category_ids: categoryIds,
    is_featured: Boolean(payload.is_featured),
    show_specifications: payload.show_specifications !== false,
    is_visible_web: payload.is_visible_web !== false,
    admin_locked: Boolean(payload.admin_locked),
    external_id: payload.external_id || null,
    source_system: payload.source_system || null,
    is_active_source: payload.is_active_source !== false,
    last_sync_at: payload.last_sync_at || null,
    sync_status: payload.sync_status || (payload.external_id ? 'synced' : 'manual'),
    data: {
        images: Array.isArray(payload.images) ? payload.images : [],
        features: Array.isArray(payload.features) ? payload.features : [],
        specifications:
            payload.specifications && typeof payload.specifications === 'object' && !Array.isArray(payload.specifications)
                ? payload.specifications
                : {},
        show_specifications: payload.show_specifications !== false,
        short_description: payload.short_description || null,
        long_description: payload.long_description || payload.description || null,
        collection: payload.collection || null,
        variant_group: payload.variant_group || null,
        variant_group_label: payload.variant_group_label || null,
        variant_label: payload.variant_label || null,
        is_variant_root: payload.is_variant_root === true,
    },
});

export const useCatalogManager = ({ setProducts, categories, setCategories, brands, setBrands }) => {
    const { addToast } = useToast();
    const [productDraft, setProductDraft] = useState(createEmptyProduct);
    const [editingProductId, setEditingProductId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState(null);
    const [stockEdits, setStockEdits] = useState({});
    const [stockSavingId, setStockSavingId] = useState(null);
    const [clearingFeatured, setClearingFeatured] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryParentId, setNewCategoryParentId] = useState('');
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryDeletingId, setCategoryDeletingId] = useState(null);
    const [newBrandName, setNewBrandName] = useState('');
    const [brandSaving, setBrandSaving] = useState(false);
    const [brandDeletingName, setBrandDeletingName] = useState('');

    const resetProductForm = useCallback(() => {
        setEditingProductId(null);
        setProductDraft(createEmptyProduct());
    }, []);

    const toggleProductCategorySelection = useCallback((categoryId) => {
        setProductDraft((prev) => {
            const current = Array.isArray(prev.category_ids) ? prev.category_ids : [];
            const next = current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId];
            return {
                ...prev,
                category_ids: next,
                category_id: next[0] || '',
            };
        });
    }, []);

    const handleEditProduct = useCallback((product) => {
        if (!product?.id) return;
        setEditingProductId(product.id);
        setProductDraft(sanitizeDraftCategories(buildProductFormFromProduct(product), categories));
    }, [categories]);

    const handleCancelEditProduct = useCallback(() => {
        resetProductForm();
    }, [resetProductForm]);

    const handleCreateProduct = useCallback(async () => {
        if (!productDraft.name) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const categoryIds = normalizeCategoryIds(productDraft, categories);
            const payload = {
                ...productDraft,
                description: productDraft.long_description || '',
                specifications: mapSpecificationRowsToObject(productDraft.specifications),
                category_id: categoryIds[0] || '',
                category_ids: categoryIds,
                stock: Number(productDraft.stock || 0),
            };

            const res = await fetch(`${getApiBase()}/tenant/products`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const created = await res.json();
                setProducts((prev) => [
                    ...prev,
                    created?.item || mapProductPayloadToLocalItem(payload, created.id, categoryIds),
                ]);
                resetProductForm();
                addToast('Producto creado con exito', 'success');
            } else {
                const payload = await res.json().catch(() => ({}));
                if (payload?.error === 'invalid_category_ids') {
                    addToast('Revisa las categorias seleccionadas', 'error');
                } else if (payload?.error === 'name_required') {
                    addToast('El nombre del producto es obligatorio', 'error');
                } else {
                    addToast('No se pudo crear el producto', 'error');
                }
            }
        } catch (err) {
            console.error('Failed to create product', err);
            addToast('Error al crear el producto', 'error');
        } finally {
            setSaving(false);
        }
    }, [addToast, categories, productDraft, resetProductForm, setProducts]);

    const handleUpdateProduct = useCallback(async () => {
        if (!editingProductId || !productDraft.name) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const categoryIds = normalizeCategoryIds(productDraft, categories);
            const payload = {
                ...productDraft,
                description: productDraft.long_description || '',
                specifications: mapSpecificationRowsToObject(productDraft.specifications),
                category_id: categoryIds[0] || '',
                category_ids: categoryIds,
                stock: Number(productDraft.stock || 0),
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${editingProductId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json().catch(() => ({}));
                setProducts((prev) => prev.map((item) => {
                    if (item.id !== editingProductId) return item;
                    if (saved?.item?.id === editingProductId) {
                        return saved.item;
                    }
                    return {
                        ...item,
                        ...mapProductPayloadToLocalItem(payload, editingProductId, categoryIds),
                        data: {
                            ...(item.data || {}),
                            ...mapProductPayloadToLocalItem(payload, editingProductId, categoryIds).data,
                        },
                    };
                }));
                resetProductForm();
                addToast('Producto actualizado con exito', 'success');
            } else {
                const payload = await res.json().catch(() => ({}));
                if (payload?.error === 'invalid_category_ids') {
                    addToast('Revisa las categorias seleccionadas', 'error');
                } else {
                    addToast('Error al actualizar producto', 'error');
                }
            }
        } catch (err) {
            console.error('Failed to update product', err);
            addToast('Error al actualizar producto', 'error');
        } finally {
            setSaving(false);
        }
    }, [addToast, categories, editingProductId, productDraft, resetProductForm, setProducts]);

    const handleDeleteProduct = useCallback(async (id) => {
        if (!id) return;
        if (!window.confirm('Eliminar este producto?')) return;
        setDeleteLoadingId(id);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/products/${id}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                setProducts((prev) => prev.filter((item) => item.id !== id));
                if (editingProductId === id) resetProductForm();
                addToast('Producto eliminado', 'success');
            } else {
                addToast('Error al eliminar producto', 'error');
            }
        } catch (err) {
            console.error('Failed to delete product', err);
            addToast('Error al eliminar producto', 'error');
        } finally {
            setDeleteLoadingId(null);
        }
    }, [addToast, editingProductId, resetProductForm, setProducts]);

    const handleCreateCategory = useCallback(async () => {
        const name = String(newCategoryName || '').trim();
        if (!name) return;
        setCategorySaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/categories`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name,
                    parent_id: newCategoryParentId || null
                })
            });
            if (res.ok) {
                const created = await res.json();
                const next = Array.isArray(categories) ? [...categories, created] : [created];
                setCategories(next);
                setNewCategoryName('');
                setNewCategoryParentId('');
                addToast('Categoria creada', 'success');
            } else {
                addToast('No se pudo crear la categoria', 'error');
            }
        } catch (err) {
            console.error('Failed to create category', err);
            addToast('Error al crear categoria', 'error');
        } finally {
            setCategorySaving(false);
        }
    }, [addToast, categories, newCategoryName, newCategoryParentId, setCategories]);

    const handleDeleteCategory = useCallback(async (categoryId, categoryName) => {
        if (!categoryId) return;
        const label = categoryName || 'esta categoria';
        if (!window.confirm(`Eliminar ${label}?`)) return;
        setCategoryDeletingId(categoryId);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/categories/${categoryId}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                setCategories((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== categoryId) : prev));
                setProductDraft((prev) => sanitizeDraftCategories({
                    ...prev,
                    category_ids: (Array.isArray(prev.category_ids) ? prev.category_ids : []).filter((id) => id !== categoryId),
                    category_id: prev.category_id === categoryId ? '' : prev.category_id,
                }, (Array.isArray(categories) ? categories : []).filter((item) => item.id !== categoryId)));
                setProducts((prev) => prev.map((item) => {
                    const currentIds = Array.isArray(item.category_ids) ? item.category_ids.filter((id) => id !== categoryId) : [];
                    return {
                        ...item,
                        category_ids: currentIds,
                        category_id: item.category_id === categoryId ? (currentIds[0] || '') : item.category_id,
                    };
                }));
                addToast('Categoria eliminada', 'success');
            } else {
                const payload = await res.json().catch(() => ({}));
                if (payload?.error === 'category_has_children') {
                    addToast('La categoria tiene subcategorias', 'error');
                } else {
                    addToast('No se pudo eliminar la categoria', 'error');
                }
            }
        } catch (err) {
            console.error('Failed to delete category', err);
            addToast('Error al eliminar categoria', 'error');
        } finally {
            setCategoryDeletingId(null);
        }
    }, [addToast, categories, setCategories, setProducts]);

    const handleCreateBrand = useCallback(async () => {
        const name = String(newBrandName || '').trim();
        if (!name) return;
        setBrandSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/brands`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const created = await res.json();
                const value = created?.name || name;
                const next = Array.isArray(brands) ? Array.from(new Set([...brands, value])) : [value];
                setBrands(next);
                setNewBrandName('');
                addToast('Marca creada', 'success');
            } else {
                addToast('No se pudo crear la marca', 'error');
            }
        } catch (err) {
            console.error('Failed to create brand', err);
            addToast('Error al crear marca', 'error');
        } finally {
            setBrandSaving(false);
        }
    }, [addToast, brands, newBrandName, setBrands]);

    const handleDeleteBrand = useCallback(async (brandName) => {
        const value = String(brandName || '').trim();
        if (!value) return;
        if (!window.confirm(`Eliminar marca ${value}?`)) return;
        setBrandDeletingName(value);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/brands/${encodeURIComponent(value)}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                setBrands((prev) => (Array.isArray(prev) ? prev.filter((item) => item !== value) : prev));
                addToast('Marca eliminada', 'success');
            } else {
                addToast('No se pudo eliminar la marca', 'error');
            }
        } catch (err) {
            console.error('Failed to delete brand', err);
            addToast('Error al eliminar marca', 'error');
        } finally {
            setBrandDeletingName('');
        }
    }, [addToast, setBrands]);

    const handleToggleFeatured = useCallback(async (id, currentStatus) => {
        if (!id) return;
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            const res = await fetch(`${getApiBase()}/tenant/products/${id}/featured`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ featured: !currentStatus })
            });
            if (res.ok) {
                setProducts((prev) => prev.map(p => p.id === id ? { ...p, is_featured: !currentStatus } : p));
                addToast(`Producto ${!currentStatus ? 'destacado' : 'quitado de destacados'}`, 'success');
            }
        } catch (err) {
            console.error('Failed to toggle featured', err);
        }
    }, [addToast, setProducts]);

    const handleClearFeatured = useCallback(async () => {
        if (!window.confirm('Quitar todos los destacados?')) return;
        setClearingFeatured(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const res = await fetch(`${getApiBase()}/tenant/products/featured/clear`, {
                method: 'PUT',
                headers
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => ({ ...p, is_featured: false })));
                addToast('Destacados limpiados', 'success');
            } else {
                addToast('Error al limpiar destacados', 'error');
            }
        } catch (err) {
            console.error('Failed to clear featured', err);
            addToast('Error al limpiar destacados', 'error');
        } finally {
            setClearingFeatured(false);
        }
    }, [addToast, setProducts]);

    const handleAddStock = useCallback(async (id, overrideValue) => {
        const raw = overrideValue ?? stockEdits[id];
        if (raw === undefined || raw === null || String(raw).trim() === '') return;
        const delta = Number(raw);
        if (Number.isNaN(delta) || delta === 0) return;

        setStockSavingId(id);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const res = await fetch(`${getApiBase()}/tenant/products/${id}/stock`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ delta })
            });

            if (res.ok) {
                const data = await res.json();
                setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: data.stock } : p));
                addToast('Stock actualizado', 'success');
                setStockEdits((prev) => ({ ...prev, [id]: '' }));
            } else {
                addToast('Error al actualizar stock', 'error');
            }
        } catch (err) {
            console.error('Failed to update stock', err);
            addToast('Error al actualizar stock', 'error');
        } finally {
            setStockSavingId(null);
        }
    }, [addToast, setProducts, stockEdits]);

    const handleImageUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) {
                addToast('No se pudo leer la imagen', 'error');
                return;
            }
            setProductDraft((prev) => {
                const currentImages = Array.isArray(prev.images) ? prev.images : [];
                return {
                    ...prev,
                    images: [
                        ...currentImages,
                        {
                            url: dataUrl,
                            alt: prev.name || 'Producto',
                            primary: currentImages.length === 0
                        }
                    ]
                };
            });
            addToast('Imagen cargada', 'success');
        } catch (err) {
            console.error('Image read failed', err);
            addToast('Error al leer la imagen', 'error');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    }, [addToast]);

    const handleRemoveImage = useCallback((index) => {
        setProductDraft((prev) => {
            const current = Array.isArray(prev.images) ? [...prev.images] : [];
            current.splice(index, 1);
            if (current.length && !current.some((item) => item.primary)) {
                current[0] = { ...current[0], primary: true };
            }
            return { ...prev, images: current };
        });
    }, []);

    const handleSetPrimaryImage = useCallback((index) => {
        setProductDraft((prev) => {
            const current = Array.isArray(prev.images) ? prev.images.map((item) => ({ ...item })) : [];
            current.forEach((item, idx) => {
                item.primary = idx === index;
            });
            return { ...prev, images: current };
        });
    }, []);

    const derived = useMemo(() => ({
        canSave: Boolean(productDraft.name && String(productDraft.name).trim()),
    }), [productDraft]);

    return {
        productDraft,
        setProductDraft,
        editingProductId,
        saving,
        uploading,
        deleteLoadingId,
        stockEdits,
        stockSavingId,
        clearingFeatured,
        derived,
        newCategoryName,
        newCategoryParentId,
        categorySaving,
        categoryDeletingId,
        newBrandName,
        brandSaving,
        brandDeletingName,
        resetProductForm,
        toggleProductCategorySelection,
        handleEditProduct,
        handleCancelEditProduct,
        handleCreateProduct,
        handleUpdateProduct,
        handleDeleteProduct,
        handleToggleFeatured,
        handleClearFeatured,
        handleAddStock,
        handleImageUpload,
        handleRemoveImage,
        handleSetPrimaryImage,
        setStockEdits,
        setNewCategoryName,
        setNewCategoryParentId,
        handleCreateCategory,
        handleDeleteCategory,
        setNewBrandName,
        handleCreateBrand,
        handleDeleteBrand,
    };
};
