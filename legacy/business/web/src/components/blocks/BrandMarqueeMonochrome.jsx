import React, { useMemo } from 'react';
import { getDefaultBrandMarqueeProps, normalizeBrandMarqueeItems, normalizeBrandMarqueeSpeed } from '../../data/brandMarqueeDefaults';

const SPEED_SECONDS = { static: 0, slow: 36, medium: 30, fast: 22 };

export default function BrandMarqueeMonochrome({ eyebrow, title, subtitle, items, speed, styles = {} }) {
    const defaults = useMemo(() => getDefaultBrandMarqueeProps(), []);
    const marqueeItems = useMemo(() => normalizeBrandMarqueeItems(items), [items]);
    const animationSpeed = normalizeBrandMarqueeSpeed(speed || defaults.speed);
    const animationSeconds = SPEED_SECONDS[animationSpeed] || SPEED_SECONDS.medium;
    const shouldAnimate = animationSpeed !== 'static';
    const railItems = shouldAnimate ? [...marqueeItems, ...marqueeItems] : marqueeItems;

    return (
        <section className="mt-16 overflow-hidden px-4 md:px-10 py-12 bg-white">
            <style>{`@keyframes brand-marquee-mono { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
            <div className="mx-auto max-w-[1408px]">
                <div className="mb-4 text-center">
                    {title && <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">{title}</h2>}
                </div>
                <div className="relative flex overflow-hidden">
                    <div className="flex items-center gap-16 whitespace-nowrap py-8" style={shouldAnimate ? { animation: `brand-marquee-mono ${animationSeconds}s linear infinite` } : undefined}>
                        {railItems.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex items-center justify-center min-w-[150px]">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="max-h-12 max-w-[160px] object-contain grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer scale-95 hover:scale-105" />
                                ) : (
                                    <span className="text-xl font-bold uppercase text-zinc-300 hover:text-zinc-900 transition-colors">{item.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
