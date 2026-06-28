import React, { useEffect, useState } from "react";
import { navigate } from "../../utils/navigation";
import { useStorefrontThemeColors } from "../../context/ThemeContext";
import { normalizeHeroStyles } from "../../data/heroSliderTemplates";

export default function HeroModernistSlider({ slides = [], styles: rawStyles = {}, editor = null }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const themeColors = useStorefrontThemeColors();
    const styles = normalizeHeroStyles('modernist', rawStyles, themeColors);

    useEffect(() => {
        if (!slides.length || slides.length < 2 || editor?.enabled) return;
        const interval = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => window.clearInterval(interval);
    }, [slides.length, editor?.enabled]);

    const slide = slides[activeIndex] || slides[0] || {};
    const {
        label,
        title,
        description,
        image,
        primaryButtonLabel,
        primaryButtonLink,
        secondaryButtonLabel,
        secondaryButtonLink,
        featured // We'll use this for the "Free Shipping" part if exists
    } = slide;

    const {
        titleColor = "#000000",
        textColor = "#444748",
        labelColor = "#1c1b1b",
        primaryButtonBgColor = "#000000",
        primaryButtonTextColor = "#ffffff",
        secondaryButtonBgColor = "transparent",
        secondaryButtonTextColor = "#000000",
        secondaryButtonBorderColor = "#000000",
        overlayColor = "rgba(0,0,0,0.2)",
    } = styles;

    const goToSlide = (index) => {
        if (!slides.length) return;
        const safeIndex = ((index % slides.length) + slides.length) % slides.length;
        setActiveIndex(safeIndex);
    };

    return (
        <section className="px-2 py-4 md:px-10 md:py-8">
            <div className="mx-auto max-w-[1408px]">
                <div className="relative h-[60vh] md:h-[70vh] min-h-[500px] w-full overflow-hidden rounded-xl md:rounded-2xl bg-zinc-100 font-['Inter'] shadow-sm">
                    {/* Background Slides */}
                    <div className="absolute inset-0">
                        {slides.map((s, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-1000 ${index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                            >
                                <img
                                    src={s.image}
                                    alt={s.title || "Slider Image"}
                                    className="w-full h-full object-cover transition-transform ease-out"
                                    style={{
                                        transform: index === activeIndex ? 'scale(1)' : 'scale(1.1)',
                                        transitionDuration: '10000ms'
                                    }}
                                />
                                <div
                                    className="absolute inset-0"
                                    style={{ background: `linear-gradient(90deg, ${overlayColor} 0%, transparent 100%)` }}
                                ></div>
                            </div>
                        ))}
                    </div>

                    {/* Content Container */}
                    <div className="relative z-20 h-full w-full px-6 md:px-16 flex items-center">
                        <div
                            className="max-w-2xl bg-white/70 backdrop-blur-xl p-8 md:p-14 border border-white/20 shadow-2xl animate-in fade-in slide-in-from-left-8 duration-700"
                            key={`content-${activeIndex}`}
                        >
                            {label && (
                                <span
                                    className="text-[12px] font-bold uppercase tracking-[0.2em] mb-4 block"
                                    style={{ color: labelColor }}
                                >
                                    {label}
                                </span>
                            )}

                            {title && (
                                <h1
                                    className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] font-extrabold tracking-tighter mb-6 font-['Manrope']"
                                    style={{ color: titleColor }}
                                    dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br/>') }}
                                />
                            )}

                            {description && (
                                <p
                                    className="text-base md:text-lg max-w-lg mb-8 leading-relaxed opacity-90"
                                    style={{ color: textColor }}
                                >
                                    {description}
                                </p>
                            )}

                            {/* Price / Info row */}
                            <div className="flex items-center gap-6 mb-10">
                                <span className="text-xl md:text-2xl font-bold font-['Manrope']" style={{ color: titleColor }}>
                                    {slide.subtitle || "$2,850.00"}
                                </span>
                                <div className="h-4 w-px bg-zinc-300"></div>
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                                    {featured || "Free Worldwide Shipping"}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {primaryButtonLabel && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(primaryButtonLink || '/catalog')}
                                        className="px-8 md:px-10 py-3 md:py-4 rounded text-sm font-bold tracking-widest uppercase transition-all active:scale-95 hover:opacity-90"
                                        style={{ backgroundColor: primaryButtonBgColor, color: primaryButtonTextColor }}
                                    >
                                        {primaryButtonLabel}
                                    </button>
                                )}

                                {secondaryButtonLabel && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(secondaryButtonLink || '/about')}
                                        className="border px-8 md:px-10 py-3 md:py-4 rounded text-sm font-bold tracking-widest uppercase transition-all active:scale-95 hover:bg-black hover:text-white"
                                        style={{
                                            backgroundColor: secondaryButtonBgColor,
                                            color: secondaryButtonTextColor,
                                            borderColor: secondaryButtonBorderColor
                                        }}
                                    >
                                        {secondaryButtonLabel}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 z-30 pointer-events-none hidden md:flex">
                        <button
                            onClick={() => goToSlide(activeIndex - 1)}
                            className="pointer-events-auto h-12 w-12 rounded-full border border-zinc-200/50 bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-white hover:border-zinc-300 transition-all active:scale-90"
                        >
                            <svg className="size-6 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <button
                            onClick={() => goToSlide(activeIndex + 1)}
                            className="pointer-events-auto h-12 w-12 rounded-full border border-zinc-200/50 bg-white/40 backdrop-blur-md flex items-center justify-center hover:bg-white hover:border-zinc-300 transition-all active:scale-90"
                        >
                            <svg className="size-6 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    </div>

                    {/* Dash Indicators */}
                    <div className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 z-30">
                        {slides.map((_, idx) => (
                            <button
                                key={`dash-${idx}`}
                                onClick={() => goToSlide(idx)}
                                className={`h-0.5 w-12 md:w-16 transition-all duration-300 ${idx === activeIndex ? "bg-black" : "bg-zinc-400/30 hover:bg-zinc-400/60"}`}
                                aria-label={`Slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
