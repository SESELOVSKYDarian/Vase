import React, { useMemo } from 'react';
import { getDefaultBrandMarqueeProps, normalizeBrandMarqueeItems } from '../../data/brandMarqueeDefaults';

export default function BrandMarqueeGrid({ eyebrow, title, subtitle, items, styles = {} }) {
    const defaults = useMemo(() => getDefaultBrandMarqueeProps(), []);
    const marqueeItems = useMemo(() => normalizeBrandMarqueeItems(items), [items]);

    return (
        <section className="mt-16 px-4 md:px-10 py-16 bg-zinc-50 border-t border-zinc-200">
            <div className="mx-auto max-w-[1408px]">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8 w-full border-b border-zinc-200 pb-8">
                    <div>
                        {eyebrow && <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-500">{eyebrow}</span>}
                        {title && <h2 className="text-3xl font-light tracking-tight text-zinc-900 md:text-5xl">{title}</h2>}
                    </div>
                    {subtitle && <p className="text-zinc-500 max-w-md text-sm md:text-base leading-relaxed">{subtitle}</p>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-px bg-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                    {marqueeItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex items-center justify-center p-8 bg-white hover:bg-zinc-50 transition-colors group">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="max-h-12 max-w-[120px] object-contain opacity-50 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <span className="text-lg font-bold uppercase text-zinc-400 group-hover:text-zinc-900">{item.name}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
