import React, { useMemo, useState } from 'react';
import PageBuilder from '../../PageBuilder';
import useEvolutionStore from '../../../store/useEvolutionStore';
import {
    DEFAULT_ABOUT_SECTIONS,
    DEFAULT_HOME_SECTIONS,
    PIQUIM_ABOUT_SECTIONS,
    PIQUIM_HOME_SECTIONS,
} from '../../../data/defaultSections';
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
    { type: 'HeroSlider', label: 'Banner Principal' },
    { type: 'BrandMarquee', label: 'Marcas en Movimiento' },
    { type: 'FeaturedProducts', label: 'Productos Destacados' },
    { type: 'Services', label: 'Servicios / Beneficios' },
];

const PIQUIM_HOME_SECTION_TYPES = [
    { type: 'PiquimHero', label: 'Portada video' },
    { type: 'PiquimAnnounceBar', label: 'Barra Anuncio' },
    { type: 'PiquimTresMundos', label: 'Bloque destacado' },
    { type: 'PiquimCatalog3Panel', label: 'Catalogo 3 paneles' },
    { type: 'PiquimFeaturedProducts', label: 'Productos destacados' },
    { type: 'PiquimCTABanner', label: 'Llamado a la accion' },
];

const PIQUIM_ABOUT_SECTION_TYPES = [
    { type: 'PiquimHero', label: 'Portada video' },
    { type: 'PiquimAnnounceBar', label: 'Barra Anuncio' },
    { type: 'PiquimTresMundos', label: 'Bloque destacado' },
    { type: 'PiquimCatalog3Panel', label: 'Lineas de negocio' },
    { type: 'PiquimCTABanner', label: 'Llamado a la accion' },
];

const ABOUT_SECTION_TYPES = [
    { type: 'AboutHero', label: 'Portada Sobre Nosotros' },
    { type: 'AboutMission', label: 'Mision' },
    { type: 'AboutStats', label: 'Numeros' },
    { type: 'AboutValues', label: 'Valores' },
    { type: 'AboutTeam', label: 'Equipo' },
    { type: 'AboutCTA', label: 'Llamada a la Accion' },
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
    const pool = pageKey === 'about'
        ? DEFAULT_ABOUT_SECTIONS
        : pageKey === 'piquim-about'
            ? PIQUIM_ABOUT_SECTIONS
        : pageKey === 'piquim-home'
            ? PIQUIM_HOME_SECTIONS
            : DEFAULT_HOME_SECTIONS;
    const found = pool.find((item) => item.type === type);
    return found || null;
};

const getSectionTypeOptions = (pageKey) => (
    pageKey === 'about'
        ? ABOUT_SECTION_TYPES
        : pageKey === 'piquim-about'
            ? PIQUIM_ABOUT_SECTION_TYPES
        : pageKey === 'piquim-home'
            ? PIQUIM_HOME_SECTION_TYPES
            : HOME_SECTION_TYPES
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
    const [draggedIndex, setDraggedIndex] = useState(null);
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
                    const isFeaturedProducts =
                        section.type === 'FeaturedProducts' || section.type === 'PiquimFeaturedProducts';

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

    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDrop = (index) => {
        if (draggedIndex === null || draggedIndex === index) return;
        setSections((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDraggedIndex(null);
    };

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="admin-workspace-card custom-scrollbar max-h-[calc(100dvh-8.5rem)] overflow-auto rounded-[18px] p-3 2xl:max-h-none">
                <div className="mb-3 flex items-start justify-between gap-2.5">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--admin-muted-soft)]">
                            {pageKey === 'about'
                                ? 'Sobre Nosotros'
                                : pageKey === 'piquim-about'
                                    ? 'Nosotros'
                                : pageKey === 'piquim-home'
                                    ? 'Inicio'
                                    : 'Inicio'}
                        </p>
                        <h2 className="mt-0.5 text-base font-semibold tracking-tight admin-text-primary">Bloques</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="admin-accent-button inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FloppyDisk size={14} weight="bold" />
                        {isSaving ? 'Guardando' : 'Guardar'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => setShowAdd((prev) => !prev)}
                    className="mb-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent)]"
                >
                    <Plus size={14} weight="bold" />
                    Anadir bloque
                </button>

                {showAdd ? (
                    <div className="mb-3 grid grid-cols-1 gap-1.5 rounded-2xl border border-[var(--admin-border-soft)] bg-[var(--admin-hover)] p-2.5">
                        {sectionTypes.map((item) => (
                            <button
                                key={item.type}
                                type="button"
                                onClick={() => handleAddSection(item.type)}
                                className="rounded-lg border border-[var(--admin-border-soft)] bg-[var(--admin-surface)] px-2.5 py-2 text-left text-[11px] font-semibold admin-text-primary hover:border-[var(--admin-accent-border)] hover:bg-[var(--admin-accent-soft)]"
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
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleDrop(idx)}
                                onDragEnd={() => setDraggedIndex(null)}
                                className={cn(
                                    'rounded-xl border p-2.5 transition-all',
                                    isSelected
                                        ? 'border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)]'
                                        : 'border-[var(--admin-border-soft)] bg-[var(--admin-surface)] hover:border-[var(--admin-border)]',
                                    draggedIndex === idx ? 'opacity-50' : ''
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleSelectSection(section)}
                                    className="w-full text-left"
                                >
                                    <p className="truncate text-[11px] font-bold uppercase tracking-wider admin-text-primary">
                                        {getSectionTitle(section.type)}
                                    </p>
                                    <p className="mt-0.5 text-[10px] admin-text-muted">
                                        {section.enabled !== false ? 'Visible' : 'Oculto'}
                                    </p>
                                </button>

                                <div className="mt-2 flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, -1)}
                                            disabled={idx === 0}
                                            className="rounded-lg border border-[var(--admin-border-soft)] bg-[var(--admin-hover)] p-1.5 admin-text-muted disabled:opacity-40"
                                            title="Subir"
                                        >
                                            <ArrowUp size={12} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSection(idx, 1)}
                                            disabled={idx === sections.length - 1}
                                            className="rounded-lg border border-[var(--admin-border-soft)] bg-[var(--admin-hover)] p-1.5 admin-text-muted disabled:opacity-40"
                                            title="Bajar"
                                        >
                                            <ArrowDown size={12} weight="bold" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleEnabled(idx)}
                                            className="rounded-lg border border-[var(--admin-border-soft)] bg-[var(--admin-hover)] p-1.5 admin-text-muted"
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
                                        className="rounded-lg border border-[color-mix(in_srgb,var(--admin-danger)_32%,var(--admin-border-soft))] bg-[color-mix(in_srgb,var(--admin-danger)_12%,transparent)] p-1.5 text-[var(--admin-danger)]"
                                        title="Eliminar"
                                    >
                                        <Trash size={12} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!sections.length ? (
                        <p className="rounded-[18px] border border-dashed border-[var(--admin-border)] p-4 text-center text-xs admin-text-muted">
                            Todavia no hay bloques.
                        </p>
                    ) : null}
                </div>
            </aside>

            <section className="storefront-preview-root custom-scrollbar max-h-[calc(100dvh-8.5rem)] overflow-auto rounded-[18px] border border-[var(--admin-border-soft)] bg-white p-1.5 shadow-[var(--admin-shadow-soft)] 2xl:max-h-full 2xl:p-0">
                <PageBuilder sections={previewSections} />
            </section>
        </div>
    );
};

export default PageSectionsEditor;
