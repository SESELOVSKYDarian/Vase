import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../../utils/cn';
import { DotsSixVertical, Image as ImageIcon, Sparkle as Star } from '@phosphor-icons/react';

const SortableSection = ({ section, isSelected, onSelect, showPreview }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (!showPreview) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(section.id, 'block', section);
                }}
                className={cn(
                    'relative w-full border-b border-white/5 px-6 py-4 flex items-center justify-between group transition-all cursor-pointer',
                    isSelected && 'bg-white/5 border-evolution-indigo/50',
                    isDragging && 'opacity-50 z-50 bg-zinc-900 border-evolution-indigo shadow-2xl scale-[1.02]'
                )}
            >
                <div className="flex items-center gap-4">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white transition-colors"
                    >
                        <DotsSixVertical size={16} weight="bold" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white uppercase tracking-widest">{section.type}</p>
                        <p className="text-[10px] text-zinc-500">{section.props?.title || 'Sin titulo'}</p>
                    </div>
                </div>
                {!section.enabled && <span className="text-[9px] font-bold text-zinc-600 uppercase">Oculto</span>}
            </div>
        );
    }

    const renderStub = () => {
        switch (section.type) {
            case 'HeroSlider':
            case 'FashionHeroSlider':
                return (
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-100">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center" />
                        <div className="z-10 space-y-4 px-10 text-center">
                            <h2 className="text-3xl font-black leading-tight tracking-tighter text-zinc-900 uppercase">
                                {section.props?.title || 'LANZAMIENTO 2026'}
                            </h2>
                            <p className="mx-auto max-w-md text-sm font-medium text-zinc-600">
                                {section.props?.subtitle || 'Presenta tu propuesta principal con un mensaje claro y adaptable.'}
                            </p>
                            <div className="pt-2">
                                <span className="rounded-full bg-zinc-900 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white">
                                    Ver mas
                                </span>
                            </div>
                        </div>
                    </div>
                );
            case 'FeaturedProducts':
            case 'FeaturedProductsLuxury':
                return (
                    <div className="h-full w-full bg-white p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">
                                {section.props?.title || 'Destacados'}
                            </h3>
                            <span className="text-[10px] font-bold uppercase text-zinc-400">Ver todo</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-3">
                                    <div className="aspect-square rounded-lg border border-zinc-100 bg-zinc-50 flex items-center justify-center italic text-[10px] text-zinc-300">
                                        Producto {i}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 w-full rounded bg-zinc-100" />
                                        <div className="h-2 w-1/2 rounded bg-zinc-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'Services':
                return (
                    <div className="flex h-full w-full items-center justify-around border-y border-white/5 bg-zinc-950 p-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-3 text-center">
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-evolution-indigo">
                                    <Star size={20} weight="bold" />
                                </div>
                                <div className="space-y-1">
                                    <div className="mx-auto h-1.5 w-16 rounded bg-white/20" />
                                    <div className="mx-auto h-1 w-12 rounded bg-white/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            default:
                return (
                    <div className="flex h-full flex-col justify-center space-y-2 border-b border-zinc-100 bg-white p-8 text-center">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-300">
                            <ImageIcon size={20} weight="bold" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900">{section.type}</h4>
                        <p className="text-[10px] font-medium italic text-zinc-400">
                            {section.props?.title || 'Bloque sin configuracion visual'}
                        </p>
                    </div>
                );
        }
    };

    return (
        <div
            ref={setNodeRef}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(section.id, 'block', section);
            }}
            className={cn(
                'relative w-full border-2 border-transparent cursor-pointer transition-all group/section hover:border-evolution-indigo/40',
                isSelected && 'border-evolution-indigo ring-1 ring-evolution-indigo/20 shadow-glow z-30',
                !section.enabled && 'opacity-40 grayscale-[0.5]',
                isDragging && 'opacity-20 z-50'
            )}
            style={{
                ...style,
                height: ['HeroSlider', 'FashionHeroSlider'].includes(section.type) ? '380px' : 'auto',
                minHeight: '120px',
            }}
        >
            <div
                {...attributes}
                {...listeners}
                className="absolute top-4 left-4 z-40 rounded-xl border border-white/10 bg-zinc-dark/90 p-2 text-white opacity-0 shadow-2xl transition-opacity cursor-grab active:cursor-grabbing group-hover/section:opacity-100"
            >
                <DotsSixVertical size={16} weight="bold" />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center opacity-0 transition-opacity group-hover/section:opacity-100">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-dark/90 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-2xl backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-evolution-indigo animate-pulse" />
                    {section.type}
                </div>
            </div>

            <div className="pointer-events-none h-full overflow-hidden">
                {renderStub()}
            </div>
        </div>
    );
};

export default SortableSection;
