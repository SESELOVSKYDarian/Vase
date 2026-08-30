import React, { useMemo, useState } from 'react';
import PageBuilder from '../../PageBuilder';
import ResponsivePreviewFrame from './ResponsivePreviewFrame';
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
    const {
        selectItem,
        selectedId,
        activeDockPanel,
        closeDockPanel,
        setActiveModule,
        previewViewport,
    } = useEvolutionStore();
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
        <div className="relative h-full min-h-0">
            {activeDockPanel ? (
                <button
                    type="button"
                    aria-label="Cerrar panel del editor"
                    onClick={closeDockPanel}
                    className="fixed inset-0 z-[54] bg-black/10"
                />
            ) : null}

            {activeDockPanel === 'pages' ? (
                <div className="admin-panel-surface fixed bottom-24 left-1/2 z-[60] w-[min(92vw,320px)] -translate-x-1/2 rounded-2xl border border-[var(--admin-border)] p-2.5 shadow-2xl">
                    <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] admin-text-muted">Páginas</p>
                    {[
                        { id: 'home', label: 'Inicio' },
                        { id: 'about', label: 'Sobre nosotros' },
                    ].map((page) => (
                        <button
                            key={page.id}
                            type="button"
                            onClick={() => { setActiveModule(page.id); closeDockPanel(); }}
                            className="admin-hover-surface flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-semibold admin-text-primary"
                        >
                            {page.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {activeDockPanel === 'add' ? (
                <div className="admin-panel-surface custom-scrollbar fixed bottom-24 left-1/2 z-[60] max-h-[55vh] w-[min(92vw,360px)] -translate-x-1/2 overflow-auto rounded-2xl border border-[var(--admin-border)] p-2.5 shadow-2xl">
                    <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] admin-text-muted">Añadir bloque</p>
                    <div className="grid gap-1.5">
                        {sectionTypes.map((item) => (
                            <button
                                key={item.type}
                                type="button"
                                onClick={() => { handleAddSection(item.type); closeDockPanel(); }}
                                className="admin-hover-surface min-h-10 rounded-xl border border-[var(--admin-border-soft)] px-3 text-left text-[12px] font-semibold admin-text-primary"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {activeDockPanel === 'blocks' ? (
                <aside className="admin-panel-surface custom-scrollbar fixed bottom-24 left-1/2 z-[60] max-h-[62vh] w-[min(94vw,390px)] -translate-x-1/2 overflow-auto rounded-2xl border border-[var(--admin-border)] p-3 shadow-2xl lg:left-24 lg:translate-x-0">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] admin-text-muted">Página actual</p>
                            <h2 className="text-sm font-semibold admin-text-primary">Bloques</h2>
                        </div>
                        <button type="button" onClick={onSave} disabled={isSaving} className="admin-accent-button flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold disabled:opacity-50">
                            <FloppyDisk size={14} weight="bold" />
                            {isSaving ? 'Guardando' : 'Guardar'}
                        </button>
                    </div>

                    <button type="button" onClick={() => setShowAdd((prev) => !prev)} className="mb-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] text-[11px] font-bold text-[var(--admin-accent)]">
                        <Plus size={14} weight="bold" />
                        Añadir bloque
                    </button>

                    {showAdd ? (
                        <div className="mb-2 grid gap-1 rounded-xl bg-[var(--admin-hover)] p-2">
                            {sectionTypes.map((item) => (
                                <button key={item.type} type="button" onClick={() => handleAddSection(item.type)} className="rounded-lg bg-[var(--admin-surface)] px-3 py-2 text-left text-[11px] font-semibold admin-text-primary">
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    <div className="space-y-1.5">
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
                                    className={cn('flex items-center gap-2 rounded-xl border p-2', isSelected ? 'border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)]' : 'border-[var(--admin-border-soft)] bg-[var(--admin-surface)]', draggedIndex === idx && 'opacity-50')}
                                >
                                    <button type="button" onClick={() => handleSelectSection(section)} className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-[11px] font-bold admin-text-primary">{getSectionTitle(section.type)}</p>
                                        <p className="text-[9px] admin-text-muted">{section.enabled !== false ? 'Visible' : 'Oculto'}</p>
                                    </button>
                                    <button type="button" onClick={() => handleMoveSection(idx, -1)} disabled={idx === 0} className="admin-hover-surface rounded-lg p-1.5 admin-text-muted disabled:opacity-30" title="Subir"><ArrowUp size={12} /></button>
                                    <button type="button" onClick={() => handleMoveSection(idx, 1)} disabled={idx === sections.length - 1} className="admin-hover-surface rounded-lg p-1.5 admin-text-muted disabled:opacity-30" title="Bajar"><ArrowDown size={12} /></button>
                                    <button type="button" onClick={() => handleToggleEnabled(idx)} className="admin-hover-surface rounded-lg p-1.5 admin-text-muted" title="Mostrar / Ocultar">{section.enabled !== false ? <Eye size={12} /> : <EyeSlash size={12} />}</button>
                                    <button type="button" onClick={() => handleDeleteSection(idx)} className="rounded-lg p-1.5 text-[var(--admin-danger)]" title="Eliminar"><Trash size={12} /></button>
                                </div>
                            );
                        })}
                        {!sections.length ? <p className="rounded-xl border border-dashed border-[var(--admin-border)] p-4 text-center text-xs admin-text-muted">Todavía no hay bloques.</p> : null}
                    </div>
                </aside>
            ) : null}

            <section className="storefront-preview-root h-full min-h-[520px] overflow-hidden rounded-[18px] border border-[var(--admin-border-soft)] bg-white shadow-[var(--admin-shadow-soft)]">
                <ResponsivePreviewFrame viewport={previewViewport}>
                    <PageBuilder sections={previewSections} />
                </ResponsivePreviewFrame>
            </section>
        </div>
    );
};

export default PageSectionsEditor;
