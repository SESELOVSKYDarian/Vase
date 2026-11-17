// Bloque Hero con fotos: el carrusel y sus controles.
import { ArrowRight } from 'lucide-react';
import { navigate } from '../../utils/navigation';

export default function HeroSliderSlides({ alignment, buttonOffsetX, buttonOffsetY, editorEnabled, getAlignmentClass, handleDragEnd, handleDragMove, handleDragStart, heroSubtitleOffsetX, heroSubtitleOffsetY, heroTagOffsetX, heroTagOffsetY, heroTextOffsetX, heroTextOffsetY, heroTitleOffsetX, heroTitleOffsetY, image, isCatalogCtaLabel, overlayOpacityNumber, primaryButton, primaryButtonBgColor, primaryButtonTextColor, resolvedOverlayColor, secondaryButton, secondaryButtonBgColor, secondaryButtonBorderColor, secondaryButtonTextColor, subtitle, subtitleColor, subtitleHexColor, subtitleSize, tag, tagBg, tagBgColor, tagBorderColor, tagColor, tagTextColor, title, titleColor, titleFont, titleHexColor, titleSize, toRgba }) {
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
                      {isCatalogCtaLabel(primaryButton.label) ? <ArrowRight className="ml-2 size-4" /> : null}
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
                      {isCatalogCtaLabel(secondaryButton.label) ? <ArrowRight className="ml-2 size-4" /> : null}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
    );
}
