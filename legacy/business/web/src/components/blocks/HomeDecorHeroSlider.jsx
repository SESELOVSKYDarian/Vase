import React, { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../utils/navigation';
import { normalizeHeroStyles } from '../../data/heroSliderTemplates';

const DEFAULT_SLIDES = [
    {
        label: 'Nueva temporada',
        title: 'Comfort Meets Style',
        subtitle: '',
        description: 'Crea espacios unicos con piezas modernas y materiales de alta calidad.',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCVhvkYBdnOleG-Z-XnXwCSL6_l6oepFXgffpD5_uB8OujfUbm1XfEPH6pcjis5D6WDJfzQwQg6rUkq1Dj-_3fi51AMaY-luZCbHLPzWWzUsZZ1Nn8OurbMfYfUB2h5QytLEcXWMTWSXsPjXUYCOouHe9ok_RfWcVdDg-bIOypIq7Engm4Gi5ya_eZrIwi013yjjNHNGZPlsDZUzYwVkXtNJZcYuukpk4tQnQA7Rrvj4jEOIkRzjs7bsnpbDpRovQYmhDjr-TyaCik',
        primaryButtonLabel: 'Ver coleccion',
        primaryButtonLink: '/catalog',
        secondaryButtonLabel: 'Explorar',
        secondaryButtonLink: '/catalog',
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

const cleanSlides = (slides) => {
    const source = Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_SLIDES;
    return source.map((slide, index) => ({
        id: slide?.id || `decor-${index}`,
        label: slide?.label || '',
        title: slide?.title || '',
        subtitle: slide?.subtitle || '',
        description: slide?.description || '',
        image: slide?.image || DEFAULT_SLIDES[0].image,
        primaryButtonLabel: slide?.primaryButtonLabel || 'Ver coleccion',
        primaryButtonLink: slide?.primaryButtonLink || '/catalog',
        secondaryButtonLabel: slide?.secondaryButtonLabel || '',
        secondaryButtonLink: slide?.secondaryButtonLink || '',
    }));
};

export default function HomeDecorHeroSlider({ slides = [], styles = {} }) {
    const normalizedSlides = useMemo(() => cleanSlides(slides), [slides]);
    const colors = useMemo(() => normalizeHeroStyles('home_decor', styles), [styles]);
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);
    const total = normalizedSlides.length;

    useEffect(() => {
        if (current >= total) {
            setCurrent(0);
        }
    }, [current, total]);

    const goTo = (index) => {
        if (animating || total <= 1 || index === current) return;
        setAnimating(true);
        setTimeout(() => {
            setCurrent(index);
            setAnimating(false);
        }, 380);
    };

    const prev = () => goTo((current - 1 + total) % total);
    const next = () => goTo((current + 1) % total);

    useEffect(() => {
        if (total <= 1) return undefined;
        const timer = setInterval(next, 5400);
        return () => clearInterval(timer);
    }, [current, total]);

    const slide = normalizedSlides[current] || normalizedSlides[0];

    return (
        <section className="px-4 py-8 md:px-10">
            <div className="mx-auto max-w-[1408px] overflow-hidden rounded-xl shadow-[0_25px_60px_-28px_rgba(0,0,0,0.45)]" style={{ backgroundColor: colors.backgroundColor }}>
                <div className="relative grid min-h-[560px] grid-cols-1 lg:min-h-[620px] lg:grid-cols-12">
                    <div className="relative z-20 flex flex-col justify-center px-8 py-10 lg:col-span-5 lg:px-14">
                        <div
                            className="space-y-5 transition-all duration-500"
                            style={{
                                opacity: animating ? 0 : 1,
                                transform: animating ? 'translateY(10px)' : 'translateY(0px)',
                            }}
                        >
                            {slide.label ? (
                                <span className="inline-block text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: colors.labelColor }}>
                                    {slide.label}
                                </span>
                            ) : null}
                            <h1 className="text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl lg:text-6xl" style={{ color: colors.titleColor }}>
                                {slide.title || 'Coleccion'}
                                {slide.subtitle ? <><br />{slide.subtitle}</> : null}
                            </h1>
                            {slide.description ? (
                                <p className="max-w-md text-base leading-relaxed md:text-lg" style={{ color: colors.textColor }}>
                                    {slide.description}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {slide.primaryButtonLabel ? (
                                <button
                                    type="button"
                                    onClick={() => openLink(slide.primaryButtonLink)}
                                    className="h-12 rounded-lg px-7 text-sm font-bold shadow-lg transition hover:scale-[1.02]"
                                    style={{
                                        backgroundColor: colors.primaryButtonBgColor,
                                        color: colors.primaryButtonTextColor,
                                        boxShadow: `0 12px 24px -12px ${colors.primaryButtonBgColor}`,
                                    }}
                                >
                                    {slide.primaryButtonLabel}
                                </button>
                            ) : null}
                            {slide.secondaryButtonLabel ? (
                                <button
                                    type="button"
                                    onClick={() => openLink(slide.secondaryButtonLink)}
                                    className="h-12 rounded-lg border-2 px-6 text-sm font-bold transition hover:opacity-90"
                                    style={{
                                        backgroundColor: colors.secondaryButtonBgColor,
                                        color: colors.secondaryButtonTextColor,
                                        borderColor: colors.secondaryButtonBorderColor,
                                    }}
                                >
                                    {slide.secondaryButtonLabel}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="relative min-h-[360px] overflow-hidden lg:col-span-7">
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                            style={{
                                backgroundImage: `url("${slide.image}")`,
                                opacity: animating ? 0.55 : 1,
                                transform: animating ? 'scale(1.04)' : 'scale(1)',
                            }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(to right, ${colors.backgroundColor} 0%, ${colors.backgroundColor}99 45%, transparent 100%)`,
                            }}
                        />
                    </div>

                    {total > 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={prev}
                                className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90"
                                style={{ backgroundColor: `${colors.backgroundColor}e6`, color: colors.titleColor }}
                                aria-label="Slide anterior"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition hover:opacity-90"
                                style={{ backgroundColor: `${colors.backgroundColor}e6`, color: colors.titleColor }}
                                aria-label="Siguiente slide"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </button>
                            <div className="absolute bottom-5 left-[28%] z-30 flex -translate-x-1/2 items-center gap-2 md:left-[24%]">
                                {normalizedSlides.map((item, index) => (
                                    <button
                                        key={item.id || index}
                                        type="button"
                                        onClick={() => goTo(index)}
                                        className="h-1 rounded-full transition-all duration-300"
                                        style={{
                                            width: index === current ? 46 : 28,
                                            backgroundColor: index === current ? colors.accentColor : `${colors.accentColor}44`,
                                        }}
                                        aria-label={`Ir al slide ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
