// Ficha de producto: la página entera (fotos, precio, compra, pestañas y relacionados).
import PriceAccessPrompt from '../../../components/PriceAccessPrompt';
import ProductBreadcrumb from '../../../components/ProductBreadcrumb';
import ProductTabs from './ProductTabs.jsx';
import StoreLayout from '../../../components/layout/StoreLayout';
import StoreSkeleton from '../../../components/StoreSkeleton';
import { ArrowRight } from 'lucide-react';
import { Bookmark } from 'lucide-react';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { isInStock } from '../../../utils/stock';
import { navigate } from '../../../utils/navigation';

export default function ProductDetailView({ activeImage, activeTab, addToCart, authLoading, breadcrumbItems, canBuy, canShowSpecifications, canViewPrices, currency, displayAlt, displayImage, displayName, displayOldPrice, displayPrice, displaySku, error, favoriteActive, formatReviewDate, handleAdd, handleReviewSubmit, images, loading, locale, presentationOptions, productKicker, relatedCards, relatedLoading, renderRatingStars, reviewForm, reviewSubmitting, reviews, reviewsEnabled, reviewsError, reviewsLoading, selectedPresentation, setActiveImage, setActiveTab, setReviewForm, setSelectedPresentationId, showPricesEnabled, showToast, specificationEntries, stockStatus, toggleFavorite, user, view }) {
    return (
        <StoreLayout>
            <main className="max-w-[1400px] mx-auto w-full px-4 md:px-10 py-10">
                {loading ? (
                    <StoreSkeleton variant="product" />
                ) : error ? (
                    <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-10 text-center text-red-600">
                        {error}
                    </div>
                ) : !view ? (
                    <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-10 text-center text-[#8a7560]">
                        Producto no encontrado.
                    </div>
                ) : (
                    <div className="space-y-10">
                        <ProductBreadcrumb items={breadcrumbItems} className="text-[11px] font-bold" />

                        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
                            <div className="space-y-3">
                                <div className="relative aspect-[1.06] overflow-hidden rounded-lg bg-white dark:bg-[#1a130c]">
                                    <span className="absolute left-5 top-5 z-10 rounded-md bg-[#FF4D00] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                                        {view.extra?.badge || view.extra?.tag || "Producto"}
                                    </span>
                                    <img
                                        src={displayImage}
                                        alt={displayAlt}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                </div>

                                {images.length > 1 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {images.slice(0, 4).map((img, index) => (
                                            <button
                                                key={img.url}
                                                type="button"
                                                onClick={() => setActiveImage(index)}
                                                className={`aspect-square overflow-hidden rounded-md border bg-white transition-colors dark:bg-[#1a130c] ${index === activeImage ? 'border-[#181411] dark:border-white' : 'border-[#e5e1de] hover:border-[#8a7560] dark:border-[#3d2f21] dark:hover:border-[#b8a795]'}`}
                                            >
                                                <img src={img.url} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col justify-center py-1 lg:py-4">
                                {productKicker ? (
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF4D00]">
                                        {productKicker}
                                    </p>
                                ) : null}

                                <h1 className="mt-3 max-w-[520px] text-4xl font-black leading-[0.96] text-[#1A1614] dark:text-[var(--store-text)] md:text-5xl">
                                    {displayName}
                                </h1>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a7560]">
                                    {displaySku ? <span>SKU: {displaySku}</span> : null}
                                    {stockStatus ? (
                                        <span className={`rounded-full px-2.5 py-1 ${stockStatus.bg} ${stockStatus.tone}`}>
                                            {stockStatus.label}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-5 max-w-[560px] text-sm leading-7 text-[#6F625C] dark:text-[var(--store-muted-text)]">
                                    {view.longDescription || view.shortDescription || "Producto cargado desde el panel administrativo."}
                                </p>

                                <div className="mt-6">
                                    {showPricesEnabled ? (
                                        canViewPrices ? (
                                            <div className="flex flex-wrap items-end gap-3">
                                                <span className="text-4xl font-black tracking-tight text-[#FF4D00]">
                                                    {formatCurrency(displayPrice, currency, locale)}
                                                </span>
                                                {displayOldPrice ? (
                                                    <span className="pb-1 text-sm font-bold text-[#B8AAA3] line-through">
                                                        {formatCurrency(displayOldPrice, currency, locale)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : authLoading ? (
                                            <p className="text-sm text-[#8a7560]">Cargando precio...</p>
                                        ) : (
                                            <PriceAccessPrompt />
                                        )
                                    ) : (
                                        <p className="text-sm font-bold text-[#8a7560]">Contactar para precio</p>
                                    )}
                                </div>

                                {presentationOptions.length ? (
                                    <div className="mt-6 space-y-2">
                                        <p className="text-xs font-bold text-[#6F625C] dark:text-[var(--store-muted-text)]">
                                            {view.variationGroupLabel || "Presentación"}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {presentationOptions.map((option) => {
                                                const selected = option.id === selectedPresentation?.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => setSelectedPresentationId(option.id)}
                                                        className={`min-h-10 rounded-md border px-4 text-xs font-semibold transition-colors ${selected
                                                            ? 'border-[#FF4D00] bg-white text-[#FF4D00] dark:bg-[var(--store-card-bg)]'
                                                            : 'border-[#E7C6B6] bg-[#FFF9F5] text-[#6F625C] hover:border-[#FF4D00]/70 dark:border-[var(--store-border)] dark:bg-[var(--store-surface-soft)] dark:text-[var(--store-muted-text)]'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="mt-8 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleAdd}
                                        className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF4D00] px-6 text-sm font-black text-white shadow-[0_14px_24px_rgba(255,77,0,0.22)] transition-colors hover:bg-[#E64500] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!canBuy}
                                    >
                                        <ShoppingCart className="size-4" />
                                        {canBuy ? "Añadir al carrito" : "Sin stock"}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={favoriteActive ? "Quitar de favoritos" : "Agregar a favoritos"}
                                        onClick={() => {
                                            if (view) {
                                                const added = toggleFavorite(view);
                                                if (added) {
                                                    showToast("Producto añadido a favoritos");
                                                }
                                            }
                                        }}
                                        className={`flex size-14 items-center justify-center rounded-full border transition-colors ${favoriteActive
                                            ? 'border-[#FF4D00] bg-[#FF4D00] text-white'
                                            : 'border-[#FF4D00] bg-white text-[#FF4D00] hover:bg-[#FFF1E8]'
                                            }`}
                                    >
                                        <Bookmark className="size-5" fill={favoriteActive ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                        </section>

                        <ProductTabs activeTab={activeTab} canShowSpecifications={canShowSpecifications} formatReviewDate={formatReviewDate} handleReviewSubmit={handleReviewSubmit} renderRatingStars={renderRatingStars} reviewForm={reviewForm} reviewSubmitting={reviewSubmitting} reviews={reviews} reviewsEnabled={reviewsEnabled} reviewsError={reviewsError} reviewsLoading={reviewsLoading} setActiveTab={setActiveTab} setReviewForm={setReviewForm} specificationEntries={specificationEntries} user={user} view={view} />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-[#181411] dark:text-white">
                                    Productos relacionados
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => navigate("/catalog")}
                                    className="inline-flex items-center text-[11px] font-bold uppercase tracking-widest text-[#8a7560] hover:text-primary"
                                >
                                    Ver catálogo <ArrowRight className="ml-2 size-4" />
                                </button>
                            </div>

                            {relatedLoading ? (
                                <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-6 text-center text-[#8a7560]">
                                    Cargando relacionados...
                                </div>
                            ) : relatedCards.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-6 text-center text-[#8a7560]">
                                    No hay productos relacionados.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {relatedCards.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-[#1a130c] rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] overflow-hidden group hover:shadow-xl transition-all duration-300">
                                            <div
                                                className="relative aspect-square overflow-hidden bg-[#f5f2f0] dark:bg-[#2c2116] cursor-pointer"
                                                onClick={() => navigate(`/product/${item.id}`)}
                                            >
                                                <img
                                                    alt={item.name}
                                                    title={item.alt}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    src={item.image}
                                                    loading="lazy"
                                                />
                                            </div>

                                            <div className="p-4 flex flex-col gap-2">
                                                <div>
                                                    <h3 className="text-[#181411] dark:text-white font-bold text-sm leading-tight mb-1 line-clamp-2">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                                {showPricesEnabled ? (
                                                    canViewPrices ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-primary font-black text-base">
                                                                {formatCurrency(item.price, currency, locale)}
                                                            </span>
                                                            {item.isWholesaleItem ? (
                                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                                                    Mayorista
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : authLoading ? (
                                                        <span className="text-[#8a7560] text-xs">Cargando precio...</span>
                                                    ) : (
                                                        <PriceAccessPrompt compact />
                                                    )
                                                ) : (
                                                    <span className="text-[#8a7560] text-xs">Consultar precio</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => addToCart(item, 1)}
                                                    className="mt-2 w-full h-9 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white transition-colors"
                                                    disabled={!isInStock(item.stock)}
                                                >
                                                    {isInStock(item.stock) ? "Agregar" : "Sin stock"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </StoreLayout>
    );
}
