// Editor de un bloque: visible en la tienda, plantilla y los campos de ese bloque.
import { Eye } from '@phosphor-icons/react';
import { EyeSlash as EyeOff } from '@phosphor-icons/react';
import { FEATURED_EXAMPLE_BY_VARIANT } from './SlideCard.jsx';
import { FEATURED_VARIANT_OPTIONS } from '../../../../data/featuredProductsTemplates';
import { HERO_EXAMPLE_BY_VARIANT } from './SlideCard.jsx';
import { HERO_VARIANT_OPTIONS } from '../../../../data/heroSliderTemplates';
import { Layout } from '@phosphor-icons/react';
import { SectionHeading } from './SlideCard.jsx';
import { cn } from '../../../../utils/cn';
import { panelClass } from './SlideCard.jsx';
import { selectFieldClass } from './SlideCard.jsx';

export default function BlockEditorBody({ block, featuredVariant, handleFeaturedVariantChange, handleHeroVariantChange, heroVariant, isFeaturedBlock, isHeroBlock, onChange, renderBlockEditor }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2">
                    {block.enabled ? (
                        <Eye size={16} weight="bold" className="text-emerald-500" />
                    ) : (
                        <EyeOff size={16} weight="bold" className="text-zinc-500" />
                    )}
                    <span className="text-xs font-medium text-white">Visible en la tienda</span>
                </div>
                <button
                    onClick={() => onChange({ ...block, enabled: !block.enabled })}
                    className={cn(
                        'relative h-5 w-10 rounded-full transition-all',
                        block.enabled ? 'bg-evolution-indigo' : 'bg-zinc-700'
                    )}
                >
                    <div
                        className={cn(
                            'absolute top-1 h-3 w-3 rounded-full bg-white transition-all',
                            block.enabled ? 'left-6' : 'left-1'
                        )}
                    />
                </button>
            </div>

            {(isHeroBlock || isFeaturedBlock) ? (
                <div className={panelClass}>
                    <SectionHeading icon={Layout}>Plantilla</SectionHeading>

                    {isHeroBlock ? (
                        <>
                            <select
                                value={heroVariant}
                                onChange={(event) => handleHeroVariantChange(event.target.value)}
                                className={selectFieldClass}
                            >
                                {HERO_VARIANT_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value} className="bg-zinc-900">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-zinc-400">
                                Ejemplo activo: {HERO_EXAMPLE_BY_VARIANT[heroVariant] || 'Hero'}
                            </p>
                        </>
                    ) : null}

                    {isFeaturedBlock ? (
                        <>
                            <select
                                value={featuredVariant}
                                onChange={(event) => handleFeaturedVariantChange(event.target.value)}
                                className={selectFieldClass}
                            >
                                {FEATURED_VARIANT_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value} className="bg-zinc-900">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-zinc-400">
                                Ejemplo activo: {FEATURED_EXAMPLE_BY_VARIANT[featuredVariant] || 'Destacados'}
                            </p>
                        </>
                    ) : null}
                </div>
            ) : null}

            {renderBlockEditor()}
        </div>
    );
}
