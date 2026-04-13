import React from "react";
import ProductCard from "../ProductCard";

export default function FeaturedProductsMasonry({ products, title, subtitle, ctaLabel, ctaLink, styles = {} }) {
    const { alignment = "text-center", titleSize = "text-4xl", titleColor = "text-zinc-900", sectionBg = "bg-zinc-50" } = styles;

    return (
        <section className={`px-4 py-16 md:px-10 ${sectionBg}`}>
            <div className="mx-auto max-w-[1408px]">
                <div className={`mb-12 ${alignment}`}>
                    <h2 className={`${titleSize} font-bold tracking-tight ${titleColor} uppercase font-serif`}>{title}</h2>
                    {subtitle && <p className="mt-4 text-lg text-zinc-500 max-w-2xl mx-auto">{subtitle}</p>}
                </div>

                {products.length ? (
                    <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 space-y-6">
                        {products.map((product, idx) => (
                            <div key={product.id} className={`break-inside-avoid ${idx % 2 === 0 ? 'mt-0' : 'lg:mt-8'}`}>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-zinc-500 py-20">No items to showcase</div>
                )}
            </div>
        </section>
    );
}
