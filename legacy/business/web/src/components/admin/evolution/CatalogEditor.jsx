import React, { useMemo, useState } from 'react';
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

const CatalogEditor = ({ products, onAddItem, onEditProduct }) => {
    const { selectItem, selectedId } = useEvolutionStore();
    const [searchQuery, setSearchQuery] = useState('');

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

    const handleAdd = () => {
        if (typeof onAddItem !== 'function') return;
        onAddItem('product');
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-dark/40 p-3 backdrop-blur-sm">
                        <div className="rounded-lg bg-evolution-indigo/15 p-2 text-evolution-indigo">
                            <Package size={18} weight="bold" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Catalogo</p>
                            <p className="text-sm font-bold text-white">Productos</p>
                        </div>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                        Categorias y marcas ahora se gestionan desde el apartado `Categorias`.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <MagnifyingGlass
                            size={16}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-evolution-indigo"
                        />
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64 rounded-xl border border-white/5 bg-zinc-dark/40 py-2 pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 transition-all focus:border-evolution-indigo/50 focus:outline-none focus:ring-1 focus:ring-evolution-indigo/50"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="group rounded-xl bg-evolution-indigo p-2 text-white shadow-glow transition-all hover:bg-evolution-indigo/90"
                        title="Crear producto"
                    >
                        <Plus size={20} weight="bold" className="transition-transform duration-300 group-hover:rotate-90" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar pr-2 -mr-2">
                <div className="grid grid-cols-2 gap-4 pb-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                selectItem(item.id, 'product', item);
                                if (typeof onEditProduct === 'function') {
                                    onEditProduct(item);
                                }
                            }}
                            className={cn(
                                'group relative cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-zinc-dark/20 p-3 transition-all hover:border-white/20 hover:bg-zinc-dark/40',
                                selectedId === item.id && 'border-evolution-indigo ring-1 ring-evolution-indigo/20 bg-zinc-dark/60 shadow-glow'
                            )}
                        >
                            <div className="relative mb-3 aspect-square overflow-hidden rounded-xl border border-white/5 bg-white/5">
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center text-zinc-700 transition-colors group-hover:text-zinc-500">
                                        <ImageIcon size={32} weight="thin" className="opacity-20" />
                                        <span className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-20">No Image</span>
                                    </div>
                                )}

                                {Number(item.price) > 0 ? (
                                <div className="absolute bottom-2 right-2 rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
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
                                    <span className="rounded-md border border-white/10 bg-zinc-950/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-md">
                                        {SYNC_STATUS_LABELS[item.sync_status] || 'Manual'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h4 className="truncate text-[13px] font-bold text-zinc-300 transition-colors group-hover:text-white">
                                    {item.name}
                                </h4>
                                <p className="truncate text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                                    {item.source_system || 'admin'}
                                    {item.external_id ? ` · ${item.external_id}` : ''}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-zinc-600">{item.sku || 'NO-SKU'}</span>
                                    <span
                                        className={cn(
                                            'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                            Number(item.stock) > 0 ? 'text-emerald-500/80' : 'text-rose-500/80'
                                        )}
                                    >
                                        {Number(item.stock) > 0 ? `Stock: ${item.stock}` : 'Agotado'}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button className="rounded-lg border border-white/10 bg-white/10 p-1.5 text-white backdrop-blur-md hover:bg-white/20">
                                    <DotsThree size={14} weight="bold" />
                                </button>
                                <button className="rounded-lg bg-white p-1.5 text-zinc-900 shadow-xl transition-transform hover:scale-100 scale-90">
                                    <ArrowUpRight size={14} weight="bold" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredItems.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center space-y-4 py-20 text-zinc-600">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/5 bg-white/5">
                                <MagnifyingGlass size={24} weight="thin" className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium">No se encontraron resultados para "{searchQuery}"</p>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <p className="text-[11px] font-medium italic text-zinc-500">
                    Mostrando {filteredItems.length} de {normalizedProducts.length} productos.
                </p>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 transition-colors hover:text-white">
                        <Funnel size={14} weight="bold" />
                        Filtros Avanzados
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CatalogEditor;
