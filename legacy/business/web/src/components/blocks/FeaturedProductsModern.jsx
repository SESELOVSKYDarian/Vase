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

export default function FeaturedProductsModern({
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
    const colors = normalizeFeaturedStyles('modern', styles);

    return (
        <section className="px-4 py-12 md:px-10" style={{ backgroundColor: colors.backgroundColor }}>
            <div className="mx-auto max-w-[1408px]">
                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={{ color: colors.titleColor }}>
                            {title}
                        </h2>
                        {subtitle ? (
                            <p className="mt-1 text-base sm:text-lg" style={{ color: colors.subtitleColor }}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {ctaLabel ? (
                        <button
                            type="button"
                            onClick={() => openLink(ctaLink || '/catalog')}
                            className="group inline-flex items-center gap-1 text-sm font-black uppercase tracking-[0.16em] transition hover:opacity-80"
                            style={{ color: colors.accentColor }}
                        >
                            {ctaLabel}
                            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    ) : null}
                </div>

                {products.length ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => (
                            <article
                                key={product.id}
                                className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                                style={{ backgroundColor: colors.cardBackgroundColor }}
                            >
                                <button
                                    type="button"
                                    onClick={() => onOpenProduct?.(product)}
                                    className="relative block aspect-square w-full overflow-hidden bg-slate-100"
                                >
                                    <img src={product.image} alt={product.alt} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                                    {product.badgeText ? (
                                        <span
                                            className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
                                            style={{ backgroundColor: colors.accentColor }}
                                        >
                                            {product.badgeText}
                                        </span>
                                    ) : null}
                                </button>

                                <div className="flex flex-col gap-3 p-4">
                                    {product.stockStatus ? (
                                        <span
                                            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${product.stockStatus.bg} ${product.stockStatus.tone}`}
                                        >
                                            {product.stockStatus.label}
                                        </span>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => onOpenProduct?.(product)}
                                        className="text-left text-lg font-bold leading-tight"
                                        style={{ color: colors.titleColor }}
                                    >
                                        {product.name}
                                    </button>
                                    {product.shortDescription ? (
                                        <p className="line-clamp-2 text-sm leading-6" style={{ color: colors.subtitleColor }}>
                                            {product.shortDescription}
                                        </p>
                                    ) : null}
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
                                    <button
                                        type="button"
                                        onClick={() => onAddToCart?.(product)}
                                        disabled={!product.inStock}
                                        className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-[0.08em] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{
                                            backgroundColor: colors.buttonBackgroundColor,
                                            color: colors.buttonTextColor,
                                        }}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
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
