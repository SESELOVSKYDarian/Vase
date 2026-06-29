"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { ActionLink, SectionShell, joinClasses, resolveImage } from "@/components/business/storefront/shared";
import type { BlockBaseProps, HeroSlide } from "@/components/business/storefront/types";

const defaultSlides: HeroSlide[] = [
  {
    id: "hero-1",
    eyebrow: "Vase Business",
    title: "Crea una vitrina digital que se vea como tu marca.",
    subtitle: "Bloques visuales, colecciones destacadas y una portada pensada para convertir.",
    imageUrl:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=80",
    primaryAction: { label: "Ver catalogo", href: "#catalogo" },
    secondaryAction: { label: "Conocer la marca", href: "#marca" },
  },
];

export type HeroSliderProps = BlockBaseProps & {
  slides?: HeroSlide[];
  variant?:
    | "classic"
    | "fashion"
    | "home_decor"
    | "sanitarios_industrial"
    | "gaming"
    | "corporate"
    | "sale_burst";
  styles?: {
    backgroundColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    accentColor?: string;
    titleColor?: string;
    subtitleColor?: string;
    tagColor?: string;
    contentAlign?: "left" | "center" | "right";
    minHeight?: string;
  };
};

function heroLayoutClasses(align: HeroSliderProps["styles"] extends { contentAlign?: infer A } ? A : never) {
  if (align === "center") return "items-center text-center";
  if (align === "right") return "items-end text-right";
  return "items-start text-left";
}

function HeroFrame({
  slide,
  onNavigate,
  styles,
  className,
  contentClassName,
  style,
}: {
  slide: HeroSlide;
  onNavigate?: HeroSliderProps["onNavigate"];
  styles?: HeroSliderProps["styles"];
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
}) {
  const overlayOpacity = styles?.overlayOpacity ?? 0.58;
  const overlayColor = styles?.overlayColor || "15, 23, 42";

  return (
    <div className={joinClasses("relative overflow-hidden rounded-[36px] border border-white/10", className)} style={style}>
      <img src={resolveImage(slide.imageUrl)} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(120deg, rgba(${overlayColor}, ${overlayOpacity}) 0%, rgba(${overlayColor}, ${overlayOpacity * 0.35}) 100%)`,
        }}
      />
      <div
        className={joinClasses(
          "relative z-10 flex min-h-[480px] flex-col justify-center gap-6 px-6 py-10 md:px-12 lg:px-16",
          heroLayoutClasses(styles?.contentAlign),
          contentClassName,
        )}
      >
        {slide.eyebrow ? (
          <span
            className="inline-flex rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: styles?.tagColor || "white" }}
          >
            {slide.eyebrow}
          </span>
        ) : null}
        <div className="max-w-3xl space-y-4">
          <h2 className="text-4xl font-black tracking-tight md:text-6xl" style={{ color: styles?.titleColor || "white" }}>
            {slide.title}
          </h2>
          {slide.subtitle ? (
            <p className="max-w-2xl text-base leading-7 md:text-lg" style={{ color: styles?.subtitleColor || "rgba(255,255,255,0.82)" }}>
              {slide.subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionLink action={slide.primaryAction} onNavigate={onNavigate} style={{ ["--accent" as string]: styles?.accentColor || "#dd6b20" }} />
          <ActionLink action={slide.secondaryAction} onNavigate={onNavigate} variant="outline" />
        </div>
      </div>
    </div>
  );
}

export function FashionHeroSlider({ slides = defaultSlides, styles, className, style, onNavigate }: HeroSliderProps) {
  const slide = slides[0] || defaultSlides[0];
  return (
    <SectionShell className={className} style={style}>
      <HeroFrame slide={slide} onNavigate={onNavigate} styles={{ ...styles, contentAlign: styles?.contentAlign || "left" }} className="bg-stone-950" />
    </SectionShell>
  );
}

export function HomeDecorHeroSlider({ slides = defaultSlides, styles, className, style, onNavigate }: HeroSliderProps) {
  const slide = slides[0] || defaultSlides[0];
  return (
    <SectionShell className={className} style={style}>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <HeroFrame slide={slide} onNavigate={onNavigate} styles={styles} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {slides.slice(1, 3).map((item) => (
            <article key={item.id || item.title} className="overflow-hidden rounded-[28px] bg-stone-100">
              <img src={resolveImage(item.imageUrl)} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-5">
                <h3 className="text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
                <p className="text-sm leading-6 text-slate-600">{item.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function SanitariosIndustrialHeroSlider(props: HeroSliderProps) {
  return <HomeDecorHeroSlider {...props} styles={{ ...props.styles, overlayColor: props.styles?.overlayColor || "10,10,10" }} />;
}

export function HeroGamingSlider({ slides = defaultSlides, styles, className, style, onNavigate }: HeroSliderProps) {
  const slide = slides[0] || defaultSlides[0];
  return (
    <SectionShell className={className} style={style}>
      <HeroFrame
        slide={slide}
        onNavigate={onNavigate}
        styles={{ ...styles, overlayColor: styles?.overlayColor || "56, 10, 93", accentColor: styles?.accentColor || "#6d28d9" }}
        className="shadow-[0_0_60px_rgba(109,40,217,0.16)]"
      />
    </SectionShell>
  );
}

export function HeroCorporateSlider({ slides = defaultSlides, styles, className, style, onNavigate }: HeroSliderProps) {
  const slide = slides[0] || defaultSlides[0];
  return (
    <SectionShell className={className} style={style}>
      <HeroFrame slide={slide} onNavigate={onNavigate} styles={{ ...styles, contentAlign: styles?.contentAlign || "left", accentColor: styles?.accentColor || "#0f766e" }} />
    </SectionShell>
  );
}

export function HeroSaleBurstSlider({ slides = defaultSlides, styles, className, style, onNavigate }: HeroSliderProps) {
  const slide = slides[0] || defaultSlides[0];
  return (
    <SectionShell className={className} style={style}>
      <div className="relative">
        <HeroFrame slide={slide} onNavigate={onNavigate} styles={{ ...styles, accentColor: styles?.accentColor || "#ea580c" }} />
        <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-[var(--accent,#ea580c)] px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-white md:right-10 md:top-10">
          Oferta destacada
        </div>
      </div>
    </SectionShell>
  );
}

function ClassicHeroSlider(props: HeroSliderProps) {
  const slide = props.slides?.[0] || defaultSlides[0];
  return (
    <SectionShell className={props.className} style={props.style}>
      <HeroFrame slide={slide} onNavigate={props.onNavigate} styles={props.styles} />
    </SectionShell>
  );
}

export default function HeroSlider(props: HeroSliderProps) {
  switch (props.variant) {
    case "fashion":
      return <FashionHeroSlider {...props} />;
    case "home_decor":
      return <HomeDecorHeroSlider {...props} />;
    case "sanitarios_industrial":
      return <SanitariosIndustrialHeroSlider {...props} />;
    case "gaming":
      return <HeroGamingSlider {...props} />;
    case "corporate":
      return <HeroCorporateSlider {...props} />;
    case "sale_burst":
      return <HeroSaleBurstSlider {...props} />;
    default:
      return <ClassicHeroSlider {...props} />;
  }
}
