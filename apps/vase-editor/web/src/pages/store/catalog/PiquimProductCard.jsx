// Tarjeta de producto del subcatálogo de Piquim.
import { Flame, Snowflake } from "lucide-react";
import { formatCurrency } from "../../../utils/format";
import { useStore } from "../../../context/StoreContext";
import { CartPlusIcon, HeartIcon } from "./icons.jsx";

export function PiquimSubcatalogProductCard({ product, accent, mediaGradient, icon, currency, locale, onOpen }) {
    const { addToCart, toggleFavorite, isFavorite } = useStore();
    const temperatureType = String(product?.temperature || icon || "").toLowerCase();
    const isCold = temperatureType.includes("ice") || temperatureType.includes("cold") || temperatureType.includes("frio") || temperatureType.includes("frío");
    const isHot = temperatureType.includes("fire") || temperatureType.includes("hot") || temperatureType.includes("calor");
    const showCold = isCold || (!isCold && !isHot);
    const showHot = isHot;
    const inStock = Number(product?.stock || 0) > 0;
    const favorite = isFavorite(product.id);
    const cartPayload = {
        id: product.id,
        sku: product.sku || product.id,
        name: product.name,
        price: product.priceValue || 0,
        image: product.image || "",
        alt: product.alt || product.name,
        stock: product.stock,
    };

    const openProduct = () => {
        if (typeof onOpen === "function") onOpen();
    };

    const handleCardKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openProduct();
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        toggleFavorite(cartPayload);
    };

    const handleAddToCart = (event) => {
        event.stopPropagation();
        if (!inStock) return;
        addToCart(cartPayload, 1);
    };

    return (
        <article
            role="link"
            tabIndex={0}
            aria-label={`Ver detalle de ${product.name}`}
            onClick={openProduct}
            onKeyDown={handleCardKeyDown}
            className="group flex h-[400px] min-w-[282px] cursor-pointer flex-col items-start justify-start overflow-hidden rounded-[18px] bg-[var(--store-card-bg)] outline outline-1 -outline-offset-1 outline-[var(--store-border)] transition-all duration-300 hover:-translate-y-1.5 hover:outline-[var(--store-primary)] hover:shadow-[0_18px_46px_rgba(255,77,0,0.16)] focus-visible:outline-2 focus-visible:outline-[var(--store-primary)]"
        >
            <div className="relative h-[220px] w-full overflow-hidden" style={{ background: mediaGradient }}>
                {product.badge ? (
                    <div
                        className="absolute left-4 top-4 inline-flex items-start justify-start overflow-hidden rounded-full px-2.5 py-1.5"
                        style={{ background: product.badgeDark ? '#1A1614' : '#FF4D00' }}
                    >
                        <span className="text-[9px] font-bold text-white" style={{ letterSpacing: 0.72 }}>
                            {product.badge}
                        </span>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={handleFavoriteClick}
                    aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                    aria-pressed={favorite}
                    className={`absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-[var(--store-text)] transition-all hover:scale-105 ${
                        favorite ? "bg-[var(--store-primary)] text-white" : "bg-[var(--store-surface)]/90 hover:bg-[var(--store-surface-elevated)]"
                    }`}
                >
                    <HeartIcon className="size-5" />
                </button>
                {product.hasImage ? (
                    <img
                        src={product.image}
                        alt={product.alt || product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <ProductDisplayIcon type={icon} className="absolute left-1/2 top-12 h-[138px] w-[86px] -translate-x-1/2 transition-transform duration-500 group-hover:scale-105" accent={accent} />
                )}
                <div className="absolute bottom-[17px] right-6 inline-flex h-[35px] min-w-[44px] items-center justify-center gap-[10px] rounded-[15px] bg-[var(--store-surface)] px-3 py-2.5 shadow-sm">
                    {showCold ? <Snowflake className="size-4" style={{ color: accent }} /> : null}
                    {showHot ? <Flame className="size-4 text-[#FF4D00]" /> : null}
                </div>
            </div>
            <div className="flex w-full flex-col items-start justify-start gap-1.5 overflow-hidden p-[18px]">
                <p className="line-clamp-1 text-[10px] font-bold uppercase text-[var(--store-muted-text)]" style={{ fontFamily: 'Gilroy, sans-serif', letterSpacing: 1.2 }}>
                    {product.breadcrumbLabel || `${product.category} › ${product.subtype}`}
                </p>
                <h3 className="text-base font-bold leading-[20.8px] text-[var(--store-text)]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                    {product.name}
                </h3>
                <div className="flex min-h-5 items-center gap-2">
                    {product.flavorColor ? (
                        <span className="size-3 rounded-full border border-black/10" style={{ backgroundColor: product.flavorColor }} />
                    ) : null}
                    <p className="line-clamp-1 text-xs font-normal text-[var(--store-muted-text)]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                        {product.flavorTitle || product.subtype}
                    </p>
                </div>
                <div className="h-2 w-px" />
                <div className="inline-flex w-full items-center justify-between overflow-hidden">
                    <p className="text-xl font-black text-[var(--store-text)]">{formatCurrency(product.priceValue || 0, currency || "ARS", locale || "es-AR")}</p>
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        aria-label={inStock ? "Agregar al carrito" : "Sin stock"}
                        className="flex size-9 items-center justify-center rounded-full bg-[var(--store-primary)] text-white transition-all hover:scale-105 hover:shadow-[0_10px_22px_rgba(255,77,0,0.28)] disabled:cursor-not-allowed disabled:bg-[var(--store-surface-elevated)] disabled:text-[var(--store-muted-text)]"
                    >
                        <CartPlusIcon className="size-5" />
                    </button>
                </div>
            </div>
        </article>
    );
}

export function ProductDisplayIcon({ type, className = '', accent = '#6BB8E0' }) {
    if (type === 'bread') {
        return (
            <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13 66C13 35 26 16 43 16s30 19 30 50v46c0 7-6 13-13 13H26c-7 0-13-6-13-13V66Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M27 50c4-8 9-12 16-12M43 38c7 0 12 4 16 12" stroke={accent} strokeWidth="5" strokeLinecap="round" />
                <path d="M26 77h34M26 96h34" stroke="#1A1614" strokeWidth="5" strokeLinecap="round" />
            </svg>
        );
    }
    if (type === 'cake') {
        return (
            <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M20 58h46v55c0 7-6 13-13 13H33c-7 0-13-6-13-13V58Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M18 58c0-15 11-27 25-27s25 12 25 27H18Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M28 70c4 8 11 8 15 0s11-8 15 0" stroke={accent} strokeWidth="5" strokeLinecap="round" />
                <path d="M33 92h20" stroke="#1A1614" strokeWidth="5" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M43 12c18 0 31 12 31 29 0 11-6 21-16 26l-8 55c-.5 4-3.8 7-7.9 7s-7.4-3-7.9-7l-8-55C16 62 10 52 10 41c0-17 15-29 33-29Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
            <path d="M25 42c7 7 29 7 36 0M31 65h24" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}
