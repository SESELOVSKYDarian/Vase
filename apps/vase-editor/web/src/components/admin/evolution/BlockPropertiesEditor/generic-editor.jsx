// Parte de BlockPropertiesEditor: renderGenericEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Image as ImageIcon } from '@phosphor-icons/react';
import { LinkSimple as LinkIcon } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { normalizeColorInputValue } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderGenericEditor con lo que necesita del componente. */
export function makeRenderGenericEditor({ block, handlePropChange, handleStyleChange, subtitleKey }) {
    return () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido principal</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Lanzamiento principal"
                    />
                    <EvolutionInput
                        label="Subtitulo / descripcion"
                        value={block.props?.subtitle || block.props?.description || ''}
                        onChange={(event) => handlePropChange(subtitleKey, event.target.value)}
                        placeholder="Ej: Calidad y diseno para tu marca"
                        multiline
                    />
                </div>
            </div>
    
            {(block.props?.ctaLink !== undefined || block.props?.primaryButton) ? (
                <div className={panelClass}>
                    <SectionHeading icon={LinkIcon}>Accion (CTA)</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Texto del boton"
                            value={block.props?.ctaLabel || block.props?.primaryButton?.label || ''}
                            onChange={(event) => {
                                if (block.props?.primaryButton) {
                                    handlePropChange('primaryButton', { ...block.props.primaryButton, label: event.target.value });
                                    return;
                                }
                                handlePropChange('ctaLabel', event.target.value);
                            }}
                            placeholder="Ej: Ver catalogo"
                        />
                        <LinkInput
                            label="Enlace"
                            value={block.props?.ctaLink || block.props?.primaryButton?.link || ''}
                            onChange={(event) => {
                                if (block.props?.primaryButton) {
                                    handlePropChange('primaryButton', { ...block.props.primaryButton, link: event.target.value });
                                    return;
                                }
                                handlePropChange('ctaLink', event.target.value);
                            }}
                            placeholder="/catalog"
                        />
                    </div>
                </div>
            ) : null}
    
            <div className={panelClass}>
                <SectionHeading icon={Palette}>Estilo</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                        <select
                            value={block.props?.styles?.alignment || 'center'}
                            onChange={(event) => handleStyleChange('alignment', event.target.value)}
                            className={selectFieldClass}
                        >
                            <option value="left" className="bg-zinc-900">Izquierda</option>
                            <option value="center" className="bg-zinc-900">Centro</option>
                            <option value="right" className="bg-zinc-900">Derecha</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Fondo</label>
                        <div className="flex items-center gap-2">
                            <div
                                className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-white/10"
                                style={{ backgroundColor: block.props?.styles?.backgroundColor || '#ffffff' }}
                            >
                                <input
                                    type="color"
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    value={normalizeColorInputValue(block.props?.styles?.backgroundColor, '#ffffff')}
                                    onChange={(event) => handleStyleChange('backgroundColor', event.target.value)}
                                />
                            </div>
                            <span className="font-mono text-[10px] uppercase text-zinc-500">
                                {normalizeColorInputValue(block.props?.styles?.backgroundColor, '#ffffff')}
                            </span>
                        </div>
                    </div>
                </div>
    
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                        <span>Padding vertical</span>
                        <span className="admin-accent-text">{block.props?.styles?.paddingY || '16'}px</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="120"
                        step="4"
                        value={block.props?.styles?.paddingY || 16}
                        onChange={(event) => handleStyleChange('paddingY', event.target.value)}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                    />
                </div>
            </div>
    
            {(block.props?.image || block.props?.backgroundImage) ? (
                <div className={panelClass}>
                    <SectionHeading icon={ImageIcon}>Media (imagen)</SectionHeading>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/5 bg-white/5 transition-all hover:border-white/20">
                        {(block.props?.image || block.props?.backgroundImage) ? (
                            <img
                                src={block.props?.image || block.props?.backgroundImage}
                                alt="Preview"
                                className="h-full w-full object-cover opacity-60"
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center space-y-2 text-zinc-600">
                                <ImageIcon size={24} weight="bold" />
                                <span className="text-[10px]">Sin imagen</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
