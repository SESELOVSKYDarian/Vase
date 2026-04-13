import React from "react";
import { navigate } from "../../utils/navigation";

export default function HeroCorporateSlider({ slides = [], styles = {}, editor = null }) {
    const slide = slides[0] || {};
    const { title = "Elevate Your Business", subtitle = "Enterprise-grade solutions for modern demands.", image = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop", primaryButtonLabel = "Contact Us" } = slide;

    return (
        <section className="px-2 py-4 md:px-10 md:py-8 bg-zinc-50">
            <div className="mx-auto max-w-[1408px]">
                <div className="flex flex-col lg:flex-row min-h-[500px] overflow-hidden rounded-2xl bg-white shadow-xl shadow-zinc-200/50 border border-zinc-100">
                    <div className="flex-1 flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-white z-10 relative">
                        <span className="text-sm font-bold tracking-widest uppercase text-blue-600 mb-4">{slide.label || 'Corporate'}</span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 tracking-tight leading-tight mb-6">
                            {title}
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-500 mb-10 max-w-lg leading-relaxed">
                            {subtitle}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => navigate(slide.primaryButtonLink || '/catalog')}
                                className="px-8 py-4 rounded-full bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
                            >
                                {primaryButtonLabel}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 relative min-h-[300px] lg:min-h-full">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${image}")` }} />
                        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent w-32" />
                    </div>
                </div>
            </div>
        </section>
    );
}
