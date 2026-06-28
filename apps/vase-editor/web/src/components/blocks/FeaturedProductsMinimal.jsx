import React from "react";
import { formatCurrency } from "../../utils/format";

export default function FeaturedProductsMinimal({ products, title, subtitle, ctaLabel, ctaLink, styles = {}, onOpenProduct }) {
    const { titleSize = "text-3xl", titleColor = "text-zinc-900", sectionBg = "bg-zinc-50" } = styles;

    return (
        <section className={`px-4 py-16 md:px-10 ${sectionBg}`}>
            <div className="mx-auto max-w-4xl">
                <div className="mb-10 border-b border-zinc-200 pb-4">
                    <h2 className={`${titleSize} font-light ${titleColor} tracking-widest uppercase`}>{title}</h2>
                    {subtitle && <p className="mt-2 text-zinc-500 font-light">{subtitle}</p>}
                </div>

                {products.length ? (
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-6 md:flex-col md:gap-0 md:divide-y md:divide-zinc-200 hide-scrollbar">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => onOpenProduct?.(product)}
                                className="flex-none w-full basis-full snap-center flex flex-col items-center gap-3 py-4 group cursor-pointer hover:bg-zinc-100 transition-colors px-6 rounded-xl border border-zinc-100 md:flex-row md:w-full md:gap-6 md:py-6 md:px-4 md:-mx-4 md:border-0"
                            >
                                <div className="w-full aspect-square md:w-20 md:h-20 shrink-0 bg-zinc-200 rounded-md overflow-hidden">
                                    <img src={product.image} alt={product.alt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-sm font-medium text-zinc-800 line-clamp-1 md:text-xl">{product.name}</h3>
                                    <p className="hidden md:block text-sm text-zinc-500 mt-1 line-clamp-1">{product.shortDescription}</p>
                                </div>
                                <div className="text-center md:text-right">
                                    <span className="text-sm font-mono text-zinc-900 md:text-lg">{product.displayPrice}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-zinc-500 py-10">Empty list</div>
                )}
            </div>
        </section>
    );
}
