// Grilla de marcas o líneas de la tienda. Cada marca es una tarjeta: con logo si tiene imagen,
// o con su nombre en grande. Usa el color principal de la tienda y se adapta al modo claro y oscuro.
import React, { useMemo } from 'react';
import { normalizeBrandMarqueeItems } from '../../data/brandMarqueeDefaults';

export default function BrandMarqueeGrid({ eyebrow, title, subtitle, items }) {
    const marqueeItems = useMemo(() => normalizeBrandMarqueeItems(items), [items]);

    return (
        <section className="mt-16 border-t border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-4 py-16 dark:border-white/10 dark:from-[#16110d] dark:to-[#120c08] md:px-10 md:py-20">
            <div className="mx-auto max-w-[1408px]">
                <div className="mb-10 flex w-full flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        {eyebrow ? (
                            <span className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[color:var(--color-primary,#ff6a00)]">
                                <span className="h-px w-8 bg-[color:var(--color-primary,#ff6a00)]" aria-hidden="true" />
                                {eyebrow}
                            </span>
                        ) : null}
                        {title ? <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white md:text-5xl">{title}</h2> : null}
                    </div>
                    {subtitle ? <p className="max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-base">{subtitle}</p> : null}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {marqueeItems.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            className="group relative flex min-h-[112px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-primary,#ff6a00)] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                        >
                            {/* Línea de color que crece al pasar el mouse. */}
                            <span
                                className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[color:var(--color-primary,#ff6a00)] transition-transform duration-300 group-hover:scale-x-100"
                                aria-hidden="true"
                            />
                            {item.image ? (
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                    className="max-h-12 max-w-[130px] object-contain opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 dark:opacity-80"
                                />
                            ) : (
                                <span className="text-center text-base font-black uppercase tracking-[0.12em] text-zinc-700 transition-colors duration-300 group-hover:text-[color:var(--color-primary,#ff6a00)] dark:text-zinc-200 md:text-lg">
                                    {item.name}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
