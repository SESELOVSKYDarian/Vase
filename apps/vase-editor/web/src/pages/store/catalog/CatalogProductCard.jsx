// Tarjeta de producto del catálogo y botón de paginado.
import { useState } from "react";
import { formatCurrency } from "../../../utils/format";
import { useStore } from "../../../context/StoreContext";
import { navigate } from "../../../utils/navigation";
import { getStockStatus, isInStock } from "../../../utils/stock";
import PriceAccessPrompt from "../../../components/PriceAccessPrompt";
import { CATALOG_STYLES } from "./catalog-data.js";
import { CartPlusIcon, EyeIcon, HeartIcon } from "./icons.jsx";

export function CatalogProductCard({
    product,
    showPricesEnabled,
    canViewPrices,
    authLoading,
    currency,
    locale,
    showStock,
    lowStockThreshold,
    onFavoriteChange,
}) {
    const { addToCart, toggleFavorite, isFavorite } = useStore();
    const [expanded, setExpanded] = useState(false);
    const { name, desc, price, minPrice, maxPrice, oldPrice, tag, image, alt, stock, grouped, variationCount, variations, variationGroupLabel } = product;
    const favoriteActive = isFavorite(product.id);
    const inStock = isInStock(stock);
    const stockStatus = showStock ? getStockStatus(stock, lowStockThreshold) : null;
    const hasVariations = grouped && Array.isArray(variations) && variations.length > 1;
    const hasPriceRange = Number.isFinite(minPrice) && Number.isFinite(maxPrice) && minPrice !== maxPrice;

    const openProduct = () => navigate(`/product/${product.id}`);
    const handleCardKeyDown = (event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProduct();
        }
    };

    return (
        <article
            role="link"
            tabIndex={0}
            onClick={openProduct}
            onKeyDown={handleCardKeyDown}
            className="group cursor-pointer overflow-hidden rounded-[16px] border shadow-sm outline-none transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40 md:rounded-[24px]"
            style={CATALOG_STYLES.card}
            aria-label={`Ver detalle de ${name}`}
        >
            <div className="relative aspect-square overflow-hidden" style={CATALOG_STYLES.media}>
                <img
                    alt={name}
                    title={alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={image}
                    loading="lazy"
                />

                <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            const nextValue = !favoriteActive;
                            toggleFavorite(product);
                            onFavoriteChange?.(product, nextValue);
                        }}
                        className={`rounded-full p-2 shadow-sm transition-colors ${favoriteActive
                                ? "bg-primary text-white"
                                : "bg-white/90 text-[#181411] hover:bg-primary hover:text-white"
                            }`}
                        aria-label="Agregar a favoritos"
                    >
                        <HeartIcon active={favoriteActive} className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openProduct();
                        }}
                        className="rounded-full bg-white/90 p-2 text-[#181411] shadow-sm transition-colors hover:bg-primary hover:text-white"
                        aria-label="Ver detalle"
                    >
                        <EyeIcon className="size-4" />
                    </button>
                </div>

                {tag ? (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                        {String(tag).toLowerCase() === "nuevo" || String(tag).toLowerCase() === "new" ? "Nuevo" : tag}
                    </span>
                ) : null}
            </div>

            <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-5">
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openProduct();
                        }}
                        className="text-left"
                    >
                        <h3 className="text-sm font-black leading-tight text-[#181411] transition-colors group-hover:text-primary dark:text-white md:text-lg">
                            {name}
                        </h3>
                    </button>
                    <p className="hidden line-clamp-2 text-sm leading-6 md:block" style={CATALOG_STYLES.muted}>{desc || "Producto profesional listo para tu obra."}</p>
                    {stockStatus ? (
                        <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${stockStatus.bg} ${stockStatus.tone}`}
                        >
                            {stockStatus.label}
                        </span>
                    ) : null}
                    {hasVariations ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                {variationCount} variaciones
                            </span>
                            {variationGroupLabel ? (
                                <span className="text-[11px] font-semibold" style={CATALOG_STYLES.muted}>{variationGroupLabel}</span>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="mt-auto flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="min-w-0 flex flex-col">
                        {showPricesEnabled ? (
                            canViewPrices ? (
                                <>
                                    {oldPrice ? (
                                        <span className="text-xs font-semibold text-slate-400 line-through mb-1">{formatCurrency(oldPrice, currency, locale)}</span>
                                    ) : null}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-lg font-black text-primary md:text-2xl">
                                            {hasPriceRange
                                                ? `Desde ${formatCurrency(minPrice, currency, locale)}`
                                                : formatCurrency(price, currency, locale)}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] ${product.isWholesaleItem
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-[#181411]/10 text-[#181411] dark:bg-white/10 dark:text-white"
                                                }`}
                                        >
                                            {product.isWholesaleItem ? "Mayorista" : "Minorista"}
                                        </span>
                                    </div>
                                    {hasPriceRange ? (
                                        <span className="text-sm" style={CATALOG_STYLES.muted}>
                                            Hasta {formatCurrency(maxPrice, currency, locale)}
                                        </span>
                                    ) : null}
                                </>
                            ) : authLoading ? (
                                <span className="text-sm" style={CATALOG_STYLES.muted}>Cargando precio...</span>
                            ) : (
                                <PriceAccessPrompt compact />
                            )
                        ) : (
                            <span className="text-sm" style={CATALOG_STYLES.muted}>Consultar precio</span>
                        )}
                    </div>

                    {hasVariations ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setExpanded((current) => !current);
                            }}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-white transition-all hover:bg-primary md:h-9 md:w-auto md:text-xs"
                            style={{ backgroundColor: "var(--color-accent, #181411)" }}
                        >
                            {expanded ? "Ocultar" : "Ver variantes"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                addToCart(product, 1);
                            }}
                            disabled={!inStock}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-0 md:text-xs"
                        >
                            <CartPlusIcon className="size-5 md:size-4" />
                            <span className="md:hidden">Agregar al carrito</span>
                        </button>
                    )}
                </div>

                {hasVariations && expanded ? (
                    <div className="rounded-2xl border p-3" style={CATALOG_STYLES.surface}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Variaciones</p>
                                <p className="text-sm font-semibold text-[#181411] dark:text-white">
                                    {variationGroupLabel || "Opciones disponibles"}
                                </p>
                            </div>
                            <span className="text-[11px]" style={CATALOG_STYLES.muted}>{variationCount} opciones</span>
                        </div>

                        <div className="space-y-2">
                            {variations.map((variation) => {
                                const variationInStock = isInStock(variation.stock);
                                const variationStockStatus = showStock ? getStockStatus(variation.stock, lowStockThreshold) : null;
                                return (
                                    <div
                                        key={`variation-${variation.id}`}
                                        className={`rounded-2xl border px-3 py-3 transition-colors ${variation.isRoot
                                                ? "border-primary/30 bg-primary/5"
                                                : ""
                                            }`}
                                        style={variation.isRoot ? undefined : CATALOG_STYLES.card}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                        {variation.variationName}
                                                    </p>
                                                    {variation.isRoot ? (
                                                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                                            Raiz
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {variation.sku ? (
                                                    <p className="mt-1 text-[11px]" style={CATALOG_STYLES.muted}>SKU: {variation.sku}</p>
                                                ) : null}
                                                {variationStockStatus ? (
                                                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${variationStockStatus.bg} ${variationStockStatus.tone}`}>
                                                        {variationStockStatus.label}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                                {showPricesEnabled ? (
                                                    canViewPrices ? (
                                                        <span className="text-base font-black text-primary">
                                                            {formatCurrency(variation.price, currency, locale)}
                                                        </span>
                                                    ) : authLoading ? (
                                                        <span className="text-sm" style={CATALOG_STYLES.muted}>Cargando precio...</span>
                                                    ) : (
                                                        <PriceAccessPrompt compact />
                                                    )
                                                ) : (
                                                    <span className="text-sm" style={CATALOG_STYLES.muted}>Consultar precio</span>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            navigate(`/product/${variation.id}`);
                                                        }}
                                                        className="rounded-xl border px-3 py-2 text-xs font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                                                        style={CATALOG_STYLES.border}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            addToCart(variation, 1);
                                                        }}
                                                        disabled={!variationInStock}
                                                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </article>
    );
}

export function PaginationButton({ label, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:text-white"
            style={CATALOG_STYLES.border}
        >
            {label}
        </button>
    );
}
