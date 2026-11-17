// Parte de BlockPropertiesEditor: renderHeroSlidesEditor.
import ThemeAwareColorInput from '../ThemeAwareColorInput';
import { Palette } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { SlideCard } from './SlideCard.jsx';
import { Stack } from '@phosphor-icons/react';
import { normalizeHeroStyles } from '../../../../data/heroSliderTemplates';
import { panelClass } from './SlideCard.jsx';

/** Arma renderHeroSlidesEditor con lo que necesita del componente. */
export function makeRenderHeroSlidesEditor({ addHeroSlide, block, handleFileUpload, handleStyleChange, heroColorFields, heroSlides, heroThemeMap, heroVariant, removeHeroSlide, themeColors, updateHeroSlide, uploadingTarget }) {
    return () => (
        <>
            <div className={panelClass}>
                <div className="flex items-center justify-between gap-3">
                    <SectionHeading icon={Stack}>Slides</SectionHeading>
                    <button
                        type="button"
                        onClick={addHeroSlide}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                    >
                        <Plus size={12} weight="bold" />
                        Agregar slide
                    </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                    Edita cada slide: textos, botones e imagen.
                </p>
                <div className="space-y-3">
                    {heroSlides.map((slide, index) => (
                        <SlideCard
                            key={slide.id || `slide-${index}`}
                            slide={slide}
                            index={index}
                            total={heroSlides.length}
                            variant={heroVariant}
                            onChange={(patch) => updateHeroSlide(index, patch)}
                            onRemove={() => removeHeroSlide(index)}
                            uploading={uploadingTarget === `hero-slide-${index}`}
                            onFile={(file) => handleFileUpload(`hero-slide-${index}`, file, (value) => updateHeroSlide(index, { image: value }))}
                        />
                    ))}
                </div>
            </div>
    
            {heroColorFields.length ? (
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del slider</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        {heroColorFields.map((field) => {
                            const tokenName = heroThemeMap[field.key];
                            const themeFallback = tokenName ? themeColors[tokenName] : '';
                            return (
                                <ThemeAwareColorInput
                                    key={field.key}
                                    label={field.label}
                                    value={block.props?.styles?.[field.key] || ''}
                                    themeFallback={themeFallback || normalizeHeroStyles(heroVariant, block.props?.styles, themeColors)?.[field.key] || '#000000'}
                                    onChange={(value) => handleStyleChange(field.key, value)}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </>
    );
}
