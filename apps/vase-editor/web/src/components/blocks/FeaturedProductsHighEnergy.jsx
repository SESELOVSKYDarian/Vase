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
    const themeColors = useStorefrontThemeColors();
    const colors = normalizeFeaturedStyles('high_energy', styles, themeColors);
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
        if (activeIndex > products.length - 1) setActiveIndex(0);
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
                    <>
                    <div
                        ref={sliderRef}
                        onScroll={handleSliderScroll}
                        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {products.map((product) => (
                            <article
                                key={`mob-${product.id}`}
                                className="min-w-0 shrink-0 basis-full snap-center overflow-hidden rounded-3xl border border-slate-200 shadow-xl"
                                style={{ backgroundColor: colors.cardBackgroundColor }}
                            >
                                <div className="relative aspect-square overflow-hidden">
                                    <button type="button" onClick={() => onOpenProduct?.(product)} className="h-full w-full">
                                        <img src={product.image} alt={product.alt} className="h-full w-full object-cover" />
                                    </button>
                                    <span
                                        className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white"
                                        style={{ backgroundColor: colors.saleBadgeColor }}
                                    >
                                        Oferta
                                    </span>
                                </div>

                                <div className="space-y-3 p-4 text-left">
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

                                    <div className="flex items-end justify-between gap-3">
                                        <div className="min-w-0">
                                            {showPricesEnabled ? (
                                                canViewPrices ? (
                                                    <p className="text-2xl font-black" style={{ color: colors.priceColor }}>
                                                        {product.displayPrice}
                                                    </p>
                                                ) : authLoading ? (
                                                    <p className="text-sm font-medium text-[#8a7560]">Cargando...</p>
                                                ) : (
                                                    <PriceAccessPrompt compact />
                                                )
                                            ) : (
                                                <p className="text-sm font-medium text-[#8a7560]">Consultar</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onAddToCart?.(product)}
                                        disabled={!product.inStock}
                                        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black uppercase tracking-[0.08em]"
                                        style={{
                                            backgroundColor: colors.buttonBackgroundColor,
                                            color: colors.buttonTextColor,
                                        }}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1 6h12M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                                        </svg>
                                        {product.inStock ? 'Agregar' : 'Sin stock'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>

                    {isMobile && products.length > 1 ? (
                        <div className="mt-4 flex items-center justify-center gap-2 md:hidden">
                            <button
                                type="button"
                                onClick={() => goToSlide(activeIndex - 1)}
                                className="h-8 rounded-full border px-3 text-xs font-semibold"
                                style={{ borderColor: '#e2e8f0', color: colors.titleColor }}
                            >
                                Anterior
                            </button>
                            <div className="flex items-center gap-1.5">
                                {products.map((_, index) => (
                                    <button
                                        key={`dot-${index}`}
                                        type="button"
                                        onClick={() => goToSlide(index)}
                                        className="h-2.5 w-2.5 rounded-full transition"
                                        style={{ backgroundColor: index === activeIndex ? colors.accentColor : '#cbd5e1' }}
                                        aria-label={`Ir al producto ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => goToSlide(activeIndex + 1)}
                                className="h-8 rounded-full border px-3 text-xs font-semibold"
                                style={{ borderColor: '#e2e8f0', color: colors.titleColor }}
                            >
                                Siguiente
                            </button>
                        </div>
                    ) : null}

                    <div className="hidden grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4 md:grid">
                        {products.map((product) => (
                            <article key={product.id} className="group flex flex-col rounded-xl overflow-hidden bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] hover:-translate-y-1">
                                <button
                                    type="button"
                                    onClick={() => onOpenProduct?.(product)}
                                    className="relative aspect-square overflow-hidden bg-gray-50"
                                >
                                    <img src={product.image} alt={product.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    {product.badgeText ? (
                                        <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                                            {product.badgeText}
                                        </div>
                                    ) : null}
                                </button>

                                <div className="flex flex-1 flex-col p-5">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                            {product.brand || 'High Energy'}
                                        </span>
                                        {product.stockStatus ? (
                                            <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${product.stockStatus.bg} ${product.stockStatus.tone}`}>
                                                {product.stockStatus.label}
                                            </span>
                                        ) : null}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onOpenProduct?.(product)}
                                        className="text-left text-lg font-bold leading-tight line-clamp-2 mb-2 transition-colors"
                                        style={{ color: colors.titleColor }}
                                    >
                                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-[length:0px_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 hover:bg-[length:100%_2px]">
                                            {product.name}
                                        </span>
                                    </button>

                                    {product.shortDescription ? (
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                            {product.shortDescription}
                                        </p>
                                    ) : null}

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            {showPricesEnabled ? (
                                                canViewPrices ? (
                                                    <p className="text-xl font-black tracking-tight" style={{ color: colors.priceColor }}>
                                                        {product.displayPrice}
                                                    </p>
                                                ) : authLoading ? (
                                                    <p className="text-xs font-semibold text-gray-400">Cargando...</p>
                                                ) : (
                                                    <div className="-ml-2 scale-90 origin-left">
                                                        <PriceAccessPrompt compact />
                                                    </div>
                                                )
                                            ) : (
                                                <p className="text-xs font-semibold text-gray-400">Consultar</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onAddToCart?.(product)}
                                            disabled={!product.inStock}
                                            className="h-10 w-10 flex items-center justify-center rounded-full text-white transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                                            style={{ backgroundColor: colors.accentColor }}
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
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
