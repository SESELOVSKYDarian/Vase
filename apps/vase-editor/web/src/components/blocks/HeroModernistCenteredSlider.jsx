import React, { useEffect, useState } from "react";
import { navigate } from "../../utils/navigation";
import { useStorefrontThemeColors } from "../../context/ThemeContext";
import { normalizeHeroStyles } from "../../data/heroSliderTemplates";

export default function HeroModernistCenteredSlider({ slides = [], styles: rawStyles = {}, editor = null }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const themeColors = useStorefrontThemeColors();
    const styles = normalizeHeroStyles('modernist_centered', rawStyles, themeColors);

    useEffect(() => {
        if (!slides.length || slides.length < 2 || editor?.enabled) return;
        const interval = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => window.clearInterval(interval);
    }, [slides.length, editor?.enabled]);

    const slide = slides[activeIndex] || slides[0] || {};
    const {
        label,
        title = "",
        description,
        image,
        primaryButtonLabel,
        primaryButtonLink,
        secondaryButtonLabel,
        secondaryButtonLink
    } = slide;

    const {
        titleColor = "#ffffff",
        textColor = "#d4d4d8",
        labelColor = "#ffffff",
        primaryButtonBgColor = "#ffffff",
        primaryButtonTextColor = "#000000",
        secondaryButtonBgColor = "transparent",
        secondaryButtonTextColor = "#ffffff",
        secondaryButtonBorderColor = "rgba(255, 255, 255, 0.3)",
        overlayColor = "#000000",
    } = styles;

    const goToSlide = (index) => {
        if (!slides.length) return;
        const safeIndex = ((index % slides.length) + slides.length) % slides.length;
        setActiveIndex(safeIndex);
    };

    const toRgba = (color, alpha) => {
        if (typeof color !== "string") return `rgba(0, 0, 0, ${alpha})`;
        const value = color.trim();
        const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
            const raw = hexMatch[1];
            const hex = raw.length === 3 ? raw.split("").map((ch) => `${ch}${ch}`).join("") : raw;
            const r = Number.parseInt(hex.slice(0, 2), 16);
            const g = Number.parseInt(hex.slice(2, 4), 16);
            const b = Number.parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    };

    return (
        <section className="px-2 py-4 md:px-10 md:py-8">
            <div className="mx-auto max-w-[1408px]">
                <div className="relative h-[60vh] md:h-[70vh] min-h-[500px] w-full overflow-hidden rounded-xl md:rounded-2xl bg-black font-['Inter'] shadow-sm">
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
                                    className={`w-full h-full object-cover transition-transform ease-out ${index === activeIndex ? "scale-100 opacity-70" : "scale-110 opacity-0"}`}
                                    style={{ transitionDuration: '10000ms' }}
                                />
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                                    style={{ background: `linear-gradient(to top, ${toRgba(overlayColor, 0.8)}, transparent, transparent)` }}
                                ></div>
                            </div>
                        ))}
                    </div>

                    {/* Content Container */}
                    <div className="relative z-20 h-full w-full px-8 flex flex-col justify-center items-center text-center">
                        <div className="max-w-4xl space-y-6 md:space-y-8 animate-in fade-in zoom-in duration-700" key={`content-${activeIndex}`}>
                            {label && (
                                <span
                                    className="text-[10px] md:text-[12px] font-bold tracking-[0.3em] uppercase opacity-80 block"
                                    style={{ color: labelColor }}
                                >
                                    {label}
                                </span>
                            )}

                            {title && (
                                <h1
                                    className="text-4xl md:text-6xl lg:text-7xl leading-none font-black tracking-tight font-['Manrope']"
                                    style={{ color: titleColor }}
                                    dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br class="hidden md:block"/>') }}
                                />
                            )}

                            {description && (
                                <p
                                    className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed opacity-90"
                                    style={{ color: textColor }}
                                >
                                    {description}
                                </p>
                            )}

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-8">
                                {primaryButtonLabel && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(primaryButtonLink || '/catalog')}
                                        className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 rounded-lg text-sm font-bold tracking-widest uppercase transition-all active:scale-95 hover:bg-zinc-200"
                                        style={{ backgroundColor: primaryButtonBgColor, color: primaryButtonTextColor }}
                                    >
                                        {primaryButtonLabel}
                                    </button>
                                )}

                                {secondaryButtonLabel && (
                                    <button
                                        type="button"
                                        onClick={() => navigate(secondaryButtonLink || '/about')}
                                        className="w-full sm:w-auto border px-8 md:px-10 py-3 md:py-4 rounded-lg text-sm font-bold tracking-widest uppercase transition-all active:scale-95 hover:bg-white/10 backdrop-blur-md"
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

                        {/* Progress Indicators */}
                        {slides.length > 1 && (
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-8 flex gap-3">
                                {slides.map((_, idx) => (
                                    <button
                                        key={`ind-${idx}`}
                                        onClick={() => goToSlide(idx)}
                                        className="h-1 flex-1 relative overflow-hidden rounded-full group cursor-pointer"
                                        style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                                    >
                                        <div
                                            className="absolute inset-y-0 left-0 bg-white transition-all ease-linear"
                                            style={{
                                                width: idx === activeIndex ? "100%" : (idx < activeIndex ? "100%" : "0%"),
                                                transitionDuration: idx === activeIndex ? "5000ms" : "300ms"
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Side Arrows */}
                        {slides.length > 1 && (
                            <div className="hidden md:flex absolute inset-x-8 top-1/2 -translate-y-1/2 justify-between items-center pointer-events-none">
                                <button
                                    onClick={() => goToSlide(activeIndex - 1)}
                                    className="pointer-events-auto h-14 w-14 rounded-full border border-white/20 bg-black/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-500 active:scale-90 group"
                                    aria-label="Anterior"
                                >
                                    <svg className="size-6 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => goToSlide(activeIndex + 1)}
                                    className="pointer-events-auto h-14 w-14 rounded-full border border-white/20 bg-black/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-500 active:scale-90 group"
                                    aria-label="Siguiente"
                                >
                                    <svg className="size-6 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
