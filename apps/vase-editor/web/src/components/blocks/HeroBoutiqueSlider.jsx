import React, { useEffect, useState } from "react";
import { navigate } from "../../utils/navigation";
import { useStorefrontThemeColors } from "../../context/ThemeContext";
import { normalizeHeroStyles } from "../../data/heroSliderTemplates";

export default function HeroBoutiqueSlider({ slides = [], styles: rawStyles = {}, editor = null }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const themeColors = useStorefrontThemeColors();
    const styles = normalizeHeroStyles('modern_boutique', rawStyles, themeColors);

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
        subtitle,
        description,
        image,
        primaryButtonLabel,
        primaryButtonLink,
        secondaryButtonLabel,
        secondaryButtonLink
    } = slide;

    const {
        titleColor = "#ffffff",
        textColor = "#f4f4f5",
        labelBgColor = "#000000",
        labelTextColor = "#ffffff",
        primaryButtonBgColor = "#000000",
        primaryButtonTextColor = "#ffffff",
        secondaryButtonBgColor = "transparent",
        secondaryButtonTextColor = "#ffffff",
        secondaryButtonBorderColor = "rgba(255, 255, 255, 0.3)",
        accentBgColor = "#ffffff",
        accentTextColor = "#000000",
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

    const titleLines = String(title || "").split('\n');

    return (
        <section className="px-2 py-4 md:px-10 md:py-8">
            <div className="mx-auto max-w-[1408px]">
                <div className="relative h-[60vh] md:h-[70vh] min-h-[500px] w-full overflow-hidden flex items-center bg-black rounded-xl md:rounded-2xl shadow-sm">
                    {/* Background Layers */}
                    {slides.map((s, index) => (
                        <div
                            key={`bg-${index}`}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
                        >
                            <img
                                src={s.image}
                                alt={s.title || "Slider Image"}
                                className={`w-full h-full object-cover transition-transform ease-out ${index === activeIndex ? "scale-100" : "scale-110"}`}
                                style={{ transitionDuration: '10000ms' }}
                            />
                            <div
                                className="absolute inset-0"
                                style={{ background: `linear-gradient(to right, ${toRgba(overlayColor, 0.5)}, transparent, transparent)` }}
                            ></div>
                        </div>
                    ))}

                    {/* Content Container */}
                    <div className="relative z-20 w-full px-8 md:px-16">
                        <div className="max-w-2xl space-y-6 md:space-y-8 animate-in fade-in slide-in-from-left-8 duration-700" key={`content-${activeIndex}`}>
                            {/* Badge */}
                            {label ? (
                                <div className="inline-flex items-center px-4 py-2 rounded-lg" style={{ backgroundColor: labelBgColor }}>
                                    <span className="text-[12px] font-bold tracking-[0.1em] uppercase" style={{ color: labelTextColor }}>
                                        {label}
                                    </span>
                                </div>
                            ) : null}

                            {/* Headline */}
                            {title ? (
                                <h1
                                    className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tighter drop-shadow-sm font-['Manrope']"
                                    style={{ color: titleColor }}
                                >
                                    {titleLines.map((line, i) => (
                                        <React.Fragment key={`line-${i}`}>
                                            {line}
                                            {i === titleLines.length - 1 && subtitle ? (
                                                <span className="flex items-baseline gap-4 mt-2">
                                                    <span
                                                        className="text-xl md:text-2xl font-semibold px-4 py-1 rounded-full align-middle inline-block whitespace-nowrap"
                                                        style={{ backgroundColor: accentBgColor, color: accentTextColor }}
                                                    >
                                                        {subtitle}
                                                    </span>
                                                </span>
                                            ) : (i < titleLines.length - 1 ? <br/> : null)}
                                        </React.Fragment>
                                    ))}
                                </h1>
                            ) : null}

                            {/* Subheadline */}
                            {description ? (
                                <p className="text-base md:text-lg max-w-md leading-relaxed opacity-90" style={{ color: textColor }}>
                                    {description}
                                </p>
                            ) : null}

                            {/* CTAs */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                {primaryButtonLabel ? (
                                    <button
                                        onClick={() => navigate(primaryButtonLink || '/catalog')}
                                        className="px-8 py-3 md:py-4 rounded font-bold tracking-widest uppercase transition-all duration-200 active:scale-95 hover:brightness-110"
                                        style={{ backgroundColor: primaryButtonBgColor, color: primaryButtonTextColor }}
                                    >
                                        {primaryButtonLabel}
                                    </button>
                                ) : null}
                                {secondaryButtonLabel ? (
                                    <button
                                        onClick={() => navigate(secondaryButtonLink || '/catalog')}
                                        className="backdrop-blur-xl border px-8 py-3 md:py-4 rounded font-bold tracking-widest uppercase transition-all duration-200 active:scale-95 hover:bg-white hover:text-black"
                                        style={{
                                            backgroundColor: secondaryButtonBgColor,
                                            color: secondaryButtonTextColor,
                                            borderColor: secondaryButtonBorderColor
                                        }}
                                    >
                                        {secondaryButtonLabel}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Arrows - Sides */}
                    {slides.length > 1 ? (
                        <div className="absolute inset-x-4 md:inset-x-8 top-1/2 -translate-y-1/2 flex justify-between items-center z-30 pointer-events-none">
                            <button
                                onClick={() => goToSlide(activeIndex - 1)}
                                className="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 bg-black/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-500 active:scale-90 group"
                                aria-label="Anterior"
                            >
                                <svg className="size-6 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                                </svg>
                            </button>
                            <button
                                onClick={() => goToSlide(activeIndex + 1)}
                                className="pointer-events-auto w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/20 bg-black/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-500 active:scale-90 group"
                                aria-label="Siguiente"
                            >
                                <svg className="size-6 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>
                        </div>
                    ) : null}

                    {/* Progress Indicators - Bottom */}
                    {slides.length > 1 ? (
                        <div className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
                            {slides.map((_, idx) => (
                                <button
                                    key={`ind-${idx}`}
                                    className="group py-2 px-1"
                                    onClick={() => goToSlide(idx)}
                                >
                                    <div className="w-10 md:w-16 h-0.5 bg-white/20 relative overflow-hidden">
                                        <div
                                            className="absolute inset-y-0 left-0 transition-all ease-linear"
                                            style={{
                                                width: idx === activeIndex ? "100%" : (idx < activeIndex ? "100%" : "0%"),
                                                transitionDuration: idx === activeIndex ? "5000ms" : "300ms",
                                                backgroundColor: idx === activeIndex ? (accentBgColor || "#ffffff") : "transparent"
                                            }}
                                        ></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
