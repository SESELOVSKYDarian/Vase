import React from 'react';
import { navigate } from '../../utils/navigation';
import { normalizeFeaturedStyles } from '../../data/featuredProductsTemplates';
import PriceAccessPrompt from '../PriceAccessPrompt';

const openLink = (value) => {
    if (!value) return;
    if (/^https?:\/\//i.test(value)) {
        window.open(value, '_blank', 'noopener,noreferrer');
        return;
    }
    navigate(value);
};

export default function FeaturedProductsHighEnergy({
    products = [],
    title = 'Productos en oferta',
    subtitle = '',
    ctaLabel = 'Ver mas',
    ctaLink = '/catalog',
    styles = {},
    onAddToCart,
    onOpenProduct,
    showPricesEnabled = true,
    canViewPrices = true,
    authLoading = false,
}) {
    const colors = normalizeFeaturedStyles('high_energy', styles);

    return (
        <section className="px-4 py-12 md:px-10" style={{ backgroundColor: colors.backgroundColor }}>
            <div className="mx-auto max-w-[1408px]">
                <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight" style={{ color: colors.titleColor }}>
                            {title}
                        </h2>
                        {subtitle ? (
                            <p className="mt-1 text-base" style={{ color: colors.subtitleColor }}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {ctaLabel ? (
                        <button
                            type="button"
                            onClick={() => openLink(ctaLink || '/catalog')}
                            className="group inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] transition hover:opacity-80"
                            style={{ color: colors.accentColor }}
                        >
                            {ctaLabel}
                            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    ) : null}
                </div>

                {products.length ? (
                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => (
                            <article
                                key={product.id}
                                className="group overflow-hidden rounded-3xl border border-slate-200 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                                style={{ backgroundColor: colors.cardBackgroundColor }}
                            >
                                <div className="relative aspect-square overflow-hidden">
                                    <button type="button" onClick={() => onOpenProduct?.(product)} className="h-full w-full">
                                        <img src={product.image} alt={product.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    </button>
                                    <span
                                        className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white"
                                        style={{ backgroundColor: colors.saleBadgeColor }}
                                    >
                                        Oferta
                                    </span>
                                </div>

                                <div className="space-y-3 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        {product.stockStatus ? (
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${product.stockStatus.bg} ${product.stockStatus.tone}`}
                                            >
                                                {product.stockStatus.label}
                                            </span>
                                        ) : <span />}
                                        <span className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: colors.accentColor }}>
                                            Flash
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onOpenProduct?.(product)}
                                        className="line-clamp-2 text-left text-lg font-black leading-tight"
                                        style={{ color: colors.titleColor }}
                                    >
                                        {product.name}
                                    </button>
                                    {product.shortDescription ? (
                                        <p className="line-clamp-2 text-sm leading-6" style={{ color: colors.subtitleColor }}>
                                            {product.shortDescription}
                                        </p>
                                    ) : null}

                                    <div className="flex items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            {showPricesEnabled ? (
                                                canViewPrices ? (
                                                    <p className="text-2xl font-black" style={{ color: colors.priceColor }}>
                                                        {product.displayPrice}
                                                    </p>
                                                ) : authLoading ? (
                                                    <p className="text-sm font-medium text-[#8a7560]">Cargando precio...</p>
                                                ) : (
                                                    <PriceAccessPrompt compact />
                                                )
                                            ) : (
                                                <p className="text-sm font-medium text-[#8a7560]">Consultar precio</p>
                                            )}
                                        </div>
                                        <span className="rounded bg-black/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                                            Hoy
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onAddToCart?.(product)}
                                        disabled={!product.inStock}
                                        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black uppercase tracking-[0.08em] transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{
                                            backgroundColor: colors.buttonBackgroundColor,
                                            color: colors.buttonTextColor,
                                        }}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1 6h12M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                                        </svg>
                                        {product.inStock ? 'Agregar al carrito' : 'Sin stock'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-[#e5e1de] p-8 text-center text-[#8a7560]">
                        No encontramos productos para mostrar.
                    </div>
                )}
            </div>
        </section>
    );
}
