import React, { useEffect } from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import BlockPropertiesEditor from './BlockPropertiesEditor';
import ProductPropertiesEditor from './ProductPropertiesEditor';
import MediaPropertiesEditor from './MediaPropertiesEditor';
import EvolutionInput from './EvolutionInput';
import CatalogInspectorPanel from './CatalogInspectorPanel';
import UsersInspectorPanel from './UsersInspectorPanel';
import { cn } from '../../../utils/cn';
import { X, Sliders as Settings2, Info, FloppyDisk as Save, ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react';

const EvolutionInspector = ({
    onDataChange,
    onSave,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    isSaving,
    catalogContext,
    usersManager,
    categories,
    brands,
}) => {
    const {
        isInspectorOpen,
        toggleInspector,
        selectionType,
        selectionData,
        selectedId,
        activeModule,
        setInspectorOpen,
    } = useEvolutionStore();

    const hideFooterModules = ['catalog', 'categories', 'pricing', 'checkout', 'users', 'customers', 'tenants', 'notifications'];
    const allowSaveWithoutSelectionModules = ['design_live', 'settings_live', 'shipping', 'checkout'];
    const isWideInspector = activeModule === 'catalog' || activeModule === 'users';

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const compactQuery = window.matchMedia('(max-width: 1535px)');
        const closeEmptyCompactInspector = () => {
            if (compactQuery.matches && !selectedId) {
                setInspectorOpen(false);
            }
        };

        closeEmptyCompactInspector();
        compactQuery.addEventListener?.('change', closeEmptyCompactInspector);

        return () => {
            compactQuery.removeEventListener?.('change', closeEmptyCompactInspector);
        };
    }, [activeModule, selectedId, setInspectorOpen]);

    if (!isInspectorOpen) return null;

    return (
        <>
        <button
            type="button"
            aria-label="Cerrar inspector"
            onClick={toggleInspector}
            className="fixed inset-0 z-[75] bg-slate-950/30 backdrop-blur-sm 2xl:hidden"
        />
        <aside
            className={cn(
                'admin-panel-surface fixed inset-y-0 right-0 z-[80] flex h-[100dvh] max-w-full shrink-0 flex-col border-l shadow-2xl transition-all duration-300 ease-in-out 2xl:relative 2xl:z-50 2xl:shadow-none',
                isWideInspector ? 'w-[min(100vw,360px)] 2xl:w-[400px]' : 'w-[min(100vw,304px)] 2xl:w-[328px]',
                !isInspectorOpen && 'w-0 overflow-hidden border-none'
            )}
        >
            <div className="admin-header-surface sticky top-0 z-10 flex min-h-14 items-center justify-between border-b px-3 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                        <Settings2 size={15} weight="bold" />
                    </span>
                    <span className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] admin-text-primary">
                        Inspector
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="admin-hover-surface flex h-8 w-8 items-center justify-center rounded-lg admin-text-muted disabled:cursor-not-allowed disabled:opacity-40"
                        title="Deshacer"
                    >
                        <ArrowCounterClockwise size={14} weight="bold" />
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="admin-hover-surface flex h-8 w-8 items-center justify-center rounded-lg admin-text-muted disabled:cursor-not-allowed disabled:opacity-40"
                        title="Rehacer"
                    >
                        <ArrowClockwise size={14} weight="bold" />
                    </button>
                    <button
                        onClick={toggleInspector}
                        className="admin-hover-surface flex h-8 w-8 items-center justify-center rounded-lg admin-text-muted"
                    >
                        <X size={16} weight="bold" />
                    </button>
                </div>
            </div>

            <div
                className={cn(
                    'flex-1 space-y-5 p-4 animate-in fade-in duration-300',
                    isWideInspector ? 'overflow-y-auto custom-scrollbar' : 'overflow-auto custom-scrollbar'
                )}
            >
                {activeModule === 'catalog' ? (
                    <CatalogInspectorPanel
                        catalog={catalogContext}
                        categories={categories}
                        brands={brands}
                    />
                ) : null}

                {activeModule === 'users' ? (
                    <UsersInspectorPanel manager={usersManager} />
                ) : null}

                {activeModule !== 'catalog' && activeModule !== 'users' && selectedId ? (
                    <>
                        <div className="space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-widest admin-accent-text">
                                {selectionType || 'Elemento'}
                            </div>
                            <h2 className="text-base font-semibold tracking-tight admin-text-primary">
                                {selectionData?.name || selectionData?.label || selectionData?.type || 'Sin nombre'}
                            </h2>
                        </div>

                        {selectionType === 'block' ? (
                            <BlockPropertiesEditor
                                block={selectionData}
                                onChange={(nextData) => onDataChange(selectedId, nextData)}
                            />
                        ) : null}

                        {selectionType === 'product' && activeModule !== 'catalog' ? (
                            <ProductPropertiesEditor
                                product={selectionData}
                                onChange={(nextData) => onDataChange(selectedId, nextData)}
                            />
                        ) : null}

                        {selectionType === 'media' ? (
                            <MediaPropertiesEditor item={selectionData} />
                        ) : null}

                        {['category', 'brand'].includes(selectionType) ? (
                            <div className="space-y-4">
                                <EvolutionInput
                                    label="Nombre"
                                    value={selectionData?.name || ''}
                                    onChange={(event) => onDataChange(selectedId, { ...selectionData, name: event.target.value })}
                                />
                                <div
                                    className="space-y-2.5 rounded-xl border p-3"
                                    style={{
                                        backgroundColor: 'var(--admin-hover)',
                                        borderColor: 'var(--admin-border-soft)',
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-[11px] font-medium admin-text-muted">
                                        <Info size={14} weight="bold" />
                                        <span>Nota</span>
                                    </div>
                                    <p className="text-[12px] italic leading-relaxed text-zinc-500">
                                        Editor simplificado activo. Mas propiedades estaran disponibles pronto.
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {!['block', 'product', 'category', 'brand', 'media'].includes(selectionType) ? (
                            <div
                                className="space-y-2.5 rounded-xl border p-3"
                                style={{
                                    backgroundColor: 'var(--admin-hover)',
                                    borderColor: 'var(--admin-border-soft)',
                                }}
                            >
                                <div className="flex items-center gap-2 text-[11px] font-medium admin-text-muted">
                                    <Info size={14} weight="bold" />
                                    <span>Informacion</span>
                                </div>
                                <p className="text-[12px] italic leading-relaxed text-zinc-500">
                                    Este elemento no tiene propiedades editables actualmente.
                                </p>
                            </div>
                        ) : null}
                    </>
                ) : !['catalog', 'categories', 'pricing', 'checkout', 'users', 'customers', 'tenants', 'notifications'].includes(activeModule) ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-20 text-center opacity-30">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: 'var(--admin-hover)' }}
                        >
                            <Settings2 size={24} weight="bold" className="admin-text-muted" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[13px] font-medium admin-text-primary">Nada seleccionado</p>
                            <p className="max-w-[180px] text-[11px] leading-relaxed text-zinc-500">
                                Toca cualquier componente para ver sus propiedades.
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {hideFooterModules.includes(activeModule) ? null : (
                <div className="admin-header-surface mt-auto border-t p-3 backdrop-blur-md">
                    <button
                        onClick={onSave}
                        disabled={(!selectedId && !allowSaveWithoutSelectionModules.includes(activeModule)) || isSaving}
                        style={{
                            backgroundColor: 'var(--admin-accent)',
                            color: 'var(--admin-accent-contrast)',
                            boxShadow: '0 0 24px var(--admin-shadow)',
                        }}
                        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={18} weight="bold" className={cn(isSaving && 'animate-spin')} />
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            )}
        </aside>
        </>
    );
};

export default EvolutionInspector;
