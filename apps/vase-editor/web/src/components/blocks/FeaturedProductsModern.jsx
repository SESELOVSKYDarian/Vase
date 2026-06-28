import React, { useEffect, useRef, useState } from 'react';
import { navigate } from '../../utils/navigation';
import { normalizeFeaturedStyles } from '../../data/featuredProductsTemplates';
import { useStorefrontThemeColors } from '../../context/ThemeContext';
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
    const themeColors = useStorefrontThemeColors();
    const colors = normalizeFeaturedStyles('modern', styles, themeColors);
    const sliderRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const syncIsMobile = () => setIsMobile(mediaQuery.matches);
        syncIsMobile();
        mediaQuery.addEventListener('change', syncIsMobile);
        return () => mediaQuery.removeEventListener('change', syncIsMobile);
    }, []);

    useEffect(() => {
        if (!products.length) {
            setActiveIndex(0);
            return;
        }
        if (activeIndex > products.length - 1) {
            setActiveIndex(0);
        }
    }, [products.length, activeIndex]);

    useEffect(() => {
        if (!isMobile || products.length < 2) return undefined;
        const interval = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % products.length);
        }, 3800);
        return () => window.clearInterval(interval);
    }, [isMobile, products.length]);

    useEffect(() => {
        if (!isMobile) return;
        const container = sliderRef.current;
        if (!container) return;
        const card = container.children?.[activeIndex];
        if (!card) return;
        container.scrollTo({ left: card.offsetLeft - 8, behavior: 'smooth' });
    }, [activeIndex, isMobile]);

    const handleSliderScroll = () => {
        const container = sliderRef.current;
        if (!container) return;
        const center = container.scrollLeft + container.clientWidth / 2;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        Array.from(container.children).forEach((child, index) => {
            const childCenter = child.offsetLeft + child.clientWidth / 2;
            const distance = Math.abs(childCenter - center);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        });
        if (bestIndex !== activeIndex) setActiveIndex(bestIndex);
    };

    const goToSlide = (index) => {
        if (!products.length) return;
        const safeIndex = ((index % products.length) + products.length) % products.length;
        setActiveIndex(safeIndex);
    };

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
                    <>
                        <div
                            ref={sliderRef}
                            onScroll={handleSliderScroll}
                            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {products.map((product, index) => (
                                <article
                                    key={product.id}
                                    className="min-w-0 shrink-0 basis-full snap-center overflow-hidden rounded-2xl border border-slate-200 shadow-md transition-all duration-300"
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
                                                className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
                                                style={{ backgroundColor: colors.accentColor }}
                                            >
                                                {product.badgeText}
                                            </span>
                                        ) : null}
                                    </button>

                                    <div className="flex flex-col gap-2.5 p-3">
                                        {product.stockStatus ? (
                                            <span
                                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${product.stockStatus.bg} ${product.stockStatus.tone}`}
                                            >
                                                {product.stockStatus.label}
                                            </span>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => onOpenProduct?.(product)}
                                            className="text-left text-base font-bold leading-tight"
                                            style={{ color: colors.titleColor }}
                                        >
                                            {product.name}
                                        </button>
                                        {product.shortDescription ? (
                                            <p className="line-clamp-2 text-xs leading-5" style={{ color: colors.subtitleColor }}>
                                                {product.shortDescription}
                                            </p>
                                        ) : null}
                                        {showPricesEnabled ? (
                                            canViewPrices ? (
                                                <p className="text-xl font-black" style={{ color: colors.priceColor }}>
                                                    {product.displayPrice}
                                                </p>
                                            ) : authLoading ? (
                                                <p className="text-xs font-medium text-[#8a7560]">Cargando precio...</p>
                                            ) : (
                                                <PriceAccessPrompt compact />
                                            )
                                        ) : (
                                            <p className="text-xs font-medium text-[#8a7560]">Consultar precio</p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onAddToCart?.(product)}
                                            disabled={!product.inStock}
                                            className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-black uppercase tracking-[0.06em] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                            style={{
                                                backgroundColor: colors.buttonBackgroundColor,
                                                color: colors.buttonTextColor,
                                            }}
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1 6h12M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                                            </svg>
                                            {product.inStock ? 'Agregar' : 'Sin stock'}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {isMobile && products.length > 1 ? (
                            <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
                                <button
                                    type="button"
                                    onClick={() => goToSlide(activeIndex - 1)}
                                    className="h-8 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                                >
                                    Anterior
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {products.map((_, index) => (
                                        <button
                                            key={`dot-${index}`}
                                            type="button"
                                            onClick={() => goToSlide(index)}
                                            className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? 'bg-slate-900' : 'bg-slate-300'}`}
                                            aria-label={`Ir al producto ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => goToSlide(activeIndex + 1)}
                                    className="h-8 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                                >
                                    Siguiente
                                </button>
                            </div>
                        ) : null}

                        <div className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-2 lg:grid-cols-4">
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
                    </>
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-[#e5e1de] p-8 text-center text-[#8a7560]">
                        No encontramos productos para mostrar.
                    </div>
                )}
            </div>
        </section>
    );
}
