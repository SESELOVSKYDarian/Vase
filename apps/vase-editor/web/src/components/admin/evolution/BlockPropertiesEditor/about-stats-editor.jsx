// Parte de BlockPropertiesEditor: renderAboutStatsEditor.
import EvolutionInput from '../EvolutionInput';
import { ColorField } from './SlideCard.jsx';
import { Palette } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { Stack } from '@phosphor-icons/react';
import { Trash } from '@phosphor-icons/react';
import { cn } from '../../../../utils/cn';
import { panelClass } from './SlideCard.jsx';

/** Arma renderAboutStatsEditor con lo que necesita del componente. */
export function makeRenderAboutStatsEditor({ block, getArrayProp, handleStyleChange, setArrayProp, updateObjectArrayItem }) {
    return () => {
        const items = getArrayProp('items');
    
        return (
            <>
                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Metricas</SectionHeading>
                        <button
                            type="button"
                            onClick={() => setArrayProp('items', [...items, { value: '0', label: 'Nueva metrica' }])}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={`stat-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Metrica {index + 1}</p>
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
                                <div className="grid grid-cols-[minmax(0,120px)_1fr] gap-3">
                                    <EvolutionInput label="Valor" value={item?.value || ''} onChange={(event) => updateObjectArrayItem('items', index, { value: event.target.value })} placeholder="Ej: 15+" />
                                    <EvolutionInput label="Etiqueta" value={item?.label || ''} onChange={(event) => updateObjectArrayItem('items', index, { label: event.target.value })} placeholder="Ej: Proyectos activos" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateObjectArrayItem('items', index, { accent: !item?.accent })}
                                    className={cn(
                                        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors',
                                        item?.accent
                                            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-white'
                                            : 'border-white/10 bg-white/5 text-zinc-300'
                                    )}
                                >
                                    {item?.accent ? 'Valor destacado' : 'Marcar como destacado'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField label="Fondo" value={block.props?.styles?.backgroundColor} defaultColor="#181411" onChange={(value) => handleStyleChange('backgroundColor', value)} />
                        <ColorField label="Acento" value={block.props?.styles?.accentColor} defaultColor="#111111" onChange={(value) => handleStyleChange('accentColor', value)} />
                        <ColorField label="Texto principal" value={block.props?.styles?.textColor} defaultColor="#ffffff" onChange={(value) => handleStyleChange('textColor', value)} />
                        <ColorField label="Texto secundario" value={block.props?.styles?.mutedColor} defaultColor="#9ca3af" onChange={(value) => handleStyleChange('mutedColor', value)} />
                    </div>
                </div>
            </>
        );
    };
}
