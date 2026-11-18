import { Boxes, Sparkles, Store, UtensilsCrossed } from "lucide-react";
import { PANEL_PRODUCTS } from "@/components/panel/products";
import type { PlatformModuleKey } from "@/config/modules";

// Un ícono propio para cada producto de Vase, con sus colores.
function Glyph({ product, size }: { product: PlatformModuleKey; size: number }) {
  switch (product) {
    case "labs":
      return <Sparkles size={size} strokeWidth={2} />;
    case "management":
      return <Boxes size={size} strokeWidth={2} />;
    case "rest":
      return <UtensilsCrossed size={size} strokeWidth={2} />;
    default:
      return <Store size={size} strokeWidth={2} />;
  }
}

/** El ícono del producto en su cuadradito de color. size: lado del cuadrado en px. */
export function ProductIcon({ product, size = 40, title }: { product: PlatformModuleKey; size?: number; title?: string }) {
  const info = PANEL_PRODUCTS[product];
  return (
    <span
      className="vpa-mono"
      style={{ width: size, height: size, background: info.artBg, color: info.artFg, borderRadius: Math.round(size * 0.3) }}
      title={title}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <Glyph product={product} size={Math.round(size * 0.48)} />
    </span>
  );
}
