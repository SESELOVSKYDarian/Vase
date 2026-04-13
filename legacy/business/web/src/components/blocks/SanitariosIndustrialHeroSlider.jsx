import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { navigate } from '../../utils/navigation';
import { normalizeHeroStyles } from '../../data/heroSliderTemplates';

const DEFAULT_SLIDES = [
    {
        label: 'Industrial Series',
        title: 'DUCHA',
        subtitle: 'PREMIUM',
        description: 'Precision tecnica y durabilidad extrema en cada componente.',
        featured: 'Sanitarios El Teflon',
        cardEyebrow: 'Master Dealer',
        cardTitle: 'Sanitarios El Teflon',
        specLabel: 'Spec: Chrome_04 // 2024',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCtrx3pTyYlPgB-m5Qu8uUwctQeJRkUAX5nF4uBy2EZwom64tlIa_jjJvKQZoFhDcseM0gZGo98GRYEGNf2hmNgD_EbPbEoOxG5vWrWAiXYIIWF2p48XGa626y2T8Xfxt5AK9C4upAWDExfCK11CrcPsFqDSnlQ5hTkj0bxFygNWYkKXfJXjpiX4QTnbkzXxUTP1V14BbbMtMm6kle200TQd25KHbu1zdec36SSAutjvA0O9VIiku54n_VWSvD0qL0kXDAiOZKDahg',
        primaryButtonLabel: 'SHOP NOW',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: '',
        secondaryButtonLink: '',
    },
];

const isExternalUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const openLink = (value) => {
    if (!value) return;
    if (isExternalUrl(value)) {
        window.open(value, '_blank', 'noopener,noreferrer');
        return;
    }
    navigate(value);
};

const withAlpha = (hexColor, alpha = 1) => {
    if (typeof hexColor !== 'string') return `rgba(255,255,255,${alpha})`;
    const clean = hexColor.trim();
    const match = clean.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!match) return `rgba(255,255,255,${alpha})`;
    const raw = match[1];
    const hex = raw.length === 3
        ? raw.split('').map((char) => `${char}${char}`).join('')
        : raw;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const cleanSlides = (slides) => {
    const source = Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_SLIDES;
    return source.map((slide, index) => ({
        id: slide?.id || `sanitarios-industrial-${index}`,
        label: slide?.label || '',
        title: slide?.title || '',
        subtitle: slide?.subtitle || '',
        description: slide?.description || '',
        featured: slide?.featured || '',
        cardEyebrow: slide?.cardEyebrow || '',
        cardTitle: slide?.cardTitle || '',
        specLabel: slide?.specLabel || '',
        image: slide?.image || DEFAULT_SLIDES[0].image,
        primaryButtonLabel: slide?.primaryButtonLabel || 'SHOP NOW',
        primaryButtonLink: slide?.primaryButtonLink || '/catalog',
        secondaryButtonLabel: slide?.secondaryButtonLabel || '',
        secondaryButtonLink: slide?.secondaryButtonLink || '',
    }));
};

