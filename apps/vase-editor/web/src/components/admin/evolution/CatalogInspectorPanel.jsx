import React from 'react';
import EvolutionInput from './EvolutionInput';
import { cn } from '../../../utils/cn';
import useEvolutionStore from '../../../store/useEvolutionStore';
import {
    Tag,
    Package as Box,
    Star,
    Trash,
    Plus,
    CaretDown,
} from '@phosphor-icons/react';

const fieldClass =
    'w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30';

const sectionLabelClass = 'text-[10px] uppercase font-bold tracking-widest text-zinc-500';

const SYNC_STATUS_META = {
    manual: { label: 'Manual', tone: 'text-zinc-400 border-white/10 bg-white/5' },
    synced: { label: 'Sincronizado', tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
    source_inactive: { label: 'Inactivo en origen', tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10' },
    deleted: { label: 'Baja logica', tone: 'text-rose-300 border-rose-500/20 bg-rose-500/10' },
};

const INSPECTOR_SECTIONS = [
    { id: 'general', label: 'General' },
    { id: 'categories', label: 'Categorias' },
    { id: 'media', label: 'Imagenes' },
    { id: 'sync', label: 'Sync' },
];

const sortByName = (left, right) =>
    String(left?.name || '').localeCompare(String(right?.name || ''), 'es', { sensitivity: 'base' });

const parseTierAmount = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const normalized = raw.includes(',')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const resolveTierSlot = (entry = {}) => {
    const explicit = Number(entry?.slot || entry?.position || entry?.index || 0);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const keyMatch = String(entry?.key || entry?.code || '').match(/price_(\d+)/i);
    return keyMatch ? Number(keyMatch[1] || 0) : 0;
};

const formatSyncDate = (value) => {
    if (!value) return 'Todavia no sincronizado';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Fecha invalida';
    return parsed.toLocaleString('es-AR');
};

const buildCategoryOptions = (items = []) => {
    const byId = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
        if (!item?.id || !item?.name) return;
        byId.set(item.id, { ...item, children: [] });
    });

    const roots = [];
    byId.forEach((node) => {
        if (node.parent_id && byId.has(node.parent_id)) {
            byId.get(node.parent_id).children.push(node);
            return;
        }
        roots.push(node);
    });

    const options = [];
    const walk = (node, depth = 0, parents = []) => {
        const trail = [...parents, node.name];
        options.push({
            id: node.id,
            name: node.name,
            depth,
            path: trail.join(' > '),
        });
        [...node.children].sort(sortByName).forEach((child) => walk(child, depth + 1, trail));
    };

    [...roots].sort(sortByName).forEach((root) => walk(root));
    return options;
};

