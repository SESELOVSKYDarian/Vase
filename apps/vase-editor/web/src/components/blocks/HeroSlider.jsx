// partes: ./drag-start.js, ./HeroSliderSlides.jsx
import React, { useRef } from "react";
import { navigate } from "../../utils/navigation";
import FashionHeroSlider from "./FashionHeroSlider";
import HomeDecorHeroSlider from "./HomeDecorHeroSlider";
import SanitariosIndustrialHeroSlider from "./SanitariosIndustrialHeroSlider";
import HeroModernistSlider from "./HeroModernistSlider";
import HeroModernistCenteredSlider from "./HeroModernistCenteredSlider";
import HeroBoutiqueSlider from "./HeroBoutiqueSlider";
import HeroCorporateSlider from "./HeroCorporateSlider";
import { ArrowRight } from "lucide-react";
import { normalizeHeroSlides, normalizeHeroStyles, normalizeHeroVariant } from "../../data/heroSliderTemplates";
import { useStorefrontThemeColors } from "../../context/ThemeContext";

import { makeHandleDragStart } from './drag-start.js';
import HeroSliderSlides from './HeroSliderSlides.jsx';
const isCatalogCtaLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "ver catalogo";
};

function ClassicHeroSlider({
  title = "Tu negocio online, listo para vender",
  subtitle = "Descubri productos, servicios y novedades con una experiencia simple y clara.",
  tag = "Coleccion destacada",
  image = "https://lh3.googleusercontent.com/aida-public/AB6AXuAsE3UyUs8hwy2ulbda_AkoJgM8Dt4ADPYbA-N4JuZyG7V0vY4q6cc-Tt89t4P27xMxKmcjbMRSj4N02izzDB8sxKnPwkQT6oyUKxlUSIDxrIG34D9wU86tDWjBT-0y3V2Z_OLjdxCgq5XnSZfNN_gaFHdyDgF3Yqu1LH2AdPc8uRelPjbm_EzN2gggEAeP5ZoaAymWqHgYvaOW7zs6nmpnzlMDbxoDHw2MGpOOxIcYt6nSxjDnngClgvhP9eojjcdPz_JpCIAFFZA",
  primaryButton = { label: "Ver catalogo", link: "/catalog" },
  secondaryButton = { label: "Conocer la marca", link: "/about" },
  styles: rawStyles = {},
  editor = null,
}) {
  const themeColors = useStorefrontThemeColors();
  const styles = { ...(rawStyles || {}), ...normalizeHeroStyles('classic', rawStyles, themeColors) };
  const {
    titleSize = "text-5xl lg:text-6xl",
    titleColor = "text-white",
    titleHexColor,
    titleFont = "font-black",
    subtitleSize = "text-lg",
    subtitleColor = "text-white/80",
    subtitleHexColor,
    alignment = "text-left",
    overlayOpacity = "0.85",
    overlayColor,
    tagColor = "text-primary",
    tagBg = "bg-primary/20",
    tagTextColor,
    tagBgColor,
    tagBorderColor,
    primaryButtonBgColor,
    primaryButtonTextColor,
    secondaryButtonBgColor,
    secondaryButtonTextColor,
    secondaryButtonBorderColor,
    buttonsOffsetX = 0,
    buttonsOffsetY = 0,
    textOffsetX = 0,
    textOffsetY = 0,
    tagOffsetX = 0,
    tagOffsetY = 0,
    titleOffsetX = 0,
    titleOffsetY = 0,
    subtitleOffsetX = 0,
    subtitleOffsetY = 0,
  } = styles;
  const buttonOffsetX = Number.isFinite(Number(buttonsOffsetX)) ? Number(buttonsOffsetX) : 0;
  const buttonOffsetY = Number.isFinite(Number(buttonsOffsetY)) ? Number(buttonsOffsetY) : 0;
  const heroTextOffsetX = Number.isFinite(Number(textOffsetX)) ? Number(textOffsetX) : 0;
  const heroTextOffsetY = Number.isFinite(Number(textOffsetY)) ? Number(textOffsetY) : 0;
  const heroTagOffsetX = Number.isFinite(Number(tagOffsetX)) ? Number(tagOffsetX) : 0;
  const heroTagOffsetY = Number.isFinite(Number(tagOffsetY)) ? Number(tagOffsetY) : 0;
  const heroTitleOffsetX = Number.isFinite(Number(titleOffsetX)) ? Number(titleOffsetX) : 0;
  const heroTitleOffsetY = Number.isFinite(Number(titleOffsetY)) ? Number(titleOffsetY) : 0;
  const heroSubtitleOffsetX = Number.isFinite(Number(subtitleOffsetX)) ? Number(subtitleOffsetX) : 0;
  const heroSubtitleOffsetY = Number.isFinite(Number(subtitleOffsetY)) ? Number(subtitleOffsetY) : 0;
  const editorEnabled = Boolean(editor?.enabled);
  const textLimitX = Number.isFinite(Number(editor?.textOffsetLimit?.x)) ? Number(editor.textOffsetLimit.x) : 260;
  const textLimitY = Number.isFinite(Number(editor?.textOffsetLimit?.y)) ? Number(editor.textOffsetLimit.y) : 140;
  const buttonLimitX = Number.isFinite(Number(editor?.buttonOffsetLimit?.x)) ? Number(editor.buttonOffsetLimit.x) : 220;
  const buttonLimitY = Number.isFinite(Number(editor?.buttonOffsetLimit?.y)) ? Number(editor.buttonOffsetLimit.y) : 120;
  const dragRef = useRef(null);
  const overlayOpacityNumber = Number.isFinite(Number(overlayOpacity)) ? Number(overlayOpacity) : 0.85;
  const resolvedOverlayColor = overlayColor || "#000000";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const toRgba = (color, alpha) => {
    if (typeof color !== "string") return `rgba(0, 0, 0, ${alpha})`;
    const value = color.trim();
    const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const raw = hexMatch[1];
      const hex = raw.length === 3 ? raw.split("").map((ch) => `${ch}${ch}`).join("") : raw;
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const rgbMatch = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      const r = Number(rgbMatch[1]);
      const g = Number(rgbMatch[2]);
      const b = Number(rgbMatch[3]);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(0, 0, 0, ${alpha})`;
  };

  const handleDragStart = makeHandleDragStart({ buttonLimitX, buttonLimitY, buttonOffsetX, buttonOffsetY, dragRef, editorEnabled, heroSubtitleOffsetX, heroSubtitleOffsetY, heroTagOffsetX, heroTagOffsetY, heroTextOffsetX, heroTextOffsetY, heroTitleOffsetX, heroTitleOffsetY, textLimitX, textLimitY });

  const handleDragMove = (event) => {
    if (!editorEnabled || !dragRef.current) return;
    event.preventDefault();
    const current = dragRef.current;
    const nextX = current.baseX + (event.clientX - current.startClientX);
    const nextY = current.baseY + (event.clientY - current.startClientY);

    if (current.target.startsWith("part:")) {
      const partName = current.target.replace("part:", "");
      editor?.onTextPartOffsetChange?.(partName, Math.round(nextX), Math.round(nextY));
      return;
    }
    if (current.target === "text") {
      editor?.onTextOffsetChange?.(Math.round(nextX), Math.round(nextY));
      return;
    }
    editor?.onButtonsOffsetChange?.(Math.round(nextX), Math.round(nextY));
  };

  const handleDragEnd = () => {
    dragRef.current = null;
  };

  const getAlignmentClass = (align) => {
    if (align === 'center') return 'items-center text-center';
    if (align === 'right') return 'items-end text-right';
    return 'items-start text-left';
  };

  return (
    <HeroSliderSlides alignment={alignment} buttonOffsetX={buttonOffsetX} buttonOffsetY={buttonOffsetY} editorEnabled={editorEnabled} getAlignmentClass={getAlignmentClass} handleDragEnd={handleDragEnd} handleDragMove={handleDragMove} handleDragStart={handleDragStart} heroSubtitleOffsetX={heroSubtitleOffsetX} heroSubtitleOffsetY={heroSubtitleOffsetY} heroTagOffsetX={heroTagOffsetX} heroTagOffsetY={heroTagOffsetY} heroTextOffsetX={heroTextOffsetX} heroTextOffsetY={heroTextOffsetY} heroTitleOffsetX={heroTitleOffsetX} heroTitleOffsetY={heroTitleOffsetY} image={image} isCatalogCtaLabel={isCatalogCtaLabel} overlayOpacityNumber={overlayOpacityNumber} primaryButton={primaryButton} primaryButtonBgColor={primaryButtonBgColor} primaryButtonTextColor={primaryButtonTextColor} resolvedOverlayColor={resolvedOverlayColor} secondaryButton={secondaryButton} secondaryButtonBgColor={secondaryButtonBgColor} secondaryButtonBorderColor={secondaryButtonBorderColor} secondaryButtonTextColor={secondaryButtonTextColor} subtitle={subtitle} subtitleColor={subtitleColor} subtitleHexColor={subtitleHexColor} subtitleSize={subtitleSize} tag={tag} tagBg={tagBg} tagBgColor={tagBgColor} tagBorderColor={tagBorderColor} tagColor={tagColor} tagTextColor={tagTextColor} title={title} titleColor={titleColor} titleFont={titleFont} titleHexColor={titleHexColor} titleSize={titleSize} toRgba={toRgba} />
  );
}

export default function HeroSlider(props) {
  const variant = normalizeHeroVariant(props?.variant);
  const rawStyles = props?.styles;

  if (variant === "fashion") {
    return (
      <FashionHeroSlider
        slides={normalizeHeroSlides("fashion", props?.slides)}
        styles={rawStyles}
      />
    );
  }

  if (variant === "home_decor") {
    return (
      <HomeDecorHeroSlider
        slides={normalizeHeroSlides("home_decor", props?.slides)}
        styles={rawStyles}
      />
    );
  }

  if (variant === "sanitarios_industrial") {
    return (
      <SanitariosIndustrialHeroSlider
        slides={normalizeHeroSlides("sanitarios_industrial", props?.slides)}
        styles={rawStyles}
      />
    );
  }

  if (variant === "modernist") {
    return (
      <HeroModernistSlider
        slides={normalizeHeroSlides("modernist", props?.slides)}
        styles={rawStyles}
        editor={props?.editor}
      />
    );
  }

  if (variant === "modernist_centered") {
    return (
      <HeroModernistCenteredSlider
        slides={normalizeHeroSlides("modernist_centered", props?.slides)}
        styles={rawStyles}
        editor={props?.editor}
      />
    );
  }

  if (variant === "modern_boutique") {
    return (
      <HeroBoutiqueSlider
        slides={normalizeHeroSlides("modern_boutique", props?.slides)}
        styles={rawStyles}
        editor={props?.editor}
      />
    );
  }

  if (variant === "corporate") return <HeroCorporateSlider slides={normalizeHeroSlides("corporate", props?.slides)} styles={rawStyles} editor={props?.editor} />;

  return <ClassicHeroSlider {...props} />;
}