const TRANSITION_OUT_MS = 240;
const TRANSITION_IN_MS = 560;
const MOTION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export default function SanitariosIndustrialHeroSlider({ slides = [], styles = {} }) {
    const normalizedSlides = useMemo(() => cleanSlides(slides), [slides]);
    const colors = useMemo(() => normalizeHeroStyles('sanitarios_industrial', styles), [styles]);
    const [current, setCurrent] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [direction, setDirection] = useState('next');
    const [contentVisible, setContentVisible] = useState(true);
    const [animating, setAnimating] = useState(false);
    const total = normalizedSlides.length;

    useEffect(() => {
        if (current >= total) {
            setCurrent(0);
        }
    }, [current, total]);

    const goTo = useCallback((index, nextDirection = 'next') => {
        if (total <= 1 || animating || index === current) return;
        setDirection(nextDirection);
        setAnimating(true);
        setContentVisible(false);

        setTimeout(() => {
            setCurrent(index);
            setHovered(false);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setContentVisible(true);
                    setTimeout(() => {
                        setAnimating(false);
                    }, TRANSITION_IN_MS);
                });
            });
        }, TRANSITION_OUT_MS);
    }, [animating, current, total]);

    const goPrev = useCallback(() => {
        goTo((current - 1 + total) % total, 'prev');
    }, [current, goTo, total]);

    const goNext = useCallback(() => {
        goTo((current + 1) % total, 'next');
    }, [current, goTo, total]);

    useEffect(() => {
        if (total <= 1) return undefined;
        const timer = setInterval(goNext, 6200);
        return () => clearInterval(timer);
    }, [goNext, total]);

    const slide = normalizedSlides[current] || normalizedSlides[0];
    const headingLines = [
        slide.title || 'DUCHA',
        slide.subtitle || 'PREMIUM',
    ].filter(Boolean);
    const cardEyebrow = slide.cardEyebrow || 'Master Dealer';
    const cardTitle = slide.cardTitle || slide.featured || 'Sanitarios El Teflon';
    const specLabel = slide.specLabel || slide.secondaryButtonLabel || 'Spec: Chrome_04 // 2024';
    const cardDescription = slide.description || 'Precision tecnica y durabilidad extrema en cada componente.';
    const motionSign = direction === 'next' ? 1 : -1;
    const stageTransition = `all ${contentVisible ? TRANSITION_IN_MS : TRANSITION_OUT_MS}ms ${MOTION_EASE}`;
    const panelOffsetX = contentVisible ? 0 : -34 * motionSign;
    const panelOpacity = contentVisible ? 1 : 0;
    const imageOffsetX = contentVisible ? 0 : 38 * motionSign;
    const imageOffsetY = contentVisible ? 0 : 12;
    const imageOpacity = contentVisible ? 1 : 0;
    const imageScale = contentVisible ? (hovered ? 1.05 : 1) : 0.93;
    const cardOffsetX = contentVisible ? 0 : 26 * motionSign;
    const cardOffsetY = contentVisible ? 0 : 18;
    const cardOpacity = contentVisible ? 1 : 0;
    const ornamentOpacity = contentVisible ? 1 : 0;
    const ornamentOffsetY = contentVisible ? 0 : -10;

    return (
        <section className="px-4 py-8 md:px-10">
            <div className="mx-auto w-full max-w-[1408px]">
                <div
                    className="relative isolate overflow-hidden rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]"
                    style={{ minHeight: 'clamp(420px,52vw,720px)' }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: colors.backgroundColor,
                            backgroundImage: [
                                `linear-gradient(0deg, transparent 24%, ${withAlpha(colors.gridLineColor, 0.14)} 25%, ${withAlpha(colors.gridLineColor, 0.14)} 26%, transparent 27%, transparent 74%, ${withAlpha(colors.gridLineColor, 0.14)} 75%, ${withAlpha(colors.gridLineColor, 0.14)} 76%, transparent 77%, transparent)`,
                                `linear-gradient(90deg, transparent 24%, ${withAlpha(colors.gridLineColor, 0.14)} 25%, ${withAlpha(colors.gridLineColor, 0.14)} 26%, transparent 27%, transparent 74%, ${withAlpha(colors.gridLineColor, 0.14)} 75%, ${withAlpha(colors.gridLineColor, 0.14)} 76%, transparent 77%, transparent)`,
                            ].join(','),
                            backgroundSize: '50px 50px',
                        }}
                    />

                    <div
                        className="absolute inset-0 z-10"
                        style={{
                            backgroundColor: colors.leftPanelColor,
                            clipPath: 'polygon(0 0, 66% 0, 35% 100%, 0 100%)',
                            opacity: panelOpacity,
                            transform: `translateX(${panelOffsetX}px)`,
                            transition: stageTransition,
                        }}
                    >
                        <div className="flex h-full flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
                            {slide.label ? (
                                <span className="mb-4 text-xs font-black uppercase tracking-[0.3em]" style={{ color: colors.labelColor }}>
                                    {slide.label}
                                </span>
                            ) : null}
                            <h1 className="font-black uppercase tracking-[-0.05em] leading-[0.84]" style={{ color: colors.titleColor, fontSize: 'clamp(3.2rem,10vw,10rem)' }}>
                                {headingLines.map((line, lineIndex) => (
                                    <span key={`${line}-${lineIndex}`} className="block">
                                        {line}
                                    </span>
                                ))}
                            </h1>
                        </div>
                    </div>

                    <div
                        className="absolute left-[54%] top-1/2 z-30 w-[36%] min-w-[180px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-700"
                        style={{
                            transform: `translate(calc(-45% + ${imageOffsetX}px), calc(-50% + ${imageOffsetY}px)) scale(${imageScale})`,
                            opacity: imageOpacity,
                            transition: stageTransition,
                        }}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        <img
                            src={slide.image}
                            alt={slide.title || 'Producto destacado'}
                            className="h-auto w-full"
                            style={{ filter: 'drop-shadow(40px 40px 60px rgba(0,0,0,0.45))' }}
                        />
                    </div>

                    <div
                        className="absolute bottom-5 right-5 z-40 flex w-[min(100%-2.5rem,440px)] flex-col gap-6 rounded-2xl p-6 sm:bottom-8 sm:right-8 sm:p-8"
                        style={{
                            background: withAlpha(colors.cardBgColor, 0.14),
                            border: `1px solid ${withAlpha(colors.cardBorderColor, 0.45)}`,
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: '0 22px 40px -20px rgba(0,0,0,0.55)',
                            opacity: cardOpacity,
                            transform: `translate(${cardOffsetX}px, ${cardOffsetY}px)`,
                            transition: stageTransition,
                        }}
                    >
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: withAlpha(colors.cardSubtitleColor, 0.92) }}>
                                {cardEyebrow}
                            </h3>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: colors.cardTitleColor }}>
                                {cardTitle}
                            </h2>
                        </div>

                        <div className="h-px w-full" style={{ backgroundColor: withAlpha(colors.cardBorderColor, 0.32) }} />

                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="max-w-[240px] text-sm leading-relaxed" style={{ color: withAlpha(colors.textColor, 0.92) }}>
                                {cardDescription}
                            </p>
                            {slide.primaryButtonLabel ? (
                                <button
                                    type="button"
                                    onClick={() => openLink(slide.primaryButtonLink)}
                                    className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black transition-all duration-300 hover:opacity-95"
                                    style={{
                                        backgroundColor: colors.primaryButtonBgColor,
                                        color: colors.primaryButtonTextColor,
                                    }}
                                >
                                    <span>{slide.primaryButtonLabel}</span>
                                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </span>
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div
                        className="absolute left-8 top-8 z-20 flex gap-2"
                        style={{
                            opacity: ornamentOpacity,
                            transform: `translateY(${ornamentOffsetY}px)`,
                            transition: stageTransition,
                        }}
                    >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.dotActiveColor }} />
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: withAlpha(colors.dotInactiveColor, 0.55) }} />
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: withAlpha(colors.dotInactiveColor, 0.55) }} />
                    </div>

                    <div
                        className="absolute right-8 top-8 z-20"
                        style={{
                            opacity: ornamentOpacity,
                            transform: `translateY(${ornamentOffsetY}px)`,
                            transition: stageTransition,
                        }}
                    >
                        <span className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: withAlpha(colors.specColor, 0.6) }}>
                            {specLabel}
                        </span>
                    </div>

                    {total > 1 ? (
                        <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 backdrop-blur-md">
                            <button
                                type="button"
                                onClick={goPrev}
                                className="rounded-full p-1 text-white/90 transition hover:bg-white/15"
                                aria-label="Slide anterior"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-1.5 px-1">
                                {normalizedSlides.map((item, index) => (
                                    <button
                                        key={item.id || index}
                                        type="button"
                                        onClick={() => goTo(index, index > current ? 'next' : 'prev')}
                                        className="h-1.5 rounded-full transition-all duration-300"
                                        style={{
                                            width: index === current ? 18 : 7,
                                            backgroundColor: index === current
                                                ? colors.dotActiveColor
                                                : withAlpha(colors.dotInactiveColor, 0.78),
                                        }}
                                        aria-label={`Ir al slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={goNext}
                                className="rounded-full p-1 text-white/90 transition hover:bg-white/15"
                                aria-label="Siguiente slide"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
