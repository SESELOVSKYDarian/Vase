import React from "react";
import { navigate } from "../../utils/navigation";

export default function HeroSaleBurstSlider({ slides = [], styles = {}, editor = null }) {
    const slide = slides[0] || {};
    const { title = "MEGA SALE", subtitle = "Up to 50% off on all items!", image = "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=2070&auto=format&fit=crop", primaryButtonLabel = "SHOP CLEARANCE" } = slide;

    return (
        <section className="px-2 py-4 md:px-10 md:py-8 overflow-hidden bg-red-600">
            <div className="mx-auto max-w-[1408px] relative">
                {/* Flashy radial burst background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,rgba(0,0,0,0)_70%)] opacity-50 blur-2xl pointer-events-none" />

                <div className="relative flex min-h-[400px] md:min-h-[500px] flex-col items-center justify-center p-8 text-center rounded-xl bg-cover bg-center border-4 border-yellow-400 shadow-2xl"
                    style={{ backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.85), rgba(220, 38, 38, 0.95)), url("${image}")` }}>

                    <div className="animate-bounce mb-4 bg-yellow-400 text-red-700 px-6 py-2 rounded-full font-black uppercase tracking-widest rotate-3 scale-110 shadow-lg border-2 border-red-700">
                        {slide.label || 'Limited Time Offer'}
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] -rotate-2">
                        {title}
                    </h1>

                    <p className="mt-4 text-2xl md:text-4xl font-bold text-white uppercase tracking-wider drop-shadow-md max-w-3xl">
                        {subtitle}
                    </p>

                    <button
                        onClick={() => navigate(slide.primaryButtonLink || '/catalog')}
                        className="mt-10 px-12 py-5 rounded-full bg-white text-red-600 text-xl font-black uppercase hover:bg-yellow-400 hover:text-red-700 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_0_rgb(185,28,28)] active:shadow-[0_0px_0_rgb(185,28,28)] active:translate-y-[10px]"
                    >
                        {primaryButtonLabel}
                    </button>
                </div>
            </div>
        </section>
    );
}
