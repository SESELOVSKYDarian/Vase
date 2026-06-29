"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type {
  BlockBaseProps,
  FeaturedProduct,
  StorefrontAction,
  StorefrontNavigateHandler,
} from "@/components/business/storefront/types";

export const placeholderImage =
  "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80";

export function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function resolveImage(value?: string | null) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return placeholderImage;
}

export function resolveProductDescription(product: FeaturedProduct) {
  return product.shortDescription || product.description || "Producto destacado de Vase Business.";
}

export function actionProps(
  action: StorefrontAction | undefined,
  onNavigate: StorefrontNavigateHandler | undefined,
) {
  return {
    href: action?.href || "#",
    target: action?.target,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (!action?.href || onNavigate) {
        event.preventDefault();
      }

      onNavigate?.(action?.href, event);
    },
  };
}

type ActionLinkProps = BlockBaseProps & {
  action?: StorefrontAction;
  children?: ReactNode;
  variant?: "solid" | "outline" | "ghost" | "link";
};

export function ActionLink({
  action,
  children,
  className,
  style,
  onNavigate,
  variant = "solid",
}: ActionLinkProps) {
  if (!action?.label && !children) {
    return null;
  }

  const variantClassName =
    variant === "outline"
      ? "border border-white/20 bg-white/5 text-white"
      : variant === "ghost"
        ? "bg-white/10 text-white"
        : variant === "link"
          ? "bg-transparent p-0 text-[var(--accent,#dd6b20)] underline-offset-4 hover:underline"
          : "bg-[var(--accent,#dd6b20)] text-white";

  return (
    <a
      {...actionProps(action, onNavigate)}
      className={joinClasses(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:opacity-90",
        variantClassName,
        className,
      )}
      style={style}
    >
      {children || action?.label}
    </a>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  titleClassName,
  subtitleClassName,
  eyebrowClassName,
}: SectionHeadingProps) {
  const alignment =
    align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";

  return (
    <div className={joinClasses("flex flex-col gap-3", alignment, className)}>
      {eyebrow ? (
        <span
          className={joinClasses(
            "text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent,#dd6b20)]",
            eyebrowClassName,
          )}
        >
          {eyebrow}
        </span>
      ) : null}
      {title ? (
        <h2 className={joinClasses("text-3xl font-black tracking-tight text-slate-950 md:text-5xl", titleClassName)}>
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className={joinClasses("max-w-2xl text-sm leading-7 text-slate-600 md:text-base", subtitleClassName)}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function ProductCard({
  product,
  onProductClick,
  onAddToCart,
  showPrices = true,
  showStock = true,
  layout = "default",
}: {
  product: FeaturedProduct;
  onProductClick?: (product: FeaturedProduct) => void;
  onAddToCart?: (product: FeaturedProduct) => void;
  showPrices?: boolean;
  showStock?: boolean;
  layout?: "default" | "minimal" | "luxury" | "masonry";
}) {
  return (
    <article
      className={joinClasses(
        "group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
        layout === "minimal" && "rounded-[20px]",
        layout === "luxury" && "border-slate-300 bg-stone-50",
      )}
    >
      <button type="button" onClick={() => onProductClick?.(product)} className="block w-full text-left">
        <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
          <img
            src={resolveImage(product.imageUrl)}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {product.badgeText ? (
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900">
              {product.badgeText}
            </span>
          ) : null}
        </div>
      </button>
      <div className="space-y-3 p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-slate-950">{product.name}</h3>
          <p className="text-sm leading-6 text-slate-600">{resolveProductDescription(product)}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            {showPrices && product.priceLabel ? (
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-950">{product.priceLabel}</span>
                {product.originalPriceLabel ? (
                  <span className="text-sm text-slate-400 line-through">{product.originalPriceLabel}</span>
                ) : null}
              </div>
            ) : null}
            {showStock && product.stockLabel ? (
              <span
                className={joinClasses(
                  "text-xs font-semibold uppercase tracking-[0.16em]",
                  product.inStock === false ? "text-rose-500" : "text-emerald-600",
                )}
              >
                {product.stockLabel}
              </span>
            ) : null}
          </div>
          {onAddToCart ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={product.inStock === false}
              className="inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Agregar
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SectionShell({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={joinClasses("px-4 py-16 md:px-8 lg:px-12", className)} style={style}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
