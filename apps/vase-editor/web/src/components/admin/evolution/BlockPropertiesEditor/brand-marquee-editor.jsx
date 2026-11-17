// Parte de BlockPropertiesEditor: renderBrandMarqueeEditor.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { BRAND_MARQUEE_SPEED_OPTIONS } from '../../../../data/brandMarqueeDefaults';
import { ColorField } from './SlideCard.jsx';
import { IdentificationCard as Baseline } from '@phosphor-icons/react';
import { Palette } from '@phosphor-icons/react';
import { Plus } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { Stack } from '@phosphor-icons/react';
import { Trash } from '@phosphor-icons/react';
import { UploadButton } from './SlideCard.jsx';
import { createBrandMarqueeItemId } from './SlideCard.jsx';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

/** Arma renderBrandMarqueeEditor con lo que necesita del componente. */
export function makeRenderBrandMarqueeEditor({ block, brandMarqueeDefaults, brandMarqueeItems, brandMarqueeSpeed, handleImageUpload, handlePropChange, handleStyleChange, mergeProps, uploadingTarget }) {
    return () => {
        const setBrandItems = (nextItems) => {
            mergeProps({ items: nextItems });
        };
    
        const addBrandItem = () => {
            setBrandItems([
                ...brandMarqueeItems,
                {
                    id: createBrandMarqueeItemId(),
                    name: 'Nueva marca',
                    image: '',
                    link: '',
                },
            ]);
        };
    
        const updateBrandItem = (index, patch) => {
            setBrandItems(
                brandMarqueeItems.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, ...patch } : item
                )
            );
        };
    
        const removeBrandItem = (index) => {
            if (brandMarqueeItems.length <= 1) return;
            setBrandItems(brandMarqueeItems.filter((_, itemIndex) => itemIndex !== index));
        };
    
        return (
            <>
                <div className={panelClass}>
                    <SectionHeading icon={Baseline}>Encabezado de marcas</SectionHeading>
                    <div className="space-y-4">
                        <EvolutionInput
                            label="Etiqueta superior"
                            value={block.props?.eyebrow ?? brandMarqueeDefaults.eyebrow}
                            onChange={(event) => handlePropChange('eyebrow', event.target.value)}
                            placeholder="Ej: Nuestras marcas aliadas"
                        />
                        <EvolutionInput
                            label="Titulo opcional"
                            value={block.props?.title ?? brandMarqueeDefaults.title}
                            onChange={(event) => handlePropChange('title', event.target.value)}
                            placeholder="Dejalo vacio si queres solo la etiqueta"
                        />
                        <EvolutionInput
                            label="Subtitulo opcional"
                            value={block.props?.subtitle ?? brandMarqueeDefaults.subtitle}
                            onChange={(event) => handlePropChange('subtitle', event.target.value)}
                            placeholder="Texto extra debajo de la etiqueta"
                            multiline
                        />
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
                            <EvolutionInput
                                label="Boton: texto"
                                value={block.props?.primaryButton?.label || ''}
                                onChange={(event) =>
                                    handlePropChange('primaryButton', {
                                        ...(block.props?.primaryButton || {}),
                                        label: event.target.value,
                                    })
                                }
                                placeholder="Ej: Ver mas"
                            />
                            <LinkInput
                                label="Boton: link"
                                value={block.props?.primaryButton?.link || ''}
                                onChange={(event) =>
                                    handlePropChange('primaryButton', {
                                        ...(block.props?.primaryButton || {}),
                                        link: event.target.value,
                                    })
                                }
                                placeholder="/catalog"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="pl-1 text-[10px] font-bold uppercase text-zinc-600">Velocidad</label>
                            <select
                                value={brandMarqueeSpeed}
                                onChange={(event) => handlePropChange('speed', event.target.value)}
                                className={selectFieldClass}
                            >
                                {BRAND_MARQUEE_SPEED_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-zinc-900">
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
    
                <div className={panelClass}>
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeading icon={Stack}>Marcas del carrusel</SectionHeading>
                        <button
                            type="button"
                            onClick={addBrandItem}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:text-white"
                        >
                            <Plus size={12} weight="bold" />
                            Agregar marca
                        </button>
                    </div>
                    <div className="space-y-3">
                        {brandMarqueeItems.map((item, index) => (
                            <div key={item.id || `brand-item-${index}`} className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                                        Marca {index + 1}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => removeBrandItem(index)}
                                        disabled={brandMarqueeItems.length <= 1}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 disabled:opacity-40"
                                    >
                                        <Trash size={12} weight="bold" />
                                        Eliminar
                                    </button>
                                </div>
    
                                <EvolutionInput
                                    label="Nombre"
                                    value={item?.name || ''}
                                    onChange={(event) => updateBrandItem(index, { name: event.target.value })}
                                    placeholder="Ej: Marca aliada"
                                />
                                <EvolutionInput
                                    label="URL del logo"
                                    value={item?.image || ''}
                                    onChange={(event) => updateBrandItem(index, { image: event.target.value })}
                                    placeholder="https://..."
                                />
                                <LinkInput
                                    label="Link opcional"
                                    value={item?.link || ''}
                                    onChange={(event) => updateBrandItem(index, { link: event.target.value })}
                                    placeholder="https://sitio-de-la-marca.com"
                                />
    
                                <div className="flex items-center gap-2">
                                    <UploadButton
                                        busy={uploadingTarget === `brand-marquee-${index}`}
                                        label="Subir logo"
                                        onChange={(event) =>
                                            handleImageUpload(`brand-marquee-${index}`, event, (value) =>
                                                updateBrandItem(index, { image: value })
                                            )
                                        }
                                    />
                                    {item?.image ? (
                                        <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white p-2">
                                            <img src={item.image} alt={item.name || 'Marca'} className="max-h-full w-full object-contain" />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
    
                <div className={panelClass}>
                    <SectionHeading icon={Palette}>Colores del bloque</SectionHeading>
                    <div className="grid grid-cols-1 gap-2">
                        <ColorField
                            label="Fondo seccion"
                            value={block.props?.styles?.backgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.backgroundColor}
                            onChange={(value) => handleStyleChange('backgroundColor', value)}
                        />
                        <ColorField
                            label="Fondo panel"
                            value={block.props?.styles?.panelBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.panelBackgroundColor}
                            onChange={(value) => handleStyleChange('panelBackgroundColor', value)}
                        />
                        <ColorField
                            label="Titulo"
                            value={block.props?.styles?.titleColor}
                            defaultColor={brandMarqueeDefaults.styles.titleColor}
                            onChange={(value) => handleStyleChange('titleColor', value)}
                        />
                        <ColorField
                            label="Subtitulo"
                            value={block.props?.styles?.subtitleColor}
                            defaultColor={brandMarqueeDefaults.styles.subtitleColor}
                            onChange={(value) => handleStyleChange('subtitleColor', value)}
                        />
                        <ColorField
                            label="Badge fondo"
                            value={block.props?.styles?.badgeBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.badgeBackgroundColor}
                            onChange={(value) => handleStyleChange('badgeBackgroundColor', value)}
                        />
                        <ColorField
                            label="Badge texto"
                            value={block.props?.styles?.badgeTextColor}
                            defaultColor={brandMarqueeDefaults.styles.badgeTextColor}
                            onChange={(value) => handleStyleChange('badgeTextColor', value)}
                        />
                        <ColorField
                            label="Card logo"
                            value={block.props?.styles?.cardBackgroundColor}
                            defaultColor={brandMarqueeDefaults.styles.cardBackgroundColor}
                            onChange={(value) => handleStyleChange('cardBackgroundColor', value)}
                        />
                        <ColorField
                            label="Borde logo"
                            value={block.props?.styles?.cardBorderColor}
                            defaultColor={brandMarqueeDefaults.styles.cardBorderColor}
                            onChange={(value) => handleStyleChange('cardBorderColor', value)}
                        />
                        <ColorField
                            label="Color acento"
                            value={block.props?.styles?.accentColor}
                            defaultColor="var(--color-primary, #f97316)"
                            onChange={(value) => handleStyleChange('accentColor', value)}
                        />
                    </div>
                </div>
            </>
        );
    };
}
