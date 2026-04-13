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

export default function FeaturedProductsLuxury({
    products = [],
    title = 'Productos en oferta',
    subtitle = '',
    ctaLabel = 'Ver todo',
    ctaLink = '/catalog',
    styles = {},
    onAddToCart,
    onOpenProduct,
    showPricesEnabled = true,
    canViewPrices = true,
    authLoading = false,
}) {
    const colors = normalizeFeaturedStyles('luxury', styles);

    return (
        <section className="px-4 py-14 md:px-10" style={{ backgroundColor: colors.backgroundColor }}>
            <div className="mx-auto max-w-[1408px]">
                <div className="mb-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2
                            className="text-4xl leading-tight tracking-tight lg:text-5xl"
                            style={{
                                color: colors.titleColor,
                                fontFamily: '"Playfair Display", Georgia, serif',
                                fontWeight: 700,
                            }}
                        >
                            {title}
                        </h2>
                        {subtitle ? (
                            <p className="mt-2 text-base italic tracking-wide" style={{ color: colors.subtitleColor }}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {ctaLabel ? (
                        <button
                            type="button"
                            onClick={() => openLink(ctaLink || '/catalog')}
                            className="group inline-flex items-center gap-2 border-b pb-1 text-xs font-semibold uppercase tracking-[0.22em] transition hover:opacity-80"
                            style={{ color: colors.accentColor, borderColor: `${colors.accentColor}55` }}
                        >
                            {ctaLabel}
                            <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    ) : null}
                </div>

                {products.length ? (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {products.map((product) => (
                            <article key={product.id} className="group flex flex-col" style={{ color: colors.titleColor }}>
                                <button
                                    type="button"
                                    onClick={() => onOpenProduct?.(product)}
                                    className="relative aspect-[4/5] overflow-hidden border"
                                    style={{ borderColor: colors.borderColor, backgroundColor: colors.cardBackgroundColor }}
                                >
                                    <img src={product.image} alt={product.alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    {product.badgeText ? (
                                        <span
                                            className="absolute left-3 top-3 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white"
                                            style={{ backgroundColor: colors.accentColor }}
                                        >
                                            {product.badgeText}
                                        </span>
                                    ) : null}
                                </button>

                                <div className="mt-5 flex flex-1 flex-col">
                                    <div className="mb-2 flex items-center justify-between">
                                        {product.stockStatus ? (
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] ${product.stockStatus.bg} ${product.stockStatus.tone}`}>
                                                {product.stockStatus.label}
                                            </span>
                                        ) : <span />}
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: colors.accentColor }}>
                                            Premium
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onOpenProduct?.(product)}
                                        className="text-left text-xl leading-tight"
                                        style={{
                                            fontFamily: '"Playfair Display", Georgia, serif',
                                            color: colors.titleColor,
                                        }}
                                    >
                                        {product.name}
                                    </button>
                                    {product.shortDescription ? (
                                        <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: colors.subtitleColor }}>
                                            {product.shortDescription}
                                        </p>
                                    ) : null}

                                    <div className="mt-2">
                                        {showPricesEnabled ? (
                                            canViewPrices ? (
                                                <p className="text-lg font-semibold" style={{ color: colors.priceColor }}>
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

                                    <button
                                        type="button"
                                        onClick={() => onAddToCart?.(product)}
                                        disabled={!product.inStock}
                                        className="mt-5 flex h-11 w-full items-center justify-center gap-2 border text-xs font-semibold uppercase tracking-[0.18em] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                                        style={{
                                            backgroundColor: colors.buttonBackgroundColor,
                                            color: colors.buttonTextColor,
                                            borderColor: colors.borderColor,
                                        }}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
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
