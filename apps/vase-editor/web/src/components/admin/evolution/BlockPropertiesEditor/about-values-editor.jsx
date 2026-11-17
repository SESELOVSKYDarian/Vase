// Parte de BlockPropertiesEditor: renderAboutValuesEditor.
import EvolutionInput from '../EvolutionInput';
import { ABOUT_VALUES_ICON_OPTIONS } from './SlideCard.jsx';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { Stack } from '@phosphor-icons/react';
import { Trash } from '@phosphor-icons/react';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderAboutValuesEditor con lo que necesita del componente. */
export function makeRenderAboutValuesEditor({ block, getArrayProp, handlePropChange, handleStyleChange, setArrayProp, updateObjectArrayItem }) {
    return () => {
        const items = getArrayProp('items');
    
        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Valores</SectionHeading>
                    <EvolutionInput
                        label="Titulo"
                        value={block.props?.title || ''}
                        onChange={(event) => handlePropChange('title', event.target.value)}
                        placeholder="Ej: Nuestros valores"
                    />
                </div>
    
                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Tarjetas</SectionHeading>
                        <button
                            type="button"
                            onClick={() =>
                                setArrayProp('items', [
                                    ...items,
                                    { icon: 'quality', title: 'Nuevo valor', description: 'Describe el principio que representa a la marca.' },
                                ])
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`value-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Tarjeta {index + 1}</p>
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
                                        value={item?.icon || 'quality'}
                                        onChange={(event) => updateObjectArrayItem('items', index, { icon: event.target.value })}
                                        className={selectFieldClass}
                                    >
                                        {ABOUT_VALUES_ICON_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-zinc-900">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <EvolutionInput label="Titulo" value={item?.title || ''} onChange={(event) => updateObjectArrayItem('items', index, { title: event.target.value })} placeholder="Ej: Claridad" />
                                <EvolutionInput
                                    label="Descripcion"
                                    value={item?.description || ''}
                                    onChange={(event) => updateObjectArrayItem('items', index, { description: event.target.value })}
                                    placeholder="Describe el valor con una frase concreta"
                                    multiline
                                />
                            </div>
                        ))}
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#f8f7f5" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Fondo tarjeta" value={block.props?.styles?.cardBackground} defaultColor="#ffffff" onChange={(value) => handleStyleChange('cardBackground', value)} />
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#181411" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#6b7280" onChange={(value) => handleStyleChange('mutedColor', value)} />
                    </div>
                </div>
            </>
        );
    };
}
