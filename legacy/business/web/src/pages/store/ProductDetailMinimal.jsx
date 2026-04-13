import React from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import StoreSkeleton from "../../components/StoreSkeleton";
import { formatCurrency } from "../../utils/format";
import { navigate } from "../../utils/navigation";

export default function ProductDetailMinimal({
    view, loading, error, images, activeImage, setActiveImage, qty, setQty,
    handleAdd, relatedCards, relatedLoading, reviews, reviewsLoading, reviewsError,
    reviewsEnabled, reviewSubmitting, reviewForm, setReviewForm, handleReviewSubmit,
    formatReviewDate, renderRatingStars, favoriteActive, toggleFavorite,
    canBuy, stockStatus, showPricesEnabled, canViewPrices, authLoading, currency, locale,
    activeTab, setActiveTab, canShowSpecifications, specificationEntries, isInStock, user
}) {
    if (loading) return <StoreLayout><main className="max-w-[1400px] mx-auto px-4 py-10"><StoreSkeleton variant="product" /></main></StoreLayout>;
    if (error) return <StoreLayout><main className="max-w-[1400px] mx-auto px-4 py-10"><div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-red-600">{error}</div></main></StoreLayout>;
    if (!view) return <StoreLayout><main className="max-w-[1400px] mx-auto px-4 py-10"><div className="rounded-xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500">Producto no encontrado.</div></main></StoreLayout>;

    return (
        <StoreLayout>
            <main className="max-w-5xl mx-auto w-full px-4 md:px-10 py-16">
                <div className="flex flex-col md:flex-row gap-12 lg:gap-20">
                    <div className="w-full md:w-1/2 flex flex-col gap-4">
                        <div className="aspect-[4/5] bg-zinc-50 rounded-2xl overflow-hidden cursor-crosshair">
                            <img src={images[activeImage]?.url || view.image} alt={view.alt} className="w-full h-full object-cover mix-blend-multiply" />
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar">
                                {images.map((img, idx) => (
                                    <button key={img.url} onClick={() => setActiveImage(idx)} className={`shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all ${idx === activeImage ? 'border-zinc-900' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                        <img src={img.url} className="w-full h-full object-cover mix-blend-multiply bg-zinc-50" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col pt-4">
                        <div className="text-sm text-zinc-400 font-mono uppercase tracking-widest mb-4">{view.sku || view.extra?.collection}</div>
                        <h1 className="text-4xl lg:text-5xl font-light text-zinc-900 mb-6">{view.name}</h1>

                        <div className="mb-8">
                            {showPricesEnabled ? (
                                canViewPrices ? (
                                    <div className="text-2xl font-medium text-zinc-900">
                                        {formatCurrency(view.price, currency, locale)}
                                    </div>
                                ) : <PriceAccessPrompt />
                            ) : <p className="text-zinc-500">Consultar precio</p>}
                        </div>

                        <div className="mb-8 text-zinc-600 leading-relaxed font-serif text-lg">
                            {view.shortDescription || view.longDescription || "Un producto diseñado con simpleza y utilidad."}
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-sm mb-12">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center rounded-none border-b border-zinc-300 w-32 justify-between">
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 text-zinc-400 hover:text-zinc-900 transition-colors">-</button>
                                    <span className="font-mono text-zinc-900">{qty}</span>
                                    <button onClick={() => setQty(qty + 1)} className="p-3 text-zinc-400 hover:text-zinc-900 transition-colors">+</button>
                                </div>
                                <button
                                    onClick={handleAdd}
                                    disabled={!canBuy}
                                    className="flex-1 bg-zinc-900 text-white font-medium py-3 px-6 hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:text-zinc-500 rounded-sm uppercase tracking-wide text-sm"
                                >
                                    {canBuy ? "Añadir al cesto" : "Agotado"}
                                </button>
                            </div>
                            <button onClick={() => toggleFavorite(view)} className="text-zinc-500 hover:text-zinc-900 uppercase text-xs tracking-widest text-left font-medium flex items-center gap-2 transition-colors">
                                <span className={favoriteActive ? "text-red-500" : ""}>♥</span> {favoriteActive ? "Quitar de la lista" : "Añadir a la lista"}
                            </button>
                        </div>

                        {canShowSpecifications && (
                            <div className="mt-8 border-t border-zinc-200 pt-8">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 mb-6">Detalles Técnicos</h3>
                                <div className="space-y-3">
                                    {specificationEntries.map(spec => (
                                        <div key={spec.label} className="flex justify-between border-b border-zinc-100 pb-2 text-sm">
                                            <span className="text-zinc-500 font-mono uppercase text-xs">{spec.label}</span>
                                            <span className="text-zinc-900 font-medium">{spec.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </StoreLayout>
    );
}
