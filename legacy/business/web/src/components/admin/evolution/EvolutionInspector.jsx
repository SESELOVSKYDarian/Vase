import React from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import BlockPropertiesEditor from './BlockPropertiesEditor';
import ProductPropertiesEditor from './ProductPropertiesEditor';
import MediaPropertiesEditor from './MediaPropertiesEditor';
import EvolutionInput from './EvolutionInput';
import CatalogInspectorPanel from './CatalogInspectorPanel';
import UsersInspectorPanel from './UsersInspectorPanel';
import { cn } from '../../../utils/cn';
import { X, Sliders as Settings2, Info, FloppyDisk as Save } from '@phosphor-icons/react';

const EvolutionInspector = ({ onDataChange, onSave, isSaving, catalogContext, usersManager, categories, brands }) => {
    const {
        isInspectorOpen,
        toggleInspector,
        selectionType,
        selectionData,
        selectedId,
        activeModule,
    } = useEvolutionStore();

    const hideFooterModules = ['catalog', 'categories', 'pricing', 'checkout', 'users', 'customers', 'tenants', 'notifications'];
    const allowSaveWithoutSelectionModules = ['design_live', 'settings_live'];
    const isWideInspector = activeModule === 'catalog' || activeModule === 'users';

    if (!isInspectorOpen) return null;

    return (
        <aside
            className={cn(
                'admin-panel-surface z-50 flex h-screen shrink-0 flex-col border-l transition-all duration-300 ease-in-out',
                isWideInspector ? 'w-[460px] xl:w-[540px]' : 'w-[320px] lg:w-[360px]',
                !isInspectorOpen && 'w-0 overflow-hidden border-none'
            )}
        >
            <div className="admin-header-surface sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Settings2 size={16} weight="bold" className="admin-text-muted" />
                    <span className="text-[13px] font-medium uppercase tracking-wide admin-text-primary">
                        Inspector
                    </span>
                </div>
                <button
                    onClick={toggleInspector}
                    className="admin-hover-surface flex h-6 w-6 items-center justify-center rounded admin-text-muted"
                >
                    <X size={16} weight="bold" />
                </button>
            </div>

            <div
                className={cn(
                    'flex-1 space-y-8 p-6 animate-in fade-in duration-300',
                    isWideInspector ? 'overflow-y-auto no-scrollbar' : 'overflow-auto custom-scrollbar'
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
                            <h2 className="text-lg font-semibold tracking-tight admin-text-primary">
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
                                    className="space-y-3 rounded-xl border p-4"
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
                                className="space-y-3 rounded-xl border p-4"
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
                <div className="admin-header-surface mt-auto border-t p-4 backdrop-blur-md">
                    <button
                        onClick={onSave}
                        disabled={(!selectedId && !allowSaveWithoutSelectionModules.includes(activeModule)) || isSaving}
                        style={{
                            backgroundColor: 'var(--admin-accent)',
                            color: 'var(--admin-accent-contrast)',
                            boxShadow: '0 0 24px var(--admin-shadow)',
                        }}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={18} weight="bold" className={cn(isSaving && 'animate-spin')} />
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default EvolutionInspector;
