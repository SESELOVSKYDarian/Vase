// Parte de BlockPropertiesEditor: renderFeaturedEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import ThemeAwareColorInput from '../ThemeAwareColorInput';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Layout } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderFeaturedEditor con lo que necesita del componente. */
export function makeRenderFeaturedEditor({ block, featuredColorFields, featuredStyles, featuredThemeMap, featuredVariant, handlePropChange, handleStyleChange, themeColors }) {
    return () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido del modulo</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Productos destacados"
                    />
                    <EvolutionInput
                        label="Subtitulo"
                        value={block.props?.subtitle || ''}
                        onChange={(event) => handlePropChange('subtitle', event.target.value)}
                        placeholder="Texto de apoyo para la seccion"
                        multiline
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <EvolutionInput
                            label="CTA: texto"
                            value={block.props?.ctaLabel || ''}
                            onChange={(event) => handlePropChange('ctaLabel', event.target.value)}
                            placeholder="Ej: Ver catalogo"
                        />
                        <LinkInput
                            label="CTA: link"
                            value={block.props?.ctaLink || ''}
                            onChange={(event) => handlePropChange('ctaLink', event.target.value)}
                            placeholder="/catalog"
                        />
                    </div>
                </div>
            </div>
    
            {featuredVariant === 'classic' ? (
                <div className={panelClass}>
                    <SectionHeading icon={Layout}>Disposicion</SectionHeading>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion cabecera</label>
                            <select
                                value={block.props?.styles?.alignment || 'items-end justify-between'}
                                onChange={(event) => handleStyleChange('alignment', event.target.value)}
                                className={selectFieldClass}
                            >
                                <option value="items-start justify-between" className="bg-zinc-900">Arriba</option>
                                <option value="items-end justify-between" className="bg-zinc-900">Abajo</option>
                                <option value="items-center justify-between" className="bg-zinc-900">Centro</option>
                                <option value="items-end justify-center gap-6" className="bg-zinc-900">Centrado</option>
                            </select>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            Para colores avanzados, usa una plantilla visual como `Modern`, `High Energy` o `Luxury`.
                        </p>
                    </div>
                </div>
            ) : null}
    
            {featuredVariant !== 'classic' && featuredColorFields.length ? (
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del modulo</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        {featuredColorFields.map((field) => {
                            const tokenName = featuredThemeMap[field.key];
                            const themeFallback = tokenName ? themeColors[tokenName] : '';
                            return (
                                <ThemeAwareColorInput
                                    key={field.key}
                                    label={field.label}
                                    value={block.props?.styles?.[field.key] || ''}
                                    themeFallback={themeFallback || featuredStyles[field.key] || '#000000'}
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
