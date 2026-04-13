import React from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import StoreSkeleton from "../../components/StoreSkeleton";
import { formatCurrency } from "../../utils/format";
import { navigate } from "../../utils/navigation";

export default function ProductDetailImmersive({
    view, loading, error, images, activeImage, setActiveImage, qty, setQty,
    handleAdd, relatedCards, relatedLoading, reviews, reviewsLoading, reviewsError,
    reviewsEnabled, reviewSubmitting, reviewForm, setReviewForm, handleReviewSubmit,
    formatReviewDate, renderRatingStars, favoriteActive, toggleFavorite,
    canBuy, stockStatus, showPricesEnabled, canViewPrices, authLoading, currency, locale,
    activeTab, setActiveTab, canShowSpecifications, specificationEntries, isInStock, user
}) {
    if (loading) return <StoreLayout><StoreSkeleton variant="product" /></StoreLayout>;
    if (error) return <StoreLayout><main className="px-4 py-10 text-center text-red-600">{error}</main></StoreLayout>;
    if (!view) return <StoreLayout><main className="px-4 py-10 text-center text-white">Producto no encontrado.</main></StoreLayout>;

    return (
        <StoreLayout>
            <main className="w-full bg-zinc-950 text-white min-h-screen pb-20">
                <div className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden">
                    <img src={images[activeImage]?.url || view.image} alt={view.alt} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-125" />
                    <img src={images[activeImage]?.url || view.image} alt={view.alt} className="absolute inset-0 w-full h-full object-contain p-8 md:p-16 drop-shadow-2xl" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-10 -mt-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8 space-y-8">
                            <div>
                                {view.extra?.collection && <span className="text-cyan-400 font-bold tracking-widest uppercase text-xs mb-3 block">{view.extra.collection}</span>}
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">{view.name}</h1>
                                <p className="text-xl md:text-2xl text-zinc-400 font-light max-w-3xl leading-relaxed">{view.shortDescription}</p>
                            </div>

                            {images.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-4 pt-4">
                                    {images.map((img, idx) => (
                                        <button key={img.url} onClick={() => setActiveImage(idx)} className={`shrink-0 w-32 h-24 rounded-2xl overflow-hidden border-2 transition-all ${idx === activeImage ? 'border-cyan-400 scale-105' : 'border-zinc-800 opacity-50 hover:opacity-100 hover:border-zinc-600'}`}>
                                            <img src={img.url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="pt-12 mt-12 border-t border-zinc-800">
                                <h2 className="text-3xl font-bold mb-8">Acerca de este producto</h2>
                                <p className="text-zinc-500 whitespace-pre-line text-lg leading-loose">{view.longDescription}</p>
                            </div>
                        </div>

                        <div className="lg:col-span-4 lg:pl-8">
                            <div className="sticky top-24 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                                <div className="mb-6 pb-6 border-b border-white/10">
                                    {showPricesEnabled ? (
                                        canViewPrices ? (
                                            <div className="flex items-end gap-4">
                                                <span className="text-4xl font-black text-white">{formatCurrency(view.price, currency, locale)}</span>
                                                {view.oldPrice && <span className="text-lg text-zinc-500 line-through mb-1">{formatCurrency(view.oldPrice, currency, locale)}</span>}
                                            </div>
                                        ) : <PriceAccessPrompt />
                                    ) : <p className="text-zinc-500">Consultar precio</p>}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-zinc-950/50 rounded-2xl p-2 border border-white/5">
                                        <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-900 rounded-xl transition-colors">-</button>
                                        <span className="flex-1 text-center font-bold text-xl">{qty}</span>
                                        <button onClick={() => setQty(qty + 1)} className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-900 rounded-xl transition-colors">+</button>
                                    </div>
                                    <button
                                        onClick={handleAdd}
                                        disabled={!canBuy}
                                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black uppercase tracking-wider transition-all disabled:from-zinc-800 disabled:to-zinc-800 shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:shadow-none"
                                    >
                                        {canBuy ? "Agregar al carrito" : "Sin Stock"}
                                    </button>
                                </div>

                                {canShowSpecifications && (
                                    <div className="mt-10 space-y-4">
                                        <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-widest mb-4">Specs</h3>
                                        {specificationEntries.slice(0, 5).map(spec => (
                                            <div key={spec.label} className="bg-zinc-950/50 p-3 rounded-xl border border-white/5 flex justify-between items-center text-sm">
                                                <span className="text-zinc-500">{spec.label}</span>
                                                <span className="font-medium text-white">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </StoreLayout>
    );
}