const formatCurrency = (value) => {
    const amount = parseTierAmount(value);
    if (!Number.isFinite(amount)) return '-';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const normalizeInspectorPriceTiers = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((entry) => {
            const slot = resolveTierSlot(entry);
            const key = String(entry?.key || entry?.code || (slot ? `price_${slot}` : '')).trim();
            const value = parseTierAmount(
                entry?.value
                ?? entry?.amount
                ?? entry?.price
                ?? entry?.rawValue
                ?? entry?.valor
            );

            if (!key || !slot || value == null) return null;

            return {
                ...entry,
                slot,
                key,
                value,
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.slot - right.slot);

const CatalogInspectorPanel = ({ catalog, categories = [], brands = [] }) => {
    const { catalogInspectorSection, setCatalogInspectorSection } = useEvolutionStore();
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = React.useState(false);

    if (!catalog) return null;

    const {
        productDraft,
        setProductDraft,
        editingProductId,
        saving,
        uploading,
        deleteLoadingId,
        categorySaving,
        stockEdits,
        stockSavingId,
        clearingFeatured,
        derived,
        toggleProductCategorySelection,
        handleCancelEditProduct,
        handleCreateProduct,
        handleUpdateProduct,
        handleDeleteProduct,
        handleCreateCategoriesFromSourcePath,
        handleToggleFeatured,
        handleClearFeatured,
        handleAddStock,
        handleImageUpload,
        handleRemoveImage,
        handleSetPrimaryImage,
        setStockEdits,
        resetProductForm,
    } = catalog;

    const isEditing = Boolean(editingProductId);
    const selectedCategories = React.useMemo(() =>
        (Array.isArray(productDraft.category_ids) ? productDraft.category_ids : [])
            .map((id) => String(id).trim().toLowerCase())
            .filter(Boolean)
    , [productDraft.category_ids]);
    const specificationRows = Array.isArray(productDraft.specifications) ? productDraft.specifications : [];
    const syncMeta = SYNC_STATUS_META[productDraft.sync_status] || SYNC_STATUS_META.manual;
    const categoryOptions = React.useMemo(() => buildCategoryOptions(categories), [categories]);
    const priceTiers = React.useMemo(
        () => normalizeInspectorPriceTiers(productDraft.price_tiers),
        [productDraft.price_tiers],
    );
    const sourceCategoryPath = Array.isArray(productDraft.source_category_path) ? productDraft.source_category_path.filter(Boolean) : [];
    const selectedCategoryEntries = React.useMemo(
        () => categoryOptions.filter((option) => selectedCategories.includes(String(option.id).trim().toLowerCase())),
        [categoryOptions, selectedCategories],
    );
    React.useEffect(() => {
        if (catalogInspectorSection !== 'categories') {
            setIsCategoryPickerOpen(false);
        }
    }, [catalogInspectorSection]);

    const updateSpecificationRow = (index, field, value) => {
        setProductDraft((prev) => {
            const currentRows = Array.isArray(prev.specifications) ? [...prev.specifications] : [];
            if (!currentRows[index]) return prev;
            currentRows[index] = {
                ...currentRows[index],
                [field]: value,
            };
            return {
                ...prev,
                specifications: currentRows,
            };
        });
    };

    const addSpecificationRow = () => {
        setProductDraft((prev) => ({
            ...prev,
            specifications: [
                ...(Array.isArray(prev.specifications) ? prev.specifications : []),
                { key: '', value: '' },
            ],
        }));
    };

    const removeSpecificationRow = (index) => {
        setProductDraft((prev) => {
            const currentRows = Array.isArray(prev.specifications) ? [...prev.specifications] : [];
            currentRows.splice(index, 1);
            return {
                ...prev,
                specifications: currentRows,
            };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-evolution-indigo">
                    <Tag size={14} weight="bold" />
                    Producto
                </div>
                <button
                    type="button"
                    onClick={resetProductForm}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white"
                >
                    Nuevo
                </button>
            </div>

            <div className="rounded-xl border border-evolution-indigo/30 bg-evolution-indigo/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Ejemplo rapido</p>
                <p className="mt-1 text-[11px] text-indigo-100/90">
                    Nombre: Producto Estrella, SKU: PROD-001, Precio: 49900, Stock: 12.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {INSPECTOR_SECTIONS.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => setCatalogInspectorSection(section.id)}
                        className={cn(
                            'rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
                            catalogInspectorSection === section.id
                                ? 'border-evolution-indigo bg-evolution-indigo text-white'
                                : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
                        )}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {catalogInspectorSection === 'general' ? (
                    <>
                        <EvolutionInput
                            label="Nombre del producto"
                            value={productDraft.name || ''}
                            onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                            placeholder="Ej: Producto Estrella"
                            helperText="Usa un nombre claro para que sea facil de encontrar."
                            required
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="SKU"
                                value={productDraft.sku || ''}
                                onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })}
                                placeholder="Ej: PROD-001"
                                helperText="Codigo interno del producto."
                            />
                            <EvolutionInput
                                label="Precio"
                                type="number"
                                value={productDraft.price ?? ''}
                                onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })}
                                placeholder="Ej: 189900"
                                helperText="Valor final de venta."
                            />
                        </div>

                        {priceTiers.length ? (
                            <div
                                className="space-y-3 rounded-xl border p-3"
                                style={{
                                    borderColor: 'var(--admin-border-soft)',
                                    backgroundColor: 'var(--admin-hover)',
                                }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className={sectionLabelClass}>Tarifas detectadas</p>
                                        <p className="mt-1 text-[11px]" style={{ color: 'var(--admin-muted)' }}>
                                            Llegaron {priceTiers.length} tarifas sincronizadas para este producto.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCatalogInspectorSection('sync')}
                                        className="rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
                                        style={{
                                            borderColor: 'var(--admin-accent-border)',
                                            backgroundColor: 'var(--admin-accent-soft)',
                                            color: 'var(--admin-accent)',
                                        }}
                                    >
                                        Ver Sync
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                    {priceTiers.map((tier) => (
                                        <div
                                            key={`general-tier-${tier.key || tier.slot}`}
                                            className="rounded-xl border px-3 py-2.5"
                                            style={{
                                                borderColor: 'var(--admin-border-soft)',
                                                backgroundColor: 'var(--admin-panel-bg)',
                                            }}
                                        >
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--admin-muted)' }}>
                                                {tier.label || tier.key}
                                            </p>
                                            <p className="mt-1 text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                                                {formatCurrency(tier.value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="Stock"
                                type="number"
                                value={productDraft.stock ?? 0}
                                onChange={(e) => setProductDraft({ ...productDraft, stock: e.target.value })}
                                placeholder="Ej: 12"
                                helperText="Cantidad disponible."
                            />
                            <div className="space-y-1">
                                <label className="pl-1 text-[10px] font-bold uppercase text-zinc-500">Marca</label>
                                <select
                                    value={productDraft.brand || ''}
                                    onChange={(e) => setProductDraft({ ...productDraft, brand: e.target.value })}
                                    className={fieldClass}
                                >
                                    <option value="">Sin marca</option>
                                    {brands.map((brand) => (
                                        <option key={brand} value={brand} className="bg-zinc-900">
                                            {brand}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-zinc-500">Si no existe, agregala desde el apartado Categorias.</p>
                            </div>
                        </div>

                        <EvolutionInput
                            label="Detalle corto"
                            value={productDraft.short_description || ''}
                            onChange={(e) => setProductDraft({ ...productDraft, short_description: e.target.value })}
                            placeholder="Ej: Resumen breve para catalogo y destacados."
                            helperText="Este texto se muestra en catalogo y productos destacados."
                            multiline
                        />

                        <EvolutionInput
                            label="Descripcion larga"
                            value={productDraft.long_description || ''}
                            onChange={(e) => setProductDraft({ ...productDraft, long_description: e.target.value })}
                            placeholder="Ej: Inclui materiales, medidas, envio, garantia y todo el detalle comercial en este campo."
                            helperText="Esta descripcion se usa en la ficha completa del producto."
                            multiline
                        />

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className={sectionLabelClass}>Especificaciones</p>
                                    <p className="mt-1 text-[11px] text-zinc-500">
                                        Carga las especificaciones como celdas. Ejemplo: Material / Bronce, Medida / 30 cm.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addSpecificationRow}
                                    className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-200 hover:bg-white/10"
                                >
                                    <Plus size={12} weight="bold" />
                                    Agregar celda
                                </button>
                            </div>

                            <label className="inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                                <input
                                    type="checkbox"
                                    checked={productDraft.show_specifications !== false}
                                    onChange={(e) => setProductDraft({ ...productDraft, show_specifications: e.target.checked })}
                                />
                                Mostrar especificaciones en la ficha del producto
                            </label>

                            <div className="space-y-2">
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 px-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Campo</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor</p>
                                    <span />
                                </div>

                                {specificationRows.length ? (
                                    specificationRows.map((row, index) => (
                                        <div
                                            key={`specification-${index}`}
                                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-xl border border-white/10 bg-black/10 p-2"
                                        >
                                            <input
                                                type="text"
                                                value={row?.key || ''}
                                                onChange={(e) => updateSpecificationRow(index, 'key', e.target.value)}
                                                placeholder="Ej: Material"
                                                className={fieldClass}
                                            />
                                            <input
                                                type="text"
                                                value={row?.value || ''}
                                                onChange={(e) => updateSpecificationRow(index, 'value', e.target.value)}
                                                placeholder="Ej: Bronce cromado"
                                                className={fieldClass}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeSpecificationRow(index)}
                                                className="inline-flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-rose-300 hover:bg-rose-500/15"
                                                aria-label="Eliminar especificacion"
                                            >
                                                <Trash size={14} weight="bold" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-4 text-[11px] text-zinc-500">
                                        Todavia no cargaste especificaciones.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div>
                                <p className={sectionLabelClass}>Variaciones</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    Usa el mismo grupo en todas las variantes. Marca una como raiz para que el catalogo la muestre como expandible.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <EvolutionInput
                                    label="Grupo de variaciones"
                                    value={productDraft.variant_group || ''}
                                    onChange={(e) => setProductDraft({ ...productDraft, variant_group: e.target.value })}
                                    placeholder="Ej: griferia-linea-nova"
                                    helperText="Identificador comun entre raiz y variantes."
                                />
                                <EvolutionInput
                                    label="Nombre del grupo"
                                    value={productDraft.variant_group_label || ''}
                                    onChange={(e) => setProductDraft({ ...productDraft, variant_group_label: e.target.value })}
                                    placeholder="Ej: Linea Nova"
                                    helperText="Texto visible para el bloque de variaciones."
                                />
                            </div>

                            <EvolutionInput
                                label="Etiqueta de variacion"
                                value={productDraft.variant_label || ''}
                                onChange={(e) => setProductDraft({ ...productDraft, variant_label: e.target.value })}
                                placeholder="Ej: Cromo mate / Negro / 30 cm"
                                helperText="Lo que el cliente vera al desplegar las variantes."
                            />

                            <label className="inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                                <input
                                    type="checkbox"
                                    checked={Boolean(productDraft.is_variant_root)}
                                    onChange={(e) => setProductDraft({ ...productDraft, is_variant_root: e.target.checked })}
                                />
                                Marcar como producto raiz del grupo
                            </label>
                        </div>

                        <label className="inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                            <input
                                type="checkbox"
                                checked={Boolean(productDraft.is_featured)}
                                onChange={(e) => setProductDraft({ ...productDraft, is_featured: e.target.checked })}
                            />
                            Marcar como destacado
                        </label>
                    </>
                ) : null}

                {catalogInspectorSection === 'categories' ? (
                    <div className="space-y-4">


                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div>
                                <p className={sectionLabelClass}>Categorias del producto</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    Usa el desplegable para ver toda la jerarquia y seleccionar una o mas categorias.
                                </p>
                            </div>

                            {categoryOptions.length ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryPickerOpen((prev) => !prev)}
                                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-left text-sm text-zinc-200 transition-colors hover:border-white/20"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                {selectedCategoryEntries.length
                                                    ? `${selectedCategoryEntries.length} categorias seleccionadas`
                                                    : 'Seleccionar categorias'}
                                            </p>
                                            <p className="mt-1 text-[11px] text-zinc-500">
                                                {selectedCategoryEntries.length
                                                    ? selectedCategoryEntries.map((entry) => entry.name).join(', ')
                                                    : 'Abre el desplegable para ver todas las categorias.'}
                                            </p>
                                        </div>
                                        <CaretDown
                                            size={14}
                                            weight="bold"
                                            className={cn('transition-transform', isCategoryPickerOpen && 'rotate-180')}
                                        />
                                    </button>

                                    {isCategoryPickerOpen ? (
                                        <div className="custom-scrollbar max-h-72 space-y-2 overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
                                            {categoryOptions.map((category) => {
                                                const selected = selectedCategories.includes(String(category.id).trim().toLowerCase());
                                                return (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        onClick={() => toggleProductCategorySelection(category.id)}
                                                        className={cn(
                                                            'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                                                            selected
                                                                ? 'border-evolution-indigo bg-evolution-indigo/15 text-white'
                                                                : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white'
                                                        )}
                                                        style={{ paddingLeft: `${12 + category.depth * 18}px` }}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-sm font-semibold">{category.name}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                                                {selected ? 'Activa' : 'Agregar'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-zinc-500">{category.path}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap gap-2">
                                        {selectedCategoryEntries.length ? (
                                            selectedCategoryEntries.map((category) => (
                                                <button
                                                    key={`selected-category-${category.id}`}
                                                    type="button"
                                                    onClick={() => toggleProductCategorySelection(category.id)}
                                                    className="rounded-lg border border-evolution-indigo/30 bg-evolution-indigo/10 px-3 py-1.5 text-[11px] font-bold text-indigo-100 hover:bg-evolution-indigo/20"
                                                >
                                                    {category.path}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-[11px] italic text-zinc-500">Todavia no seleccionaste categorias para este producto.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="text-[11px] italic text-zinc-500">No hay categorias creadas todavia.</p>
                            )}
                        </div>

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div>
                                <p className={sectionLabelClass}>Arbol sincronizado</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    Este bloque muestra el `category_path` recibido del sistema de gestion.
                                </p>
                            </div>
                            {sourceCategoryPath.length ? (
                                <div className="space-y-2">
                                    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                        <p className="text-sm font-semibold text-zinc-100">{sourceCategoryPath.join(' > ')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {sourceCategoryPath.map((segment, index) => (
                                            <span
                                                key={`source-category-segment-${index}`}
                                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-zinc-300"
                                            >
                                                {segment}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCreateCategoriesFromSourcePath}
                                        disabled={categorySaving}
                                        className="flex min-h-10 w-full items-center justify-center rounded-xl border border-evolution-indigo/30 bg-evolution-indigo/10 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-100 transition-colors hover:bg-evolution-indigo/20 disabled:opacity-60"
                                    >
                                        {categorySaving ? 'Creando categorias...' : 'Crear y seleccionar este arbol'}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[11px] italic text-zinc-500">Este producto no tiene `category_path` sincronizado.</p>
                            )}
                        </div>
                    </div>
                ) : null}

                {catalogInspectorSection === 'media' ? (
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className={sectionLabelClass}>Imagenes</p>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <span>Subiendo...</span>
                                ) : (
                                    <>
                                        <Plus size={12} weight="bold" />
                                        Agregar
                                    </>
                                )}
                            </label>
                        </div>
                        <p className="text-[10px] text-zinc-500">Sube imagenes cuadradas para mejor vista en el catalogo.</p>
                        <div className="grid grid-cols-3 gap-2">
                            {Array.isArray(productDraft.images) && productDraft.images.length > 0 ? (
                                productDraft.images.map((img, idx) => (
                                    <div
                                        key={`${img.url}-${idx}`}
                                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                    >
                                        <img src={img.url} alt={img.alt || ''} className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-white opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash size={12} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSetPrimaryImage(idx)}
                                            className={cn(
                                                'absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-bold',
                                                img.primary ? 'bg-evolution-indigo text-white' : 'bg-zinc-900/80 text-zinc-300'
                                            )}
                                        >
                                            {img.primary ? 'Principal' : 'Primaria'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-3 text-[10px] italic text-zinc-600">Sin imagenes cargadas.</div>
                            )}
                        </div>
                    </div>
                ) : null}

                {catalogInspectorSection === 'sync' ? (
                    <>
                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div>
                                <p className={sectionLabelClass}>Tarifas sincronizadas</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    Aqui puedes verificar las tarifas libres `price_1..price_10` guardadas para este producto.
                                </p>
                            </div>
                            {priceTiers.length ? (
                                <div className="space-y-2">
                                    {priceTiers.map((tier) => (
                                        <div
                                            key={tier.key || tier.slot}
                                            className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                                            style={{
                                                borderColor: 'var(--admin-border-soft)',
                                                backgroundColor: 'var(--admin-hover)',
                                            }}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                                                    {tier.label || tier.key}
                                                </p>
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--admin-muted)' }}>
                                                    {tier.key || `price_${tier.slot}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                                                    {formatCurrency(tier.value)}
                                                </p>
                                                <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--admin-muted)' }}>
                                                    Valor exacto: {String(tier.value)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] italic text-zinc-500">Este producto no tiene tarifas sincronizadas visibles en el panel.</p>
                            )}
                        </div>

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className={sectionLabelClass}>Sync y visibilidad</p>
                                <span className={cn('rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em]', syncMeta.tone)}>
                                    {syncMeta.label}
                                </span>
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-zinc-200">
                                <input
                                    type="checkbox"
                                    checked={Boolean(productDraft.is_visible_web)}
                                    onChange={(e) => setProductDraft({ ...productDraft, is_visible_web: e.target.checked })}
                                    className="mt-1"
                                />
                                <span className="space-y-1">
                                    <span className="block text-[11px] font-bold uppercase tracking-widest text-zinc-200">Visible en web</span>
                                    <span className="block text-[11px] text-zinc-500">Control manual del storefront. Si lo apagas, deja de publicarse.</span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-zinc-200">
                                <input
                                    type="checkbox"
                                    checked={Boolean(productDraft.admin_locked)}
                                    onChange={(e) => setProductDraft({ ...productDraft, admin_locked: e.target.checked })}
                                    className="mt-1"
                                />
                                <span className="space-y-1">
                                    <span className="block text-[11px] font-bold uppercase tracking-widest text-zinc-200">Bloquear sync admin</span>
                                    <span className="block text-[11px] text-zinc-500">El ERP sigue actualizando stock y precio, pero no pisa contenido editorial.</span>
                                </span>
                            </label>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Origen</p>
                                    <p className="mt-1 text-sm text-zinc-200">{productDraft.source_system || 'Manual / Admin'}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">External ID</p>
                                    <p className="mt-1 break-all text-sm text-zinc-200">{productDraft.external_id || 'Sin enlace externo'}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 md:col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ultima sincronizacion</p>
                                    <p className="mt-1 text-sm text-zinc-200">{formatSyncDate(productDraft.last_sync_at)}</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 md:col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado en origen</p>
                                    <p className="mt-1 text-sm text-zinc-200">
                                        {productDraft.is_active_source === false
                                            ? 'El ERP lo marco como inactivo.'
                                            : 'Activo en el sistema externo.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                                        <Box size={14} weight="bold" />
                                        Acciones
                                    </div>
                                    <p className="text-[11px] leading-5 text-zinc-500">
                                        Operaciones rapidas sobre el producto seleccionado y la vitrina publica.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleClearFeatured}
                                disabled={clearingFeatured}
                                className="flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-black/10 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
                            >
                                {clearingFeatured ? 'Limpiando destacados...' : 'Quitar todos los destacados'}
                            </button>
                            {isEditing ? (
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ajuste rapido de stock</p>
                                        <div className="grid grid-cols-[1fr_auto] gap-2">
                                            <input
                                                type="number"
                                                value={stockEdits[editingProductId] ?? ''}
                                                placeholder="+5 o -2"
                                                onChange={(e) => setStockEdits((prev) => ({ ...prev, [editingProductId]: e.target.value }))}
                                                className="min-h-11 rounded-xl border border-white/25 bg-zinc-900/70 px-3 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddStock(editingProductId)}
                                                disabled={stockSavingId === editingProductId}
                                                className="min-h-11 rounded-xl bg-white/10 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20 disabled:opacity-60"
                                            >
                                                {stockSavingId === editingProductId ? '...' : 'Sumar'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = Boolean(productDraft.is_featured);
                                                handleToggleFeatured(editingProductId, current);
                                                setProductDraft({ ...productDraft, is_featured: !current });
                                            }}
                                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-white/10"
                                        >
                                            <Star size={14} weight="bold" />
                                            {productDraft.is_featured ? 'Quitar destacado' : 'Destacar'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteProduct(editingProductId)}
                                            disabled={deleteLoadingId === editingProductId}
                                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-rose-100 disabled:opacity-60"
                                        >
                                            <Trash size={14} weight="bold" />
                                            {deleteLoadingId === editingProductId ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-4 text-center text-[11px] italic text-zinc-500">
                                    Selecciona un producto para acciones avanzadas.
                                </p>
                            )}
                        </div>
                    </>
                ) : null}
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-2">
                {isEditing ? (
                    <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="h-10 flex-1 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white"
                    >
                        Cancelar
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={isEditing ? handleUpdateProduct : handleCreateProduct}
                    disabled={saving || !derived?.canSave}
                    className="h-10 flex-1 rounded-lg bg-evolution-indigo text-[10px] font-bold uppercase tracking-widest text-white hover:bg-evolution-indigo/90 disabled:opacity-60"
                >
                    {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
                </button>
            </div>
        </div>
    );
};

export default CatalogInspectorPanel;
