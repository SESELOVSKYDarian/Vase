"use client";

import { ProductCard, SectionHeading, SectionShell } from "@/components/business/storefront/shared";
import type { BlockBaseProps, FeaturedProduct } from "@/components/business/storefront/types";

const defaultProducts: FeaturedProduct[] = [
  {
    id: "product-1",
    name: "Griferia Atlas Black",
    description: "Terminacion premium para proyectos contemporaneos.",
    imageUrl: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=900&q=80",
    priceLabel: "$ 149.000",
    badgeText: "Nuevo",
    stockLabel: "En stock",
    inStock: true,
  },
  {
    id: "product-2",
    name: "Bacha Forma Stone",
    description: "Pieza protagonista para banos de alto impacto visual.",
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    priceLabel: "$ 198.000",
    stockLabel: "Ultimas unidades",
    inStock: true,
  },
  {
    id: "product-3",
    name: "Kit Duo Nord",
    description: "Combinacion lista para obra con lineas limpias y robustas.",
    imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    priceLabel: "$ 269.000",
    originalPriceLabel: "$ 319.000",
    badgeText: "Promo",
    stockLabel: "En stock",
    inStock: true,
  },
];

export type FeaturedProductsProps = BlockBaseProps & {
  products?: FeaturedProduct[];
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
  variant?: "classic" | "modern" | "high_energy" | "luxury" | "masonry" | "snap" | "minimal";
  showPrices?: boolean;
  showStock?: boolean;
  emptyMessage?: string;
  onProductClick?: (product: FeaturedProduct) => void;
  onAddToCart?: (product: FeaturedProduct) => void;
};

function ProductsHeader({
  title,
  subtitle,
  ctaLabel,
  ctaLink,
  onNavigate,
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
  onNavigate?: FeaturedProductsProps["onNavigate"];
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <SectionHeading title={title} subtitle={subtitle} align="left" />
      {ctaLabel ? (
        <a
          href={ctaLink || "#"}
          onClick={(event) => {
            if (onNavigate || !ctaLink) {
              event.preventDefault();
            }
            onNavigate?.(ctaLink, event);
          }}
          className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent,#dd6b20)]"
        >
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}

function ProductsGrid({
  products,
  variant,
  showPrices,
  showStock,
  onProductClick,
  onAddToCart,
}: {
  products: FeaturedProduct[];
  variant: NonNullable<FeaturedProductsProps["variant"]>;
  showPrices: boolean;
  showStock: boolean;
  onProductClick?: FeaturedProductsProps["onProductClick"];
  onAddToCart?: FeaturedProductsProps["onAddToCart"];
}) {
  const gridClassName =
    variant === "masonry"
      ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      : variant === "snap"
        ? "grid auto-cols-[minmax(280px,1fr)] gap-6 overflow-x-auto md:grid-cols-3"
        : "grid gap-6 md:grid-cols-2 xl:grid-cols-3";

  const layout =
    variant === "minimal" ? "minimal" : variant === "luxury" ? "luxury" : variant === "masonry" ? "masonry" : "default";

  return (
    <div className={gridClassName}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          showPrices={showPrices}
          showStock={showStock}
          layout={layout}
        />
      ))}
    </div>
  );
}

export function FeaturedProductsModern(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8 rounded-[32px] bg-slate-950 p-6 md:p-10">
        <ProductsHeader {...props} />
        <ProductsGrid products={products} variant="modern" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
      </div>
    </SectionShell>
  );
}

export function FeaturedProductsHighEnergy(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <ProductsHeader {...props} />
        <div className="rounded-[36px] bg-gradient-to-br from-orange-100 via-white to-rose-100 p-6 md:p-10">
          <ProductsGrid products={products} variant="high_energy" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
        </div>
      </div>
    </SectionShell>
  );
}

export function FeaturedProductsLuxury(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8 rounded-[32px] border border-stone-200 bg-stone-50 p-6 md:p-10">
        <ProductsHeader {...props} />
        <ProductsGrid products={products} variant="luxury" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
      </div>
    </SectionShell>
  );
}

export function FeaturedProductsMasonry(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <ProductsHeader {...props} />
        <ProductsGrid products={products} variant="masonry" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
      </div>
    </SectionShell>
  );
}

export function FeaturedProductsSnap(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <ProductsHeader {...props} />
        <ProductsGrid products={products} variant="snap" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
      </div>
    </SectionShell>
  );
}

export function FeaturedProductsMinimal(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <ProductsHeader {...props} />
        <ProductsGrid products={products} variant="minimal" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
      </div>
    </SectionShell>
  );
}

function ClassicFeaturedProducts(props: FeaturedProductsProps) {
  const products = props.products?.length ? props.products : defaultProducts;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <ProductsHeader {...props} />
        {products.length ? (
          <ProductsGrid products={products} variant="classic" showPrices={props.showPrices ?? true} showStock={props.showStock ?? true} onProductClick={props.onProductClick} onAddToCart={props.onAddToCart} />
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 px-8 py-16 text-center text-sm text-slate-500">
            {props.emptyMessage || "Todavia no hay productos para mostrar en este bloque."}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

export default function FeaturedProducts(props: FeaturedProductsProps) {
  switch (props.variant) {
    case "modern":
      return <FeaturedProductsModern {...props} />;
    case "high_energy":
      return <FeaturedProductsHighEnergy {...props} />;
    case "luxury":
      return <FeaturedProductsLuxury {...props} />;
    case "masonry":
      return <FeaturedProductsMasonry {...props} />;
    case "snap":
      return <FeaturedProductsSnap {...props} />;
    case "minimal":
      return <FeaturedProductsMinimal {...props} />;
    default:
      return <ClassicFeaturedProducts {...props} />;
  }
}
