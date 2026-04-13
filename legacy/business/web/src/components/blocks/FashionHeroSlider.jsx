import React, { useEffect, useMemo, useState } from 'react';
import { navigate } from '../../utils/navigation';
import { normalizeHeroStyles } from '../../data/heroSliderTemplates';

const DEFAULT_SLIDES = [
    {
        label: 'Disponible ahora',
        title: 'Coleccion Minimalista',
        subtitle: 'Nueva temporada',
        description: 'Experiencia premium con diseno atemporal.',
        featured: 'Producto destacado',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCEP3rkEsdrZYUu5E5Gm0UsbfEeygONnqMt5DbDwg_0YaOauB2Bhr5sYDe87Jlc28eFAMWSHp1_QR6mIDVmDGBkNOB-Z_i60M0RDGRig6r9cg8O-63_q4fKm_bt4Z7U7VnkdPBBscIkUnT8DwkPCH73Nxz-olpjyveC_vMAX2t2i0uwJ1jSdGw5qdIBlry0GSZ_v4Kyho_iC-c038tLVz7uw2zTn-zFuIgVqO8v-vJRB9yKqJQkuFZqLcsTfAKZFedY0LGqOMfmB9g',
        primaryButtonLabel: 'Comprar ahora',
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

const cleanSlides = (slides) => {
    const source = Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_SLIDES;
    return source.map((slide, index) => ({
        id: slide?.id || `fashion-${index}`,
        label: slide?.label || '',
        title: slide?.title || '',
        subtitle: slide?.subtitle || '',
        description: slide?.description || '',
        featured: slide?.featured || '',
        image: slide?.image || DEFAULT_SLIDES[0].image,
        primaryButtonLabel: slide?.primaryButtonLabel || 'Comprar ahora',
        primaryButtonLink: slide?.primaryButtonLink || '/catalog',
        secondaryButtonLabel: slide?.secondaryButtonLabel || '',
        secondaryButtonLink: slide?.secondaryButtonLink || '',
    }));
};

export default function FashionHeroSlider({ slides = [], styles = {} }) {
    const normalizedSlides = useMemo(() => cleanSlides(slides), [slides]);
    const colors = useMemo(() => normalizeHeroStyles('fashion', styles), [styles]);
    const [current, setCurrent] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [direction, setDirection] = useState('next');
    const total = normalizedSlides.length;

    useEffect(() => {
        if (current >= total) {
            setCurrent(0);
        }
    }, [current, total]);

    const goTo = (index, nextDirection = 'next') => {
        if (animating || total <= 1) return;
        setDirection(nextDirection);
        setAnimating(true);
        setTimeout(() => {
            setCurrent(index);
            setAnimating(false);
        }, 420);
    };

    const prev = () => goTo((current - 1 + total) % total, 'prev');
    const next = () => goTo((current + 1) % total, 'next');

    useEffect(() => {
        if (total <= 1) return undefined;
        const timer = setInterval(next, 5200);
        return () => clearInterval(timer);
    }, [current, total]);

    const slide = normalizedSlides[current] || normalizedSlides[0];
    const textTransition = animating
        ? direction === 'next'
            ? 'opacity-0 translate-x-4'
            : 'opacity-0 -translate-x-4'
        : 'opacity-100 translate-x-0';

    return (
        <section className="px-4 py-8 md:px-10">
            <div className="mx-auto max-w-[1408px] overflow-hidden rounded-xl" style={{ backgroundColor: colors.backgroundColor }}>
                <div className="relative min-h-[560px] lg:min-h-[620px]">
                    <div className="grid min-h-[560px] grid-cols-1 lg:min-h-[620px] lg:grid-cols-12">
                        <div className="z-10 flex flex-col justify-center gap-8 px-8 py-10 transition-all duration-500 lg:col-span-5 lg:px-14">
                            <div className={`space-y-5 transition-all duration-400 ${textTransition}`}>
                                {slide.label ? (
                                    <span className="inline-block text-[10px] font-black uppercase tracking-[0.42em]" style={{ color: colors.labelColor }}>
                                        {slide.label}
                                    </span>
                                ) : null}
                                <h1 className="text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] md:text-6xl lg:text-7xl" style={{ color: colors.titleColor }}>
                                    {slide.title || 'Coleccion'}
                                    {slide.subtitle ? <><br />{slide.subtitle}</> : null}
                                </h1>
                                {slide.description ? (
                                    <p className="max-w-md text-base leading-relaxed md:text-lg" style={{ color: colors.textColor }}>
                                        {slide.description}
                                    </p>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {slide.primaryButtonLabel ? (
                                    <button
                                        type="button"
                                        onClick={() => openLink(slide.primaryButtonLink)}
                                        className="h-12 rounded-none px-7 text-[11px] font-black uppercase tracking-[0.24em] transition hover:opacity-90"
                                        style={{
                                            backgroundColor: colors.primaryButtonBgColor,
                                            color: colors.primaryButtonTextColor,
                                        }}
                                    >
                                        {slide.primaryButtonLabel}
                                    </button>
                                ) : null}
                                {slide.secondaryButtonLabel ? (
                                    <button
                                        type="button"
                                        onClick={() => openLink(slide.secondaryButtonLink)}
                                        className="h-12 border px-6 text-[11px] font-black uppercase tracking-[0.22em] transition hover:opacity-90"
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

                            <div className="mt-3 flex items-center gap-4">
                                <span className="text-[10px] font-black tracking-[0.24em]" style={{ color: colors.accentColor }}>
                                    {String(current + 1).padStart(2, '0')}
                                </span>
                                <div className="h-px w-24" style={{ backgroundColor: `${colors.accentColor}33` }}>
                                    <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                            backgroundColor: colors.accentColor,
                                            width: `${((current + 1) / total) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] font-black tracking-[0.24em]" style={{ color: `${colors.accentColor}77` }}>
                                    {String(total).padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        <div className="relative min-h-[380px] overflow-hidden lg:col-span-7">
                            <img
                                key={slide.id}
                                src={slide.image}
                                alt={slide.title || 'Slide'}
                                className={`h-full w-full object-cover transition-all duration-700 ${animating ? 'scale-105 opacity-75' : 'scale-100 opacity-100'}`}
                            />
                            {slide.featured ? (
                                <div className="absolute bottom-0 right-0 hidden max-w-xs bg-white/95 p-5 text-right shadow-2xl md:block">
                                    <p className="text-[10px] font-black uppercase tracking-[0.32em]" style={{ color: `${colors.accentColor}99` }}>
                                        Destacado
                                    </p>
                                    <p className="mt-2 text-sm font-semibold italic" style={{ color: colors.titleColor }}>{slide.featured}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {total > 1 ? (
                        <>
                            <div className="absolute bottom-6 right-6 z-20 flex border border-black/10 bg-white/90 shadow-xl">
                                <button
                                    type="button"
                                    onClick={prev}
                                    className="p-4 transition hover:opacity-90"
                                    style={{ color: colors.titleColor }}
                                    aria-label="Slide anterior"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={next}
                                    className="border-l p-4 transition hover:opacity-90"
                                    style={{ color: colors.titleColor, borderColor: `${colors.titleColor}22` }}
                                    aria-label="Siguiente slide"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>

                            <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
                                {normalizedSlides.map((item, index) => (
                                    <button
                                        key={item.id || index}
                                        type="button"
                                        onClick={() => goTo(index, index >= current ? 'next' : 'prev')}
                                        className="h-[3px] transition-all duration-300"
                                        style={{
                                            width: index === current ? 34 : 12,
                                            backgroundColor: index === current ? colors.accentColor : `${colors.accentColor}55`,
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
