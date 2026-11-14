// Parte de FeaturedProducts.jsx: FeaturedProducts.
import { useMemo } from "react";
import { useStore } from "../../../context/StoreContext";
import { useTenant } from "../../../context/TenantContext";
import { useAuth } from "../../../context/AuthContext";
import { navigate } from "../../../utils/navigation";
import { formatCurrency } from "../../../utils/format";
import { getPriceAccessState } from "../../../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../../../utils/stock";
import FeaturedProductsModern from "../FeaturedProductsModern";
import FeaturedProductsHighEnergy from "../FeaturedProductsHighEnergy";
import FeaturedProductsLuxury from "../FeaturedProductsLuxury";
import FeaturedProductsMasonry from "../FeaturedProductsMasonry";
import FeaturedProductsSnap from "../FeaturedProductsSnap";
import FeaturedProductsMinimal from "../FeaturedProductsMinimal";
import { normalizeFeaturedStyles, normalizeFeaturedVariant } from "../../../data/featuredProductsTemplates";
import { ClassicFeaturedProducts, isUuid, resolveProductImage } from "./ClassicFeaturedProducts.jsx";

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
        styles={styles}
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
        styles={styles}
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
        styles={styles}
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
