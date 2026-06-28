import React from "react";
import { useStore } from "../context/StoreContext";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";
import { getPriceAccessState } from "../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../utils/stock";
import PriceAccessPrompt from "./PriceAccessPrompt";

export default function ProductCard({ product }) {
  const { addToCart } = useStore();
  const { settings } = useTenant();
  const { user, loading } = useAuth();
  const currency = settings?.commerce?.currency || "ARS";
  const locale = settings?.commerce?.locale || "es-AR";
  const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);

  const { id, sku, name, price, badge, image, alt, stock, originalPrice } = product;
  const shortDescription =
    product?.shortDescription ||
    product?.short_description ||
    product?.data?.short_description ||
    product?.data?.shortDescription ||
    product?.description ||
    "";
  const showStock = settings?.commerce?.show_stock !== false;
  const lowStockThreshold = getLowStockThreshold(settings);
  const stockStatus = showStock ? getStockStatus(stock, lowStockThreshold) : null;
  const inStock = isInStock(stock);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!inStock) return;
    addToCart({ id, sku, name, price, image, alt, stock });
  };

  const isUuid =
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const navigateToProduct = () => {
    if (!isUuid) return;
    window.history.pushState({}, '', `/product/${id}`);
    window.dispatchEvent(new Event('navigate'));
  };

  return (
    <div className="group flex flex-col gap-3 rounded-xl bg-white dark:bg-[#2d2218] p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        <div
          onClick={navigateToProduct}
          className={`absolute inset-0 bg-center bg-cover transition-transform duration-500 group-hover:scale-110 ${isUuid ? "cursor-pointer" : ""}`}
          style={{ backgroundImage: `url("${image}")` }}
          role="img"
          aria-label={alt}
          title={alt}
        />
        {badge ? (
          <span
            className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold text-white ${badge.className}`}
          >
            {badge.text}
          </span>
        ) : null}
      </div>

      <div className="px-2 pb-2 text-left">
        <h3 className="text-lg font-bold dark:text-white line-clamp-1">{name}</h3>
        {shortDescription ? (
          <p className="mt-1 line-clamp-2 text-sm text-[#8a7560] dark:text-[#b8a795]">
            {shortDescription}
          </p>
        ) : null}
        {stockStatus ? (
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${stockStatus.bg} ${stockStatus.tone}`}
          >
            {stockStatus.label}
          </span>
        ) : null}
        {showPricesEnabled ? (
          canViewPrices ? (
            <div className="flex flex-col mt-1">
              {originalPrice ? <p className="text-sm font-semibold text-slate-400 line-through">{formatCurrency(originalPrice, currency, locale)}</p> : null}
              <p className="text-2xl font-black text-primary">
                {formatCurrency(price, currency, locale)}
              </p>
              <p className="text-[10px] font-bold text-amber-600 mt-0.5">⚠️ IVA No Incluido</p>
            </div>
          ) : loading ? (
            <p className="text-sm text-[#8a7560] mt-1">Cargando precio...</p>
          ) : (
            <PriceAccessPrompt compact className="mt-1" />
          )
        ) : (
          <p className="text-sm text-[#8a7560] mt-1">Consultar precio</p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          className="mt-3 md:mt-4 flex w-full items-center justify-center gap-1.5 md:gap-2 rounded-lg bg-[#f5f2f0] dark:bg-[#3d2e21] py-4 md:py-2.5 text-base md:text-sm font-bold hover:bg-primary hover:text-white active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:text-white"
          disabled={!inStock}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-white"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path><path d="M12 9h6"></path><path d="M15 6v6"></path></svg>
          {inStock ? "Agregar al carrito" : "Sin stock"}
        </button>
      </div>
    </div>
  );
}
