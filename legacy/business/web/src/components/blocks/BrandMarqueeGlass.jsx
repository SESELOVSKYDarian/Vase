import React, { useMemo } from 'react';
import { getDefaultBrandMarqueeProps, normalizeBrandMarqueeItems, normalizeBrandMarqueeSpeed } from '../../data/brandMarqueeDefaults';

const SPEED_SECONDS = { static: 0, slow: 36, medium: 30, fast: 22 };

export default function BrandMarqueeGlass({ eyebrow, title, subtitle, items, speed, styles = {} }) {
    const defaults = useMemo(() => getDefaultBrandMarqueeProps(), []);
    const marqueeItems = useMemo(() => normalizeBrandMarqueeItems(items), [items]);
    const animationSpeed = normalizeBrandMarqueeSpeed(speed || defaults.speed);
    const animationSeconds = SPEED_SECONDS[animationSpeed] || SPEED_SECONDS.medium;
    const shouldAnimate = animationSpeed !== 'static';
    const baseItems = marqueeItems.length > 0 ? marqueeItems : [];
    const minItemsNeeded = 12;
    const railItems = baseItems.length > 0 && baseItems.length < minItemsNeeded
        ? Array(Math.ceil(minItemsNeeded / baseItems.length)).fill(baseItems).flat()
        : baseItems;

    return (
        <section className="mt-16 overflow-hidden py-16 md:py-24 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
            <style>{`
                @keyframes brand-marquee-glass-infinite { 
                    0% { transform: translateX(0%); } 
                    100% { transform: translateX(-100%); } 
                }
                .mask-fade-edges {
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
                .pause-on-hover:hover .animate-track {
                    animation-play-state: paused !important;
                }
            `}</style>
            <div className="mx-auto w-full max-w-[1500px]">
                <div className="mb-16 text-center px-4">
                    {eyebrow && <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400">{eyebrow}</span>}
                    {title && <h2 className="text-3xl font-black tracking-tight md:text-5xl">{title}</h2>}
                    {subtitle && <p className="mx-auto mt-4 max-w-2xl text-zinc-400 text-base md:text-lg">{subtitle}</p>}
                </div>
                <div className="pause-on-hover group relative flex overflow-hidden mask-fade-edges w-full">
                    {/* Track 1 */}
                    <div
                        className="animate-track flex w-max shrink-0 items-center justify-around gap-16 pr-16 md:gap-24 md:pr-24 py-8"
                        style={shouldAnimate ? { animation: `brand-marquee-glass-infinite ${animationSeconds}s linear infinite` } : undefined}
                    >
                        {railItems.map((item, index) => (
                            <div key={`t1-${item.id}-${index}`} className="flex items-center justify-center w-[180px] h-[90px] md:w-[240px] md:h-[110px] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-1">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="max-h-10 max-w-[120px] md:max-h-14 md:max-w-[160px] object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                                ) : (
                                    <span className="text-xl md:text-2xl font-black uppercase text-white/70 tracking-tighter transition-colors duration-500 group-hover:text-white">{item.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Track 2 */}
                    <div
                        className="animate-track flex w-max shrink-0 items-center justify-around gap-16 pr-16 md:gap-24 md:pr-24 py-8"
                        style={shouldAnimate ? { animation: `brand-marquee-glass-infinite ${animationSeconds}s linear infinite` } : undefined}
                        aria-hidden="true"
                    >
                        {railItems.map((item, index) => (
                            <div key={`t2-${item.id}-${index}`} className="flex items-center justify-center w-[180px] h-[90px] md:w-[240px] md:h-[110px] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-1">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="max-h-10 max-w-[120px] md:max-h-14 md:max-w-[160px] object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                                ) : (
                                    <span className="text-xl md:text-2xl font-black uppercase text-white/70 tracking-tighter transition-colors duration-500 group-hover:text-white">{item.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
