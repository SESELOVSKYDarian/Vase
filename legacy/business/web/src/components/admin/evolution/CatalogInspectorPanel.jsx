import React from 'react';
import EvolutionInput from './EvolutionInput';
import { cn } from '../../../utils/cn';
import {
    Tag,
    Package as Box,
    Star,
    Trash,
    Plus
} from '@phosphor-icons/react';

const fieldClass =
    "w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30";

const sectionLabelClass = "text-[10px] uppercase font-bold tracking-widest text-zinc-500";

const SYNC_STATUS_META = {
    manual: { label: 'Manual', tone: 'text-zinc-400 border-white/10 bg-white/5' },
    synced: { label: 'Sincronizado', tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
    source_inactive: { label: 'Inactivo en origen', tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10' },
    deleted: { label: 'Baja logica', tone: 'text-rose-300 border-rose-500/20 bg-rose-500/10' },
};

const formatSyncDate = (value) => {
    if (!value) return 'Todavia no sincronizado';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Fecha invalida';
    return parsed.toLocaleString('es-AR');
};

const CatalogInspectorPanel = ({ catalog, categories = [], brands = [] }) => {
    if (!catalog) return null;

    const {
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
        toggleProductCategorySelection,
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
        resetProductForm,
    } = catalog;

    const isEditing = Boolean(editingProductId);
    const selectedCategories = Array.isArray(productDraft.category_ids) ? productDraft.category_ids : [];
    const specificationRows = Array.isArray(productDraft.specifications) ? productDraft.specifications : [];
    const syncMeta = SYNC_STATUS_META[productDraft.sync_status] || SYNC_STATUS_META.manual;

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
                <div className="flex items-center gap-2 text-[11px] text-evolution-indigo font-bold uppercase tracking-widest">
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

            <div className="space-y-4">
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
                        <label className="pl-1 text-[10px] uppercase font-bold text-zinc-500">Marca</label>
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

                <div className="space-y-2">
                    <p className={`${sectionLabelClass} pl-1`}>Categorias del producto</p>
                    <p className="text-[10px] text-zinc-500">Selecciona una o mas categorias para clasificarlo.</p>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-white/5 bg-white/5 p-2">
                        {categories.length > 0 ? (
                            categories.map((cat) => {
                                const selected = selectedCategories.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => toggleProductCategorySelection(cat.id)}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors",
                                            selected
                                                ? "bg-evolution-indigo text-white border-evolution-indigo"
                                                : "bg-transparent text-zinc-300 border-white/10 hover:border-evolution-indigo/50"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })
                        ) : (
                            <p className="text-[10px] italic text-zinc-500">No hay categorias creadas todavia.</p>
                        )}
                    </div>
                </div>

                <label className="inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400">
                    <input
                        type="checkbox"
                        checked={Boolean(productDraft.is_featured)}
                        onChange={(e) => setProductDraft({ ...productDraft, is_featured: e.target.checked })}
                    />
                    Marcar como destacado
                </label>

                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <p className={sectionLabelClass}>Sync y visibilidad</p>
                        <span className={cn("rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em]", syncMeta.tone)}>
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
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <p className={sectionLabelClass}>Imagenes</p>
                    <label className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-zinc-300 cursor-pointer hover:bg-white/10">
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
                                className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
                            >
                                <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute top-1 right-1 p-1 rounded bg-zinc-900/80 text-white opacity-0 group-hover:opacity-100"
                                >
                                    <Trash size={12} weight="bold" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSetPrimaryImage(idx)}
                                    className={cn(
                                        "absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
                                        img.primary ? "bg-evolution-indigo text-white" : "bg-zinc-900/80 text-zinc-300"
                                    )}
                                >
                                    {img.primary ? 'Principal' : 'Primaria'}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-[10px] text-zinc-600 italic">Sin imagenes cargadas.</div>
                    )}
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Box size={14} weight="bold" />
                    Acciones
                </div>
                <button
                    type="button"
                    onClick={handleClearFeatured}
                    disabled={clearingFeatured}
                    className="w-full h-9 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-60"
                >
                    {clearingFeatured ? 'Limpiando destacados...' : 'Quitar todos los destacados'}
                </button>
                {isEditing ? (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="number"
                                value={stockEdits[editingProductId] ?? ''}
                                placeholder="+5 / -2"
                                onChange={(e) => setStockEdits((prev) => ({ ...prev, [editingProductId]: e.target.value }))}
                                className="w-24 rounded-lg border border-white/25 bg-zinc-900/70 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-evolution-indigo focus:ring-2 focus:ring-evolution-indigo/30"
                            />
                            <button
                                type="button"
                                onClick={() => handleAddStock(editingProductId)}
                                disabled={stockSavingId === editingProductId}
                                className="px-3 h-9 rounded-lg bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 disabled:opacity-60"
                            >
                                {stockSavingId === editingProductId ? '...' : 'Sumar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const current = Boolean(productDraft.is_featured);
                                    handleToggleFeatured(editingProductId, current);
                                    setProductDraft({ ...productDraft, is_featured: !current });
                                }}
                                className="px-3 h-9 rounded-lg bg-white/5 text-[10px] font-bold text-zinc-300 hover:bg-white/10 flex items-center gap-1"
                            >
                                <Star size={12} weight="bold" />
                                {productDraft.is_featured ? 'Quitar destacado' : 'Destacar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteProduct(editingProductId)}
                                disabled={deleteLoadingId === editingProductId}
                                className="px-3 h-9 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 disabled:opacity-60"
                            >
                                {deleteLoadingId === editingProductId ? '...' : 'Eliminar'}
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="text-[10px] text-zinc-600 italic">Selecciona un producto para acciones avanzadas.</p>
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
                {isEditing ? (
                    <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="flex-1 h-10 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white"
                    >
                        Cancelar
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={isEditing ? handleUpdateProduct : handleCreateProduct}
                    disabled={saving || !derived?.canSave}
                    className="flex-1 h-10 rounded-lg bg-evolution-indigo text-white text-[10px] font-bold uppercase tracking-widest hover:bg-evolution-indigo/90 disabled:opacity-60"
                >
                    {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
                </button>
            </div>
        </div>
    );
};

export default CatalogInspectorPanel;

