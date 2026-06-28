import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { cn } from '../../../utils/cn';
import {
    Package,
    MagnifyingGlass,
    Plus,
    Funnel,
    DotsThree,
    ArrowUpRight,
    Image as ImageIcon,
    Trash,
} from '@phosphor-icons/react';

const getProductImage = (product) => {
    if (!product || typeof product !== 'object') return '';
    const data = product.data && typeof product.data === 'object' ? product.data : {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const firstImage = rawImages[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage && typeof firstImage === 'object') {
        return firstImage.url || firstImage.src || '';
    }
    return data.image || data.image_url || product.image_url || product.image || '';
};

const SYNC_STATUS_LABELS = {
    manual: 'Manual',
    synced: 'Sync OK',
    source_inactive: 'Origen inactivo',
    deleted: 'Baja logica',
};

const PRODUCTS_PER_PAGE = 10;

const CatalogEditor = ({ products, onAddItem, onEditProduct, onDeleteProduct }) => {
    const { selectItem, selectedId } = useEvolutionStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [openActionsId, setOpenActionsId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const normalizedProducts = useMemo(() => {
        return (Array.isArray(products) ? products : [])
            .map((item, index) => ({
                ...item,
                id: item?.id || `product-${index}`,
                name: item?.name || '',
                image_url: getProductImage(item),
            }))
            .filter((item) => item.name);
    }, [products]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return normalizedProducts.filter((product) =>
            product.name?.toLowerCase().includes(query) ||
            String(product.sku || '').toLowerCase().includes(query)
        );
    }, [normalizedProducts, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PRODUCTS_PER_PAGE));

    const visibleItems = useMemo(() => {
        const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
        return filteredItems.slice(start, start + PRODUCTS_PER_PAGE);
    }, [currentPage, filteredItems]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setOpenActionsId(null);
    }, [currentPage, searchQuery]);

    const handleAdd = () => {
        if (typeof onAddItem !== 'function') return;
        onAddItem('product');
    };

    const toggleActions = (event, itemId) => {
        event.stopPropagation();
        setOpenActionsId((current) => (current === itemId ? null : itemId));
    };

    const handleDelete = (event, item) => {
        event.stopPropagation();
        setOpenActionsId(null);
        if (typeof onDeleteProduct !== 'function') return;
        setDeleteTarget(item);
    };

    const closeDeleteModal = () => {
        setDeleteTarget(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget || typeof onDeleteProduct !== 'function') return;
        onDeleteProduct(deleteTarget.id, deleteTarget.name, { skipConfirm: true });
        setDeleteTarget(null);
    };

    useEffect(() => {
        if (!deleteTarget) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeDeleteModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteTarget]);

    const deleteModal = deleteTarget && typeof document !== 'undefined'
        ? createPortal(
            <div
                className="fixed inset-0 z-[10000] flex items-center justify-center px-6 py-10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-product-title"
                onClick={closeDeleteModal}
            >
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[4px]" />
                <div
                    className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white text-slate-950 shadow-[0_28px_90px_rgba(2,6,23,0.45)]"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                                <Trash size={22} weight="bold" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600">Eliminar producto</p>
                                <h3 id="delete-product-title" className="text-xl font-black tracking-tight text-slate-950">
                                    Confirmar eliminacion
                                </h3>
                                <p className="text-sm leading-6 text-slate-600">
                                    Esta accion quita el producto del catalogo y de la tienda publica.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 px-6 py-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Producto seleccionado</p>
                            <p className="mt-1 break-words text-base font-bold text-slate-950">
                                {deleteTarget.name || 'Producto sin nombre'}
                            </p>
                            {deleteTarget.sku ? (
                                <p className="mt-1 font-mono text-xs text-slate-500">SKU: {deleteTarget.sku}</p>
                            ) : null}
                        </div>

                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-800">
                            Se eliminara de forma permanente. Esta accion no se puede deshacer desde el panel.
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeDeleteModal}
                            className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-xs font-black uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmDelete}
                            className="h-11 rounded-xl bg-rose-600 px-5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-rose-950/20 transition-colors hover:bg-rose-500"
                        >
                            Eliminar producto
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )
        : null;

    return (
        <div className="flex h-full flex-col space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <div className="admin-workspace-card flex items-center gap-2.5 rounded-[18px] p-3">
                        <div className="rounded-xl bg-[var(--admin-accent-soft)] p-2 text-[var(--admin-accent)]">
                            <Package size={16} weight="bold" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-muted-soft)]">Catalogo</p>
                            <p className="text-sm font-semibold admin-text-primary">Productos</p>
                        </div>
                    </div>
                    <p className="max-w-2xl text-[11px] leading-5 admin-text-muted">
                        Los productos se publican con las categorias cargadas manualmente o sincronizadas desde el sistema de gestion.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative group w-full sm:w-auto">
                        <MagnifyingGlass
                            size={16}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted-soft)] transition-colors group-focus-within:text-[var(--admin-accent)]"
                        />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="admin-input-field h-9 w-full rounded-xl border py-1.5 pl-9 pr-3 text-[13px] outline-none sm:w-64"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="admin-accent-button group flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:opacity-90"
                        title="Crear producto"
                    >
                        <Plus size={18} weight="bold" className="transition-transform duration-300 group-hover:rotate-90" />
                    </button>
                </div>
            </div>

            <div className="-mr-2 flex-1 overflow-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {visibleItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                selectItem(item.id, 'product', item);
                                if (typeof onEditProduct === 'function') {
                                    onEditProduct(item);
                                }
                            }}
                            className={cn(
                                'group relative cursor-pointer overflow-hidden rounded-[18px] border border-[var(--admin-border-soft)] bg-[var(--admin-surface)] p-2.5 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-border)] hover:bg-[var(--admin-surface-strong)] hover:shadow-[var(--admin-shadow-soft)]',
                                selectedId === item.id && 'border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] shadow-[var(--admin-shadow-soft)]'
                            )}
                        >
                            <div className="relative mb-2.5 aspect-square overflow-hidden rounded-xl border border-[var(--admin-border-soft)] bg-[var(--admin-hover)]">
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center admin-text-muted transition-colors">
                                        <ImageIcon size={28} weight="thin" className="opacity-20" />
                                        <span className="mt-1.5 text-[9px] font-bold uppercase tracking-widest opacity-20">No Image</span>
                                    </div>
                                )}

                                {Number(item.price) > 0 ? (
                                <div className="absolute bottom-2 right-2 rounded-xl border border-[var(--admin-border-soft)] bg-[var(--admin-surface-strong)] px-2 py-1 text-[10px] font-bold admin-text-primary backdrop-blur-md">
                                        ${Number(item.price)}
                                    </div>
                                ) : null}

                                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                                    <span
                                        className={cn(
                                            'rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur-md',
                                            item.is_visible_web !== false
                                                ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-200'
                                                : 'border-amber-500/20 bg-amber-500/15 text-amber-200'
                                        )}
                                    >
                                        {item.is_visible_web !== false ? 'Visible' : 'Oculto'}
                                    </span>
                                    <span className="rounded-md border border-[var(--admin-border-soft)] bg-[var(--admin-surface-strong)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] admin-text-primary backdrop-blur-md">
                                        {SYNC_STATUS_LABELS[item.sync_status] || 'Manual'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="truncate text-[12px] font-semibold admin-text-primary">
                                    {item.name}
                                </h4>
                                <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted-soft)]">
                                    {item.source_system || 'admin'}
                                    {item.external_id ? ` · ${item.external_id}` : ''}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-[var(--admin-muted-soft)]">{item.sku || 'NO-SKU'}</span>
                                    <span
                                        className={cn(
                                            'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                            Number(item.stock) > 0 ? 'text-[var(--admin-success)]' : 'text-[var(--admin-danger)]'
                                        )}
                                    >
                                        {Number(item.stock) > 0 ? `Stock: ${item.stock}` : 'Agotado'}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                <button
                                    type="button"
                                    onClick={(event) => toggleActions(event, item.id)}
                                    className="rounded-xl border border-[var(--admin-border-soft)] bg-[var(--admin-surface-strong)] p-1.5 admin-text-primary backdrop-blur-md hover:bg-[var(--admin-hover-strong)]"
                                    title="Acciones"
                                >
                                    <DotsThree size={14} weight="bold" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => event.stopPropagation()}
                                    className="rounded-xl bg-[var(--admin-accent)] p-1.5 text-[var(--admin-accent-contrast)] shadow-xl transition-transform hover:scale-100 scale-90"
                                    title="Abrir producto"
                                >
                                    <ArrowUpRight size={14} weight="bold" />
                                </button>

                                {openActionsId === item.id ? (
                                    <div
                                        className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-[var(--admin-border-soft)] bg-[var(--admin-surface-strong)] p-1 shadow-2xl backdrop-blur-md"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            onClick={(event) => handleDelete(event, item)}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-rose-300 transition-colors hover:bg-rose-500/15 hover:text-rose-100"
                                        >
                                            <Trash size={14} weight="bold" />
                                            Eliminar
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center space-y-4 py-20 admin-text-muted">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--admin-border-soft)] bg-[var(--admin-hover)]">
                                <MagnifyingGlass size={24} weight="thin" className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium">No se encontraron resultados para "{searchQuery}"</p>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-[var(--admin-border-soft)] pt-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-medium italic admin-text-muted">
                    {filteredItems.length > 0
                        ? `Mostrando ${Math.min((currentPage - 1) * PRODUCTS_PER_PAGE + 1, filteredItems.length)}-${Math.min(currentPage * PRODUCTS_PER_PAGE, filteredItems.length)} de ${filteredItems.length} productos filtrados.`
                        : `Mostrando 0 de ${normalizedProducts.length} productos.`}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                    {totalPages > 1 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {Array.from({ length: totalPages }, (_, index) => {
                                const page = index + 1;
                                const active = currentPage === page;
                                return (
                                    <button
                                        key={`catalog-page-${page}`}
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            'rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors',
                                            active
                                                ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)]'
                                                : 'border-[var(--admin-border-soft)] bg-[var(--admin-hover)] admin-text-muted hover:border-[var(--admin-border)] hover:text-[var(--admin-text)]'
                                        )}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <button className="flex items-center gap-2 text-[11px] font-bold admin-text-muted transition-colors hover:text-[var(--admin-text)]">
                        <Funnel size={14} weight="bold" />
                        Filtros Avanzados
                    </button>
                </div>
            </div>

            {deleteModal}
        </div>
    );
};

export default CatalogEditor;
