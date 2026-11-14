// Parte de FeaturedProducts.jsx: resolveProductImage, isUuid, ClassicFeaturedProducts.
import { useEffect, useRef, useState } from "react";
import ProductCard from "../../ProductCard";
import { navigate } from "../../../utils/navigation";
import { PRODUCT_PLACEHOLDER_IMAGE } from "../../../utils/productImage";

export const resolveProductImage = (product = {}) => {
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

export const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function ClassicFeaturedProducts({
  products,
  title,
  subtitle,
  ctaLabel,
  ctaLink,
  styles = {},
}) {
  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncIsMobile = () => setIsMobile(mediaQuery.matches);
    syncIsMobile();
    mediaQuery.addEventListener("change", syncIsMobile);
    return () => mediaQuery.removeEventListener("change", syncIsMobile);
  }, []);

  useEffect(() => {
    if (!products.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > products.length - 1) {
      setActiveIndex(0);
    }
  }, [products.length, activeIndex]);

  useEffect(() => {
    if (!isMobile || products.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % products.length);
    }, 3800);
    return () => window.clearInterval(interval);
  }, [isMobile, products.length]);

  useEffect(() => {
    if (!isMobile) return;
    const container = sliderRef.current;
    if (!container) return;
    const card = container.children?.[activeIndex];
    if (!card) return;
    container.scrollTo({ left: card.offsetLeft - 8, behavior: "smooth" });
  }, [activeIndex, isMobile]);

  const handleSliderScroll = () => {
    const container = sliderRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    Array.from(container.children).forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    if (bestIndex !== activeIndex) setActiveIndex(bestIndex);
  };

  const goToSlide = (index) => {
    if (!products.length) return;
    const safeIndex = ((index % products.length) + products.length) % products.length;
    setActiveIndex(safeIndex);
  };

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
          <>
            <div
              ref={sliderRef}
              onScroll={handleSliderScroll}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {products.map((product, index) => (
                <div key={product.id || index} className="min-w-0 shrink-0 basis-full snap-center px-4">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
            {isMobile && products.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex - 1)}
                  className="h-8 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1.5">
                  {products.map((_, index) => (
                    <button
                      key={`dot-${index}`}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className={`h-2.5 w-2.5 rounded-full transition ${index === activeIndex ? "bg-slate-900" : "bg-slate-300"}`}
                      aria-label={`Ir al producto ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToSlide(activeIndex + 1)}
                  className="h-8 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                >
                  Siguiente
                </button>
              </div>
            ) : null}

            <div className="hidden grid-cols-2 gap-3 p-2 md:grid md:grid-cols-4 md:gap-6 md:p-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="m-4 rounded-xl border-2 border-dashed border-[#e5e1de] p-10 text-center text-[#8a7560] dark:border-[#32261a]">
            No encontramos productos para tu busqueda.
          </div>
        )}
      </div>
    </section>
  );
}
