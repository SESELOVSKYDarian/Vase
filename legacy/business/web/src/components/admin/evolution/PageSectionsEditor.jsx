import React, { useMemo, useState } from 'react';
import PageBuilder from '../../PageBuilder';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { DEFAULT_ABOUT_SECTIONS, DEFAULT_HOME_SECTIONS } from '../../../data/defaultSections';
import { cn } from '../../../utils/cn';
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../../utils/productImage';
import {
    Eye,
    EyeSlash,
    ArrowUp,
    ArrowDown,
    Plus,
    Trash,
    FloppyDisk,
} from '@phosphor-icons/react';

const HOME_SECTION_TYPES = [
    { type: 'HeroSlider', label: 'Hero Slider' },
    { type: 'BrandMarquee', label: 'Marcas en movimiento' },
    { type: 'FeaturedProducts', label: 'Productos Destacados' },
    { type: 'Services', label: 'Servicios / Beneficios' },
];

const ABOUT_SECTION_TYPES = [
    { type: 'AboutHero', label: 'Hero Sobre Nosotros' },
    { type: 'AboutMission', label: 'Mision' },
    { type: 'AboutStats', label: 'Numeros' },
    { type: 'AboutValues', label: 'Valores' },
    { type: 'AboutTeam', label: 'Equipo' },
    { type: 'AboutCTA', label: 'CTA' },
];

const createLocalId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const deepClone = (value) => {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
};

const getSectionTemplate = (pageKey, type) => {
    const pool = pageKey === 'about' ? DEFAULT_ABOUT_SECTIONS : DEFAULT_HOME_SECTIONS;
    const found = pool.find((item) => item.type === type);
    return found || null;
};

const getSectionTypeOptions = (pageKey) => (
    pageKey === 'about' ? ABOUT_SECTION_TYPES : HOME_SECTION_TYPES
);

const getSectionTitle = (type = '') =>
    String(type).replace(/([A-Z])/g, ' $1').trim();

const buildPreviewProduct = (product = {}) => {
    const dataImages = Array.isArray(product?.data?.images) ? product.data.images : [];
    const directImages = Array.isArray(product?.images) ? product.images : [];
    const imagePool = [...dataImages, ...directImages];
    const primaryImage = imagePool.find((item) => item && typeof item === 'object' && item.primary);
    const firstImage = primaryImage || imagePool[0] || product?.data?.image || product?.image || '';
    const image = typeof firstImage === 'string'
        ? firstImage
        : (firstImage?.url || firstImage?.src || '');

    return {
        id: product?.id,
        sku: product?.sku || product?.erp_id || '',
        name: product?.name || 'Producto',
        price: Number(product?.price || 0),
        image: image || PRODUCT_PLACEHOLDER_IMAGE,
        alt: product?.name || 'Producto',
        stock: Number(product?.stock ?? 0),
        is_featured: Boolean(product?.is_featured),
    };
};

