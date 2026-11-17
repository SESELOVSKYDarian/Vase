// Parte de BlockPropertiesEditor: renderServicesEditor.
import EvolutionInput from '../EvolutionInput';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { SERVICES_ICON_OPTIONS } from './SlideCard.jsx';
import { SectionHeading } from './SlideCard.jsx';
import { Stack } from '@phosphor-icons/react';
import { Trash } from '@phosphor-icons/react';
import { UploadButton } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderServicesEditor con lo que necesita del componente. */
export function makeRenderServicesEditor({ block, getArrayProp, handleImageUpload, handlePropChange, handleStyleChange, setArrayProp, updateObjectArrayItem, uploadingTarget }) {
    return () => {
        const items = getArrayProp('items');
    
        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Contenido del modulo</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Titulo"
                            value={block.props?.title || ''}
                            onChange={(event) => handlePropChange('title', event.target.value)}
                            placeholder="Ej: Beneficios de comprar con tu marca"
                        />
                        <EvolutionInput
                            label="Subtitulo"
                            value={block.props?.subtitle || ''}
                            onChange={(event) => handlePropChange('subtitle', event.target.value)}
                            placeholder="Explica en una frase que aporta esta seccion"
                            multiline
                        />
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Alineacion</label>
                            <select
                                value={block.props?.styles?.alignment || 'text-center'}
                                onChange={(event) => handleStyleChange('alignment', event.target.value)}
                                className={selectFieldClass}
                            >
                                <option value="text-left" className="bg-zinc-900">Izquierda</option>
                                <option value="text-center" className="bg-zinc-900">Centro</option>
                                <option value="text-right" className="bg-zinc-900">Derecha</option>
                            </select>
                        </div>
                    </div>
                </div>
    
                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Boxes del inicio</SectionHeading>
                        <button
                            type="button"
                            onClick={() =>
                                setArrayProp('items', [
                                    ...items,
                                    { icon: 'package', image: '', title: 'Nuevo beneficio', text: 'Describe en una frase que gana el cliente.' },
                                ])
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar box
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`service-item-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Box {index + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => setArrayProp('items', items.filter((_, itemIndex) => itemIndex !== index))}
                                        disabled={items.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Icono</label>
                                    <select
                                        value={item?.icon || 'package'}
                                        onChange={(event) => updateObjectArrayItem('items', index, { icon: event.target.value })}
                                        className={selectFieldClass}
                                    >
                                        {SERVICES_ICON_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-zinc-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EvolutionInput
                                    label="Imagen (opcional)"
                                    value={item?.image || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { image: event.target.value })}
                                    placeholder="https://... o sube un archivo"
                                />
                                <div className="flex items-center gap-2">
                                    <UploadButton
                                        busy={uploadingTarget === `services-item-${index}`}
                                        label="Subir imagen"
                                        onChange={(event) =>
                                            handleImageUpload(`services-item-${index}`, event, (value) =>
                                                updateObjectArrayItem('items', index, { image: value })
                                            )
                                        }
                                    />
                                    {item?.image ? (
                                        <>
                                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                                                <img src={item.image} alt={item?.title || `Servicio ${index + 1}`} className="h-full w-full object-cover" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => updateObjectArrayItem('items', index, { image: '' })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300"
                                            >
                                                Quitar imagen
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                                <EvolutionInput
                                    label="Titulo"
                                    value={item?.title || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { title: event.target.value })}
                                    placeholder="Ej: Envio coordinado"
                                />
                                <EvolutionInput
                                    label="Descripcion"
                                    value={item?.text || item?.description || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { text: event.target.value, description: event.target.value })}
                                    placeholder="Explica el beneficio o servicio"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo seccion" value={block.props?.styles?.backgroundColor} defaultColor="#f8f7f5" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Titulo" value={block.props?.styles?.titleColor} defaultColor="#181411" onChange={(value) => handleStyleChange('titleColor', value)} />
                        <ColorField label="Subtitulo" value={block.props?.styles?.subtitleColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('subtitleColor', value)} />
                        <ColorField label="Fondo box" value={block.props?.styles?.cardBackgroundColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('cardBackgroundColor', value)} />
                        <ColorField label="Titulo box" value={block.props?.styles?.cardTitleColor} defaultColor="#181411" onChange={(value) => handleStyleChange('cardTitleColor', value)} />
                        <ColorField label="Texto box" value={block.props?.styles?.cardTextColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('cardTextColor', value)} />
                        <ColorField label="Icono" value={block.props?.styles?.iconColor} defaultColor="#111111" onChange={(value) => handleStyleChange('iconColor', value)} />
                        <ColorField label="Fondo icono" value={block.props?.styles?.iconBackgroundColor} defaultColor="#f3f4f6" onChange={(value) => handleStyleChange('iconBackgroundColor', value)} />
                    </div>
                </div>
            </>
        );
    };
}
