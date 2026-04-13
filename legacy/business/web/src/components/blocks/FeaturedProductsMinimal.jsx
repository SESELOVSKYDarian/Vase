import React from "react";
import { formatCurrency } from "../../utils/format";

export default function FeaturedProductsMinimal({ products, title, subtitle, ctaLabel, ctaLink, styles = {}, onOpenProduct }) {
    const { titleSize = "text-3xl", titleColor = "text-zinc-900", sectionBg = "bg-zinc-50" } = styles;

    return (
        <section className={`px-4 py-16 md:px-10 ${sectionBg}`}>
            <div className="mx-auto max-w-4xl">
                <div className="mb-10 border-b border-zinc-200 pb-4">
                    <h2 className={`${titleSize} font-light ${titleColor} tracking-widest uppercase`}>{title}</h2>
                </div>

                {products.length ? (
                    <div className="flex flex-col gap-0 divide-y divide-zinc-200">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => onOpenProduct?.(product)}
                                className="flex items-center gap-6 py-6 group cursor-pointer hover:bg-zinc-100 transition-colors px-4 -mx-4 rounded-lg"
                            >
                                <div className="w-20 h-20 shrink-0 bg-zinc-200 rounded-md overflow-hidden">
                                    <img src={product.image} alt={product.alt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-medium text-zinc-800">{product.name}</h3>
                                    <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{product.shortDescription}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-mono text-zinc-900">{product.displayPrice}</span>
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