const PageSectionsEditor = ({
    pageKey = 'home',
    sections = [],
    products = [],
    onChangeSections,
    onSave,
    isSaving,
}) => {
    const [showAdd, setShowAdd] = useState(false);
    const { selectItem, selectedId } = useEvolutionStore();
    const sectionTypes = getSectionTypeOptions(pageKey);

    const featuredPreviewProducts = useMemo(
        () =>
            (Array.isArray(products) ? products : [])
                .filter((item) => Boolean(item?.is_featured))
                .slice(0, 8)
                .map(buildPreviewProduct),
        [products]
    );

    const handleUpdateOffset = (sectionId, type, name, x, y) => {
        setSections((prev) =>
            prev.map((s) => {
                if (s.id !== sectionId) return s;
                const fieldX = type === 'part' ? `${name}OffsetX` : 'buttonsOffsetX';
                const fieldY = type === 'part' ? `${name}OffsetY` : 'buttonsOffsetY';
                return {
                    ...s,
                    props: {
                        ...(s.props || {}),
                        styles: {
                            ...(s.props?.styles || {}),
                            [fieldX]: x,
                            [fieldY]: y,
                        },
                    },
                };
            })
        );
    };

    const previewSections = useMemo(
        () =>
            (Array.isArray(sections) ? sections : [])
                .filter((section) => section?.enabled !== false)
                .map((section) => {
                    const baseProps = section.props || {};
                    const isFeaturedProducts = section.type === 'FeaturedProducts';

                    return {
                        ...section,
                        props: {
                            ...baseProps,
                            ...(isFeaturedProducts ? { products: featuredPreviewProducts } : {}),
                            editor: {
                                enabled: true,
                                onTextPartOffsetChange: (partName, x, y) =>
                                    handleUpdateOffset(section.id, 'part', partName, x, y),
                                onButtonsOffsetChange: (x, y) =>
                                    handleUpdateOffset(section.id, 'buttons', null, x, y),
                            },
                        },
                    };
                }),
        [featuredPreviewProducts, sections]
    );

    const setSections = (updater) => {
        const current = Array.isArray(sections) ? sections : [];
        const next = typeof updater === 'function' ? updater(current) : updater;
        onChangeSections(next);
    };

    const handleAddSection = (type) => {
        const template = getSectionTemplate(pageKey, type);
        const nextSection = template
            ? { ...deepClone(template), id: createLocalId(), enabled: true }
            : { id: createLocalId(), type, enabled: true, props: { styles: {} } };

        setSections((prev) => [...prev, nextSection]);
        setShowAdd(false);
        selectItem(nextSection.id, 'block', nextSection);
    };

    const handleDeleteSection = (index) => {
        const current = Array.isArray(sections) ? sections : [];
        const target = current[index];
        if (!target) return;
        if (!window.confirm(`Eliminar la seccion ${getSectionTitle(target.type)}?`)) return;

        setSections((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleToggleEnabled = (index) => {
        setSections((prev) => {
            if (!prev[index]) return prev;
            const next = [...prev];
            next[index] = { ...next[index], enabled: !next[index].enabled };
            return next;
        });
    };

    const handleMoveSection = (index, direction) => {
        setSections((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const temp = next[index];
            next[index] = next[target];
            next[target] = temp;
            return next;
        });
    };

    const handleSelectSection = (section) => {
        if (!section?.id) return;
        selectItem(section.id, 'block', section);
    };

    return (
        <div className="grid h-full grid-cols-1 gap-2 md:gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="overflow-auto rounded-xl md:rounded-2xl border border-white/10 bg-zinc-dark/50 p-2 md:p-4 custom-scrollbar">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                            {pageKey === 'about' ? 'Sobre Nosotros' : 'Inicio'}
                        </p>
                        <h2 className="text-xl font-bold text-white">Bloques</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 rounded-lg bg-evolution-indigo px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                    >
                        <FloppyDisk size={14} weight="bold" />
                        {isSaving ? 'Guardando' : 'Guardar'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAdd((prev) => !prev)}
                    className="mb-3 inline-flex items-center gap-2 rounded-xl border border-evolution-indigo/40 bg-evolution-indigo/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-indigo-200"
                >
                    <Plus size={14} weight="bold" />
                    Anadir bloque
                </button>

                {showAdd ? (
                    <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                        {sectionTypes.map((item) => (
                            <button
                                key={item.type}
                                type="button"
                                onClick={() => handleAddSection(item.type)}
                                className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-left text-xs font-bold text-zinc-200 hover:border-evolution-indigo/50 hover:bg-evolution-indigo/10"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="space-y-2">
                    {(Array.isArray(sections) ? sections : []).map((section, idx) => {
                        const isSelected = selectedId === section.id;
                        return (
                            <div
                                key={section.id || idx}
                                className={cn(
                                    'rounded-xl border p-3 transition-all',
                                    isSelected
                                        ? 'border-evolution-indigo/50 bg-evolution-indigo/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectSection(section)}
                                    className="w-full text-left"
                                >
                                    <p className="truncate text-xs font-bold uppercase tracking-wider text-white">
                                        {getSectionTitle(section.type)}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                        {section.enabled !== false ? 'Visible' : 'Oculto'}
                                    </p>
                                </button>

                                <div className="mt-3 flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, -1)}
                                            disabled={idx === 0}
                                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300 disabled:opacity-40"
                                            title="Subir"
                                        >
                                            <ArrowUp size={12} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, 1)}
                                            disabled={idx === sections.length - 1}
                                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300 disabled:opacity-40"
                                            title="Bajar"
                                        >
                                            <ArrowDown size={12} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleEnabled(idx)}
                                            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300"
                                            title="Mostrar / Ocultar"
                                        >
                                            {section.enabled !== false ? (
                                                <Eye size={12} weight="bold" />
                                            ) : (
                                                <EyeSlash size={12} weight="bold" />
                                            )}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteSection(idx)}
                                        className="rounded-md border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300"
                                        title="Eliminar"
                                    >
                                        <Trash size={12} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!sections.length ? (
                        <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-zinc-500">
                            Todavia no hay bloques.
                        </p>
                    ) : null}
                </div>
            </aside>

            <section className="overflow-auto rounded-xl md:rounded-2xl border border-white/10 bg-white custom-scrollbar p-2 md:p-0 max-h-[50vh] lg:max-h-full">
                <PageBuilder sections={previewSections} />
            </section>
        </div>
    );
};

export default PageSectionsEditor;
