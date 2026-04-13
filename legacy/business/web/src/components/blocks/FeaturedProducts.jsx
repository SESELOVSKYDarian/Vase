import React, { useMemo } from "react";
import { useStore } from "../../context/StoreContext";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import ProductCard from "../ProductCard";
import { navigate } from "../../utils/navigation";
import { formatCurrency } from "../../utils/format";
import { getPriceAccessState } from "../../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../../utils/stock";
import FeaturedProductsModern from "./FeaturedProductsModern";
import FeaturedProductsHighEnergy from "./FeaturedProductsHighEnergy";
import FeaturedProductsLuxury from "./FeaturedProductsLuxury";
import FeaturedProductsMasonry from "./FeaturedProductsMasonry";
import FeaturedProductsSnap from "./FeaturedProductsSnap";
import FeaturedProductsMinimal from "./FeaturedProductsMinimal";
import { normalizeFeaturedStyles, normalizeFeaturedVariant } from "../../data/featuredProductsTemplates";
import { PRODUCT_PLACEHOLDER_IMAGE } from "../../utils/productImage";

const resolveProductImage = (product = {}) => {
  if (typeof product.image === "string" && product.image) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url || first.src || "";
  }
  if (product?.data?.image) return product.data.image;
  if (Array.isArray(product?.data?.images) && product.data.images.length > 0) {
    const first = product.data.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url || first.src || "";
  }
  return PRODUCT_PLACEHOLDER_IMAGE;
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function ClassicFeaturedProducts({
  products,
  title,
  subtitle,
  ctaLabel,
  ctaLink,
  styles = {},
}) {
  const {
    alignment = "items-end justify-between",
    titleSize = "text-3xl",
    subtitleSize = "text-base",
    titleColor = "text-[#181411] dark:text-white",
    subtitleColor = "text-[#8a7560] dark:text-white/60",
    sectionBg = "bg-transparent",
  } = styles;

  return (
    <section className={`px-2 py-8 md:px-10 md:py-12 ${sectionBg}`}>
      <div className="mx-auto max-w-[1408px]">
        <div className={`mb-4 md:mb-8 flex flex-col md:flex-row px-2 md:px-4 gap-2 md:gap-0 ${alignment}`}>
          <div>
            <h2 className={`text-2xl md:${titleSize} font-bold tracking-tight ${titleColor}`}>
              {title}
            </h2>
            <p className={`${subtitleSize} mt-1 ${subtitleColor}`}>
              {subtitle}
            </p>
          </div>
          {ctaLabel ? (
            <button
              type="button"
              onClick={() => navigate(ctaLink || "/catalog")}
              className="flex items-center gap-1 font-bold text-primary hover:underline"
            >
              {ctaLabel}{" "}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          ) : null}
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-3 p-2 md:grid-cols-4 md:gap-6 md:p-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="m-4 rounded-xl border-2 border-dashed border-[#e5e1de] p-10 text-center text-[#8a7560] dark:border-[#32261a]">
            No encontramos productos para tu busqueda.
          </div>
        )}
      </div>
    </section>
  );
}

