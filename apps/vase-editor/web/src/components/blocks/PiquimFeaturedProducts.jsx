import React, { useMemo, useState } from 'react';
import { navigate } from '../../utils/navigation';

const formatPrice = (value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return '$ 0';
    return `$ ${amount.toLocaleString('es-AR')}`;
};

const toCategoryLabel = (product = {}) => {
    const source = product.category_name || product.category || product.rubro || '';
    const text = String(source || '').trim();
    if (!text) return 'Sin categoria';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const resolveProductImage = (product = {}) => {
    const images = Array.isArray(product?.images) ? product.images : [];
    const firstImage = images[0];
    if (typeof firstImage === 'string' && firstImage) return firstImage;
    if (firstImage?.url) return firstImage.url;
    return product?.image || product?.image_url || '/piquim/product-bucket.png';
};

const normalizeProduct = (product = {}) => ({
    id: product.id || product.sku || Math.random().toString(36).slice(2),
    name: product.name || 'Producto',
    description: product.short_description || product.description || 'Edicion profesional PIQUIM',
    price: Number(product.price || 0),
    image: resolveProductImage(product),
    category: toCategoryLabel(product),
    isBestSeller: Boolean(product.is_best_seller || product.is_featured),
});

export default function PiquimFeaturedProducts({
    title = 'Productos destacados',
    subtitle = 'Una seleccion para compra agil y rendimiento constante.',
    ctaLabel = 'VER TODO EL CATALOGO',
    ctaLink = '/catalog',
    products = [],
}) {
    const items = useMemo(() => {
        const source = Array.isArray(products) ? products : [];
        return source.map(normalizeProduct).slice(0, 8);
    }, [products]);

    const categories = useMemo(() => {
        const set = new Set(items.map((item) => item.category).filter(Boolean));
        return ['Todos', ...Array.from(set).slice(0, 4)];
    }, [items]);

    const [activeFilter, setActiveFilter] = useState('Todos');

    const filteredItems = useMemo(() => {
        if (activeFilter === 'Todos') return items;
        return items.filter((item) => item.category === activeFilter);
    }, [activeFilter, items]);

    const displayItems = filteredItems.length ? filteredItems : items;

    return (
        <section className="bg-[#f5f2f0] py-14 md:py-20">
            <div className="mx-auto max-w-[1438px] px-4 md:px-[80px]">
                <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">Lo mas pedido</p>
                        <h2 className="mt-2 text-[38px] font-black leading-[0.95] tracking-[-1px] text-[#1a1614] md:text-[52px]">
                            {title.split(' ')[0]} <span className="italic text-[#ff4d00]">{title.split(' ').slice(1).join(' ')}</span>
                        </h2>
                        <p className="mt-3 max-w-[580px] text-sm text-[#6f625d]">{subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {categories.map((category) => {
                            const active = category === activeFilter;
                            return (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveFilter(category)}
                                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                        active
                                            ? 'border-[#1a1614] bg-[#1a1614] text-[#fffaf6]'
                                            : 'border-[#d9cfc7] bg-white text-[#6b5f58] hover:border-[#ff4d00] hover:text-[#ff4d00]'
                                    }`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {displayItems.map((product) => (
                        <article key={product.id} className="overflow-hidden rounded-2xl border border-[#e3dbd4] bg-white shadow-[0_8px_22px_rgba(26,22,20,0.06)]">
                            <div className="relative aspect-[4/3] bg-[#dbeaf3]">
                                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                {product.isBestSeller ? (
                                    <span className="absolute left-2 top-2 rounded-full bg-[#ff4d00] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                                        Mas vendido
                                    </span>
                                ) : null}
                            </div>
                            <div className="space-y-2 p-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#ff4d00]">{product.category}</p>
                                <h3 className="line-clamp-1 text-[17px] font-black leading-tight text-[#1a1614]">{product.name}</h3>
                                <p className="line-clamp-1 text-xs text-[#8c7f76]">{product.description}</p>
                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-[30px] font-black leading-none text-[#1a1614]">{formatPrice(product.price)}</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/catalog')}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4d00] text-white transition-transform hover:scale-105"
                                        aria-label="Ver producto"
                                    >
                                        <span className="text-sm font-black">→</span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-8 flex justify-center md:mt-10">
                    <button
                        type="button"
                        onClick={() => navigate(ctaLink || '/catalog')}
                        className="rounded-full bg-[#1a1614] px-8 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-[#fffaf6] transition-colors hover:bg-[#ff4d00]"
                    >
                        {ctaLabel}
                    </button>
                </div>
            </div>
        </section>
    );
}
