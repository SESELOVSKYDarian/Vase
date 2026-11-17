// Parte de BlockPropertiesEditor: renderAboutHeroEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Image as ImageIcon } from '@phosphor-icons/react';
import { LinkSimple as LinkIcon } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';

/** Arma renderAboutHeroEditor con lo que necesita del componente. */
export function makeRenderAboutHeroEditor({ block, handlePropChange, handleStyleChange, renderImageControl }) {
    return () => {
        const overlayOpacity = Number.isFinite(Number(block.props?.styles?.overlayOpacity))
            ? Number(block.props.styles.overlayOpacity)
            : 0.85;
    
        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Hero de nosotros</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput label="Etiqueta" value={block.props?.tagline || ''} onChange={(event) => handlePropChange('tagline', event.target.value)} placeholder="Ej: Desde 2014" />
                        <EvolutionInput label="Titulo" value={block.props?.title || ''} onChange={(event) => handlePropChange('title', event.target.value)} placeholder="Ej: La historia de la marca" />
                        <EvolutionInput
                            label="Descripcion"
                            value={block.props?.description || ''}
                            onChange={(event) => handlePropChange('description', event.target.value)}
                            placeholder="Resume la propuesta y el recorrido de la empresa"
                            multiline
                        />
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={LinkIcon}>Botones</SectionHeading>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="Primario: texto"
                                value={block.props?.primaryButton?.label || ''}
                                onChange={(event) => handlePropChange('primaryButton', { ...(block.props?.primaryButton || {}), label: event.target.value })}
                                placeholder="Ej: Ver catalogo"
                            />
                            <LinkInput
                                label="Primario: link"
                                value={block.props?.primaryButton?.link || ''}
                                onChange={(event) => handlePropChange('primaryButton', { ...(block.props?.primaryButton || {}), link: event.target.value })}
                                placeholder="/catalog"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <EvolutionInput
                                label="Secundario: texto"
                                value={block.props?.secondaryButton?.label || ''}
                                onChange={(event) => handlePropChange('secondaryButton', { ...(block.props?.secondaryButton || {}), label: event.target.value })}
                                placeholder="Ej: Conocer al equipo"
                            />
                            <LinkInput
                                label="Secundario: link"
                                value={block.props?.secondaryButton?.link || ''}
                                onChange={(event) => handlePropChange('secondaryButton', { ...(block.props?.secondaryButton || {}), link: event.target.value })}
                                placeholder="#equipo"
                            />
                        </div>
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Imagen de fondo</SectionHeading>
                    {renderImageControl({
                        label: 'Imagen de fondo',
                        value: block.props?.backgroundImage,
                        uploadKey: 'about-hero-background',
                        onChange: (value) => handlePropChange('backgroundImage', value),
                    })}
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Tamano de la portada</SectionHeading>
                    <EvolutionInput
                        label="Alto minimo"
                        value={block.props?.styles?.minHeight || ''}
                        onChange={(event) => handleStyleChange('minHeight', event.target.value.replace(/[^0-9a-z.%]/gi, ''))}
                        placeholder="70vh (ej: 50vh, 80vh, 600px)"
                    />
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del hero</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#d4d4d8" onChange={(value) => handleStyleChange('mutedColor', value)} />
                        <ColorField label="Overlay" value={block.props?.styles?.overlayColor} defaultColor="#111111" onChange={(value) => handleStyleChange('overlayColor', value)} />
                    </div>
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Intensidad overlay</span>
                            <span className="admin-accent-text">{Math.round(overlayOpacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={Math.round(overlayOpacity * 100)}
                            onChange={(event) => handleStyleChange('overlayOpacity', Number(event.target.value) / 100)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>
                </div>
            </>
        );
    };
}
