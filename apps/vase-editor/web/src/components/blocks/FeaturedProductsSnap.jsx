import React from "react";
import ProductCard from "../ProductCard";

export default function FeaturedProductsSnap({ products, title, subtitle, ctaLabel, ctaLink, styles = {} }) {
    const { titleSize = "text-3xl", titleColor = "text-zinc-900", sectionBg = "bg-white" } = styles;

    return (
        <section className={`py-12 ${sectionBg} overflow-hidden`}>
            <div className="mx-auto max-w-[1408px] px-4 md:px-10 mb-8 flex justify-between items-end">
                <div>
                    <h2 className={`${titleSize} font-bold ${titleColor}`}>{title}</h2>
                    {subtitle && <p className="text-zinc-500 mt-2">{subtitle}</p>}
                </div>
            </div>

            {products.length ? (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 md:px-10 pb-8 hide-scrollbar">
                    {products.map((product) => (
                        <div key={product.id} className="snap-center shrink-0 basis-full min-w-0 px-4">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-zinc-500 py-10">No items available</div>
            )}
        </section>
    );
}
