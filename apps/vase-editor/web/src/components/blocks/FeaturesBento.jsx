import React from 'react';

export default function FeaturesBento({
    title = "Architectural Illumination",
    description = "Explore our curated collection of lighting that defines space.",
    mainImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuAl3zjCR_7o7akmne4GXEWFmNjzYvJtp6gIpiT-pT98SykMNxY7bnNczgTXvKRzD4oYgiLMVvUuCSNvIgfw7p9k4JrSjGhBBB8EjRmDyeGFynCJQnB70JHqM25MORLouA5-7WlvVg7UKRqDGzF8fbW-gnY-Q3PwmVs0Bkvm4_CrvWT_ubaltuHgozDMjy6Jvev0Tu0l_BeAis_OJscCVJahV3UpCwAXgrWLDmobYUwmLWcxHDmsS7UiSP7ayRp5QJfyi1Lmc2MOC4Us",
    sideTitle1 = "Craftsmanship",
    sideDescription1 = "Each piece is hand-finished by master artisans in our Copenhagen studio.",
    sideCta1 = "Learn More",
    sideTitle2 = "Join The Circle",
    sideDescription2 = "Get early access to exclusive collection drops and designer collaborations.",
    styles = {}
}) {
    const {
        backgroundColor = "#ffffff",
        titleColor = "#000000",
        textColor = "#444748",
        accentColor = "#000000"
    } = styles;

    return (
        <section className="max-w-7xl mx-auto px-8 py-24" style={{ backgroundColor }}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Large Block */}
                <div className="md:col-span-8 group relative overflow-hidden aspect-[16/9] border border-zinc-200">
                    <img
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={mainImage}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8 text-white">
                        <h3 className="text-3xl font-bold mb-2 font-['Manrope']">{title}</h3>
                        <p className="text-zinc-200 mb-4 max-w-sm font-['Inter']">{description}</p>
                        <a
                            className="text-[12px] font-bold uppercase tracking-widest border-b border-white pb-1 hover:text-zinc-300 hover:border-zinc-300 transition-colors"
                            href="/catalog"
                        >
                            Shop Collection
                        </a>
                    </div>
                </div>

                {/* Side Stack */}
                <div className="md:col-span-4 flex flex-col gap-8">
                    {/* Small Block 1 */}
                    <div className="flex-1 bg-zinc-50 border border-zinc-200 p-8 flex flex-col justify-center">
                        <span className="material-symbols-outlined text-4xl mb-6" style={{ color: accentColor }}>auto_awesome</span>
                        <h4 className="text-2xl font-bold mb-4 font-['Manrope']" style={{ color: titleColor }}>{sideTitle1}</h4>
                        <p className="mb-6 font-['Inter']" style={{ color: textColor }}>{sideDescription1}</p>
                        <a
                            className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2 group transition-all"
                            href="/about"
                            style={{ color: accentColor }}
                        >
                            {sideCta1} <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </a>
                    </div>

                    {/* Small Block 2 */}
                    <div className="flex-1 bg-black text-white p-8 flex flex-col justify-center">
                        <h4 className="text-2xl font-bold mb-4 font-['Manrope']">{sideTitle2}</h4>
                        <p className="text-zinc-400 mb-6 font-['Inter']">{sideDescription2}</p>
                        <div className="relative">
                            <input
                                className="w-full bg-transparent border-b border-white/20 pb-2 outline-none focus:border-white transition-colors text-white placeholder:text-zinc-500 font-['Inter']"
                                placeholder="Email Address"
                                type="email"
                            />
                            <button className="absolute right-0 top-0 material-symbols-outlined">chevron_right</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
