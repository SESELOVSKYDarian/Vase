import React, { useRef } from "react";
import { navigate } from "../../utils/navigation";
import FashionHeroSlider from "./FashionHeroSlider";
import HomeDecorHeroSlider from "./HomeDecorHeroSlider";
import SanitariosIndustrialHeroSlider from "./SanitariosIndustrialHeroSlider";
import HeroGamingSlider from "./HeroGamingSlider";
import HeroCorporateSlider from "./HeroCorporateSlider";
import HeroSaleBurstSlider from "./HeroSaleBurstSlider";
import { normalizeHeroSlides, normalizeHeroStyles, normalizeHeroVariant } from "../../data/heroSliderTemplates";

function ClassicHeroSlider({
  title = "Sanitarios y griferia para cada proyecto",
  subtitle = "Descubri productos para renovar tu bano con calidad, diseno y asesoramiento real.",
  tag = "Coleccion destacada",
  image = "https://lh3.googleusercontent.com/aida-public/AB6AXuAsE3UyUs8hwy2ulbda_AkoJgM8Dt4ADPYbA-N4JuZyG7V0vY4q6cc-Tt89t4P27xMxKmcjbMRSj4N02izzDB8sxKnPwkQT6oyUKxlUSIDxrIG34D9wU86tDWjBT-0y3V2Z_OLjdxCgq5XnSZfNN_gaFHdyDgF3Yqu1LH2AdPc8uRelPjbm_EzN2gggEAeP5ZoaAymWqHgYvaOW7zs6nmpnzlMDbxoDHw2MGpOOxIcYt6nSxjDnngClgvhP9eojjcdPz_JpCIAFFZA",
  primaryButton = { label: "Ver catalogo", link: "/catalog" },
  secondaryButton = { label: "Conocer la marca", link: "/about" },
  styles = {},
  editor = null,
}) {
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

  const handleDragStart = (event, target) => {
    if (!editorEnabled) return;
    if (event.button !== undefined && event.button !== 0 && event.pointerType !== "touch") return;
    event.preventDefault();
    event.stopPropagation();

    const isPartTarget = target.startsWith("part:");
    const partName = isPartTarget ? target.replace("part:", "") : "";
    const textPartOffsets = {
      tag: { x: heroTagOffsetX, y: heroTagOffsetY },
      title: { x: heroTitleOffsetX, y: heroTitleOffsetY },
      subtitle: { x: heroSubtitleOffsetX, y: heroSubtitleOffsetY },
    };
    const partBase = textPartOffsets[partName] || { x: 0, y: 0 };
    const base = isPartTarget
      ? { x: partBase.x, y: partBase.y, limitX: textLimitX, limitY: textLimitY }
      : target === "text"
        ? { x: heroTextOffsetX, y: heroTextOffsetY, limitX: textLimitX, limitY: textLimitY }
        : { x: buttonOffsetX, y: buttonOffsetY, limitX: buttonLimitX, limitY: buttonLimitY };

    dragRef.current = {
      target,
      startClientX: event.clientX,
      startClientY: event.clientY,
      baseX: base.x,
      baseY: base.y,
      limitX: base.limitX,
      limitY: base.limitY,
    };

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

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
    <section className="px-2 py-4 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1408px]">
        <div className="relative overflow-hidden rounded-lg md:rounded-xl bg-background-dark">
          <div
            className={`flex h-[50dvh] md:h-[70dvh] flex-col justify-center gap-4 md:gap-6 bg-cover bg-center bg-no-repeat px-4 py-8 sm:px-8 md:px-16 md:py-12 ${getAlignmentClass(alignment)}`}
            style={{
              backgroundImage:
                `linear-gradient(90deg, ${toRgba(resolvedOverlayColor, overlayOpacityNumber)} 0%, ${toRgba(resolvedOverlayColor, 0.2)} 100%), url("${image}")`,
            }}
            role="img"
            aria-label={title}
          >
            <div
              className={`max-w-[90%] md:max-w-2xl space-y-3 md:space-y-4 flex flex-col ${getAlignmentClass(alignment)}`}
              style={{
                transform: `translate(${heroTextOffsetX}px, ${heroTextOffsetY}px)`,
              }}
            >
              <span
                className={`inline-block rounded-full ${tagBg} px-4 py-1 text-sm font-bold uppercase tracking-wider ${tagColor} border border-primary/30 ${editorEnabled ? "cursor-move rounded-md outline outline-2 outline-sky-300/80" : ""}`}
                style={{
                  transform: `translate(${heroTagOffsetX}px, ${heroTagOffsetY}px)`,
                  touchAction: editorEnabled ? "none" : undefined,
                  ...(tagTextColor ? { color: tagTextColor } : {}),
                  ...(tagBgColor ? { backgroundColor: tagBgColor } : {}),
                  ...(tagBorderColor ? { borderColor: tagBorderColor } : {}),
                }}
                onPointerDown={editorEnabled ? (event) => handleDragStart(event, "part:tag") : undefined}
                onPointerMove={editorEnabled ? handleDragMove : undefined}
                onPointerUp={editorEnabled ? handleDragEnd : undefined}
                onPointerCancel={editorEnabled ? handleDragEnd : undefined}
              >
                {tag}
              </span>
              <h1
                className={`${titleSize} ${titleFont} leading-tight tracking-tight ${titleColor} ${editorEnabled ? "cursor-move rounded-md outline outline-2 outline-sky-300/80" : ""}`}
                style={{
                  transform: `translate(${heroTitleOffsetX}px, ${heroTitleOffsetY}px)`,
                  touchAction: editorEnabled ? "none" : undefined,
                  ...(titleHexColor ? { color: titleHexColor } : {}),
                }}
                onPointerDown={editorEnabled ? (event) => handleDragStart(event, "part:title") : undefined}
                onPointerMove={editorEnabled ? handleDragMove : undefined}
                onPointerUp={editorEnabled ? handleDragEnd : undefined}
                onPointerCancel={editorEnabled ? handleDragEnd : undefined}
              >
                {title}
              </h1>
              <p
                className={`${subtitleSize} font-normal leading-relaxed ${subtitleColor} ${editorEnabled ? "cursor-move rounded-md outline outline-2 outline-sky-300/80" : ""}`}
                style={{
                  transform: `translate(${heroSubtitleOffsetX}px, ${heroSubtitleOffsetY}px)`,
                  touchAction: editorEnabled ? "none" : undefined,
                  ...(subtitleHexColor ? { color: subtitleHexColor } : {}),
                }}
                onPointerDown={editorEnabled ? (event) => handleDragStart(event, "part:subtitle") : undefined}
                onPointerMove={editorEnabled ? handleDragMove : undefined}
                onPointerUp={editorEnabled ? handleDragEnd : undefined}
                onPointerCancel={editorEnabled ? handleDragEnd : undefined}
              >
                {subtitle}
              </p>
            </div>

            <div
              className={`flex flex-wrap gap-4 pt-4 ${editorEnabled ? "relative cursor-move rounded-lg outline outline-2 outline-emerald-300/80 p-2 bg-black/10" : ""}`}
              style={{
                transform: `translate(${buttonOffsetX}px, ${buttonOffsetY}px)`,
                touchAction: editorEnabled ? "none" : undefined,
              }}
              onPointerDown={editorEnabled ? (event) => handleDragStart(event, "buttons") : undefined}
              onPointerMove={editorEnabled ? handleDragMove : undefined}
              onPointerUp={editorEnabled ? handleDragEnd : undefined}
              onPointerCancel={editorEnabled ? handleDragEnd : undefined}
            >
              {editorEnabled ? (
                <span className="pointer-events-none absolute -top-2 left-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  Botones
                </span>
              ) : null}
              {primaryButton?.label && (
                <button
                  type="button"
                  onClick={() => {
                    if (editorEnabled) return;
                    navigate(primaryButton.link || "/catalog");
                  }}
                  className="flex items-center justify-center rounded-lg h-12 px-8 bg-primary text-white text-base font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  style={{
                    ...(primaryButtonBgColor ? { backgroundColor: primaryButtonBgColor } : {}),
                    ...(primaryButtonTextColor ? { color: primaryButtonTextColor } : {}),
                  }}
                >
                  {primaryButton.label}
                </button>
              )}
              {secondaryButton?.label && (
                <button
                  type="button"
                  onClick={() => {
                    if (editorEnabled) return;
                    navigate(secondaryButton.link || "/about");
                  }}
                  className="flex items-center justify-center rounded-lg h-12 px-8 bg-white/10 text-white text-base font-bold backdrop-blur-md hover:bg-white/20 transition-all border border-white/20"
                  style={{
                    ...(secondaryButtonBgColor ? { backgroundColor: secondaryButtonBgColor } : {}),
                    ...(secondaryButtonTextColor ? { color: secondaryButtonTextColor } : {}),
                    ...(secondaryButtonBorderColor ? { borderColor: secondaryButtonBorderColor } : {}),
                  }}
                >
                  {secondaryButton.label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HeroSlider(props) {
  const variant = normalizeHeroVariant(props?.variant);

  if (variant === "fashion") {
    return (
      <FashionHeroSlider
        slides={normalizeHeroSlides("fashion", props?.slides)}
        styles={normalizeHeroStyles("fashion", props?.styles)}
      />
    );
  }

  if (variant === "home_decor") {
    return (
      <HomeDecorHeroSlider
        slides={normalizeHeroSlides("home_decor", props?.slides)}
        styles={normalizeHeroStyles("home_decor", props?.styles)}
      />
    );
  }

  if (variant === "sanitarios_industrial") {
    return (
      <SanitariosIndustrialHeroSlider
        slides={normalizeHeroSlides("sanitarios_industrial", props?.slides)}
        styles={normalizeHeroStyles("sanitarios_industrial", props?.styles)}
      />
    );
  }

  if (variant === "gaming") return <HeroGamingSlider slides={normalizeHeroSlides("gaming", props?.slides)} styles={normalizeHeroStyles("gaming", props?.styles)} editor={props?.editor} />;
  if (variant === "corporate") return <HeroCorporateSlider slides={normalizeHeroSlides("corporate", props?.slides)} styles={normalizeHeroStyles("corporate", props?.styles)} editor={props?.editor} />;
  if (variant === "sale_burst") return <HeroSaleBurstSlider slides={normalizeHeroSlides("sale_burst", props?.slides)} styles={normalizeHeroStyles("sale_burst", props?.styles)} editor={props?.editor} />;

  return <ClassicHeroSlider {...props} />;
}