export default function FeaturedProducts({
  products,
  title = "Productos destacados",
  subtitle = "Lo mas elegido para renovar banos, cocinas y espacios de uso diario.",
  ctaLabel = "Todos los Productos",
  ctaLink = "/catalog",
  styles = {},
  variant = "classic",
}) {
  const { search, addToCart } = useStore();
  const { settings } = useTenant();
  const { user, loading: authLoading } = useAuth();
  const currency = settings?.commerce?.currency || "ARS";
  const locale = settings?.commerce?.locale || "es-AR";
  const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);
  const showStock = settings?.commerce?.show_stock !== false;
  const lowStockThreshold = getLowStockThreshold(settings);
  const selectedVariant = normalizeFeaturedVariant(variant);

  const visibleProducts = useMemo(() => {
    const items = Array.isArray(products) ? products : [];
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name?.toLowerCase().includes(query));
  }, [products, search]);

  const variantProducts = useMemo(() => {
    return visibleProducts.map((item, index) => {
      const rawPrice = Number(item?.price || 0);
      const stockValue = typeof item?.stock === "number" ? item.stock : Number(item?.stock);
      const stock = Number.isFinite(stockValue) ? stockValue : undefined;
      const inStock = isInStock(stock);
      const stockStatus = showStock ? getStockStatus(stock, lowStockThreshold) : null;
      const id = item?.id || item?.sku || `featured-${index}`;
      const displayPrice = Number.isFinite(rawPrice)
        ? formatCurrency(rawPrice, currency, locale)
        : item?.price || "$0";
      const image = resolveProductImage(item);
      return {
        id,
        name: item?.name || "Producto",
        shortDescription:
          item?.shortDescription ||
          item?.short_description ||
          item?.data?.short_description ||
          item?.data?.shortDescription ||
          item?.description ||
          "",
        alt: item?.alt || item?.name || "Producto",
        image,
        inStock,
        stock,
        stockStatus,
        displayPrice,
        originalPrice: item?.originalPrice,
        badgeText: item?.badge?.text || (item?.is_featured ? "Destacado" : ""),
        cartPayload: {
          id: item?.id,
          sku: item?.sku || item?.erp_id || "",
          name: item?.name || "Producto",
          price: Number.isFinite(rawPrice) ? rawPrice : 0,
          image,
          alt: item?.alt || item?.name || "Producto",
          stock,
        },
      };
    });
  }, [visibleProducts, currency, locale, showStock, lowStockThreshold]);

  const openProduct = (product) => {
    if (!product?.id || !isUuid(product.id)) return;
    navigate(`/product/${product.id}`);
  };

  const addProductToCart = (product) => {
    if (!product?.inStock) return;
    if (!product?.cartPayload?.id) return;
    addToCart(product.cartPayload);
  };

  if (selectedVariant === "modern") {
    return (
      <FeaturedProductsModern
        products={variantProducts}
        title={title}
        subtitle={subtitle}
        ctaLabel={ctaLabel}
        ctaLink={ctaLink}
        styles={normalizeFeaturedStyles("modern", styles)}
        onOpenProduct={openProduct}
        onAddToCart={addProductToCart}
        showPricesEnabled={showPricesEnabled}
        canViewPrices={canViewPrices}
        authLoading={authLoading}
      />
    );
  }

  if (selectedVariant === "high_energy") {
    return (
      <FeaturedProductsHighEnergy
        products={variantProducts}
        title={title}
        subtitle={subtitle}
        ctaLabel={ctaLabel}
        ctaLink={ctaLink}
        styles={normalizeFeaturedStyles("high_energy", styles)}
        onOpenProduct={openProduct}
        onAddToCart={addProductToCart}
        showPricesEnabled={showPricesEnabled}
        canViewPrices={canViewPrices}
        authLoading={authLoading}
      />
    );
  }

  if (selectedVariant === "luxury") {
    return (
      <FeaturedProductsLuxury
        products={variantProducts}
        title={title}
        subtitle={subtitle}
        ctaLabel={ctaLabel}
        ctaLink={ctaLink}
        styles={normalizeFeaturedStyles("luxury", styles)}
        onOpenProduct={openProduct}
        onAddToCart={addProductToCart}
        showPricesEnabled={showPricesEnabled}
        canViewPrices={canViewPrices}
        authLoading={authLoading}
      />
    );
  }

  if (selectedVariant === "masonry") {
    return <FeaturedProductsMasonry products={variantProducts} title={title} subtitle={subtitle} ctaLabel={ctaLabel} ctaLink={ctaLink} styles={normalizeFeaturedStyles("masonry", styles)} onOpenProduct={openProduct} onAddToCart={addProductToCart} />;
  }
  if (selectedVariant === "snap") {
    return <FeaturedProductsSnap products={variantProducts} title={title} subtitle={subtitle} ctaLabel={ctaLabel} ctaLink={ctaLink} styles={normalizeFeaturedStyles("snap", styles)} onOpenProduct={openProduct} onAddToCart={addProductToCart} />;
  }
  if (selectedVariant === "minimal") {
    return <FeaturedProductsMinimal products={variantProducts} title={title} subtitle={subtitle} ctaLabel={ctaLabel} ctaLink={ctaLink} styles={normalizeFeaturedStyles("minimal", styles)} onOpenProduct={openProduct} onAddToCart={addProductToCart} />;
  }

  return (
    <ClassicFeaturedProducts
      products={visibleProducts}
      title={title}
      subtitle={subtitle}
      ctaLabel={ctaLabel}
      ctaLink={ctaLink}
      styles={styles}
    />
  );
}
