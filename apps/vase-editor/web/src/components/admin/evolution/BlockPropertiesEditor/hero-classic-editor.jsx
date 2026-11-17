// Parte de BlockPropertiesEditor: renderHeroClassicEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { ColorField } from './SlideCard.jsx';
import { HERO_CLASSIC_COLOR_FIELDS } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Image as ImageIcon } from '@phosphor-icons/react';
import { LinkSimple as LinkIcon } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { UploadButton } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderHeroClassicEditor con lo que necesita del componente. */
export function makeRenderHeroClassicEditor({ block, handleImageUpload, handlePropChange, handleStyleChange, uploadingTarget }) {
    return () => (
        <>
            <div className={panelClass}>
                <SectionHeading icon={Baseline}>Contenido principal</SectionHeading>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Etiqueta"
                        value={block.props?.tag || ''}
                        onChange={(event) => handlePropChange('tag', event.target.value)}
                        placeholder="Ej: Lanzamiento"
                    />
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Presenta tu propuesta principal"
                    />
                    <EvolutionInput
                        label="Subtitulo / descripcion"
                        value={block.props?.subtitle || ''}
                        onChange={(event) => handlePropChange('subtitle', event.target.value)}
                        placeholder="Ej: Mensaje de apoyo para explicar la propuesta"
                        multiline
                    />
                </div>
            </div>
    
            <div className={panelClass}>
                <SectionHeading icon={LinkIcon}>Botones</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                    <EvolutionInput
                        label="Primario: texto"
                        value={block.props?.primaryButton?.label || ''}
                        onChange={(event) =>
                            handlePropChange('primaryButton', {
                                ...(block.props?.primaryButton || {}),
                                label: event.target.value,
                            })
                        }
                        placeholder="Ej: Comprar ahora"
                    />
                    <LinkInput
                        label="Primario: link"
                        value={block.props?.primaryButton?.link || ''}
                        onChange={(event) =>
                            handlePropChange('primaryButton', {
                                ...(block.props?.primaryButton || {}),
                                link: event.target.value,
                            })
                        }
                        placeholder="/catalog"
                    />
                    <EvolutionInput
                        label="Secundario: texto"
                        value={block.props?.secondaryButton?.label || ''}
                        onChange={(event) =>
                            handlePropChange('secondaryButton', {
                                ...(block.props?.secondaryButton || {}),
                                label: event.target.value,
                            })
                        }
                        placeholder="Ej: Ver mas"
                    />
                    <LinkInput
                        label="Secundario: link"
                        value={block.props?.secondaryButton?.link || ''}
                        onChange={(event) =>
                            handlePropChange('secondaryButton', {
                                ...(block.props?.secondaryButton || {}),
                                link: event.target.value,
                            })
                        }
                        placeholder="/about"
                    />
                </div>
            </div>
    
            <div className={panelClass}>
                <SectionHeading icon={ImageIcon}>Imagen principal</SectionHeading>
                <div className="space-y-3">
                    <EvolutionInput
                        label="URL imagen"
                        value={block.props?.image || ''}
                        onChange={(event) => handlePropChange('image', event.target.value)}
                        placeholder="https://..."
                    />
                    <div className="flex items-center gap-2">
                        <UploadButton
                            busy={uploadingTarget === 'hero-classic-image'}
                            label="Subir imagen"
                            onChange={(event) =>
                                handleImageUpload('hero-classic-image', event, (value) => handlePropChange('image', value))
                            }
                        />
                        {block.props?.image ? (
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-white">
                                <img src={block.props.image} alt="" className="h-full w-full object-cover" />
                            </div>
                        ) : null}
                    </div>
                    {block.props?.image ? (
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5">
                            <img src={block.props.image} alt="Preview hero" className="h-full w-full object-cover opacity-80" />
                        </div>
                    ) : null}
                </div>
            </div>
    
            <div className={panelClass}>
                <SectionHeading icon={Palette}>Estilo del slider</SectionHeading>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                        <select
                            value={block.props?.styles?.alignment || 'left'}
                            onChange={(event) => handleStyleChange('alignment', event.target.value)}
                            className={selectFieldClass}
                        >
                            <option value="left" className="bg-zinc-900">Izquierda</option>
                            <option value="center" className="bg-zinc-900">Centro</option>
                            <option value="right" className="bg-zinc-900">Derecha</option>
                        </select>
                    </div>
    
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-zinc-500">
                            <span>Opacidad overlay</span>
                            <span className="admin-accent-text">{block.props?.styles?.overlayOpacity || '0.6'}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={block.props?.styles?.overlayOpacity || '0.6'}
                            onChange={(event) => handleStyleChange('overlayOpacity', event.target.value)}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/5 accent-evolution-indigo"
                        />
                    </div>
    
                    <div className="grid grid-cols-1 gap-2">
                        {HERO_CLASSIC_COLOR_FIELDS.map((field) => (
                            <ColorField
                                key={field.key}
                                label={field.label}
                                value={block.props?.styles?.[field.key]}
                                defaultColor={field.defaultColor}
                                onChange={(value) => handleStyleChange(field.key, value)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
