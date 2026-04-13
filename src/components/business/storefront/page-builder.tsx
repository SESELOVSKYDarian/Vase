"use client";

import type { ComponentType, ReactNode } from "react";
import AboutHero, {
  AboutCTA,
  AboutMission,
  AboutSplitImage,
  AboutStats,
  AboutTeam,
  AboutTimeline,
  AboutValues,
  AboutVideoFocus,
} from "@/components/business/storefront/about-blocks";
import BrandMarquee, {
  BrandMarqueeGlass,
  BrandMarqueeGrid,
  BrandMarqueeMonochrome,
} from "@/components/business/storefront/brand-marquee";
import FeaturedProducts, {
  FeaturedProductsHighEnergy,
  FeaturedProductsLuxury,
  FeaturedProductsMasonry,
  FeaturedProductsMinimal,
  FeaturedProductsModern,
  FeaturedProductsSnap,
} from "@/components/business/storefront/featured-products";
import HeroSlider, {
  FashionHeroSlider,
  HeroCorporateSlider,
  HeroGamingSlider,
  HeroSaleBurstSlider,
  HomeDecorHeroSlider,
  SanitariosIndustrialHeroSlider,
} from "@/components/business/storefront/hero-slider";
import Services from "@/components/business/storefront/services";
import type { StorefrontNavigateHandler, StorefrontSection } from "@/components/business/storefront/types";

const componentMap = {
  HeroSlider,
  FashionHeroSlider,
  HomeDecorHeroSlider,
  SanitariosIndustrialHeroSlider,
  HeroGamingSlider,
  HeroCorporateSlider,
  HeroSaleBurstSlider,
  BrandMarquee,
  BrandMarqueeGlass,
  BrandMarqueeGrid,
  BrandMarqueeMonochrome,
  FeaturedProducts,
  FeaturedProductsModern,
  FeaturedProductsHighEnergy,
  FeaturedProductsLuxury,
  FeaturedProductsMasonry,
  FeaturedProductsSnap,
  FeaturedProductsMinimal,
  Services,
  AboutHero,
  AboutMission,
  AboutStats,
  AboutValues,
  AboutTeam,
  AboutCTA,
  AboutSplitImage,
  AboutTimeline,
  AboutVideoFocus,
} satisfies Record<string, ComponentType<Record<string, unknown>>>;

const anchorMap: Record<string, string> = {
  FeaturedProducts: "catalogo",
  BrandMarquee: "marcas",
  Services: "servicios",
  AboutHero: "marca",
  AboutMission: "mision",
  AboutTeam: "equipo",
};

export type StorefrontPageBuilderProps = {
  sections?: StorefrontSection[];
  onNavigate?: StorefrontNavigateHandler;
  emptyState?: ReactNode;
};

export function StorefrontPageBuilder({ sections = [], onNavigate, emptyState }: StorefrontPageBuilderProps) {
  if (!sections.length) {
    return emptyState || (
      <div className="rounded-[28px] border-2 border-dashed border-slate-300 px-8 py-16 text-center text-sm text-slate-500">
        Todavia no hay bloques configurados para esta pagina.
      </div>
    );
  }

  const usedAnchors = new Set<string>();

  return (
    <div className="flex flex-col">
      {sections.map((section, index) => {
        if (section.enabled === false) {
          return null;
        }

        const Component = componentMap[section.type];
        const rawProps = section.props || {};
        const anchor = section.anchor || (typeof rawProps.anchor === "string" ? rawProps.anchor : anchorMap[section.type]);
        const anchorId = anchor && !usedAnchors.has(anchor) ? anchor : undefined;

        if (anchorId) {
          usedAnchors.add(anchorId);
        }

        if (!Component) {
          return (
            <div key={section.id || `${section.type}-${index}`} className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
              El bloque <strong>{section.type}</strong> todavia no esta mapeado en Vase.
            </div>
          );
        }

        return (
          <section key={section.id || `${section.type}-${index}`} id={anchorId}>
            <Component {...rawProps} onNavigate={onNavigate} />
          </section>
        );
      })}
    </div>
  );
}

export default StorefrontPageBuilder;
