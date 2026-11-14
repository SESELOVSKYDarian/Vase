// Filtros del subcatálogo de Piquim: árbol de grupos, sabores y sugerencias.
import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownSmallIcon, CloseIcon, FilterDotIcon } from "./icons.jsx";

export function GroupedFilterTree({ title, groups, selectedGroups, onToggleGroup, selectedCategories, onToggleCategory, selectedFlavors, onToggleFlavor }) {
    const [expanded, setExpanded] = useState(() => {
        const initial = {};
        (Array.isArray(groups) ? groups : []).forEach((group) => {
            if (group?.title) initial[group.title] = false;
        });
        return initial;
    });
    const [activeFlavorGroup, setActiveFlavorGroup] = useState(null);

    if (!Array.isArray(groups) || !groups.length) return null;

    return (
        <div className="w-full pb-6">
            <div className="mb-3 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[var(--store-primary)]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[var(--store-primary)]">{title}</h3>
            </div>
            <div className="flex w-full flex-col gap-2">
                {groups.map((group) => {
                    const groupTitle = group.title;
                    const isExpanded = expanded[groupTitle] === true;
                    const categories = Array.isArray(group.categories) ? group.categories : [];
                    const flavors = Array.isArray(group.flavors) ? group.flavors : [];
                    const selectedFlavorCount = flavors.filter((flavor) => selectedFlavors.includes(flavor.name)).length;

                    return (
                        <div key={`filter-group-${groupTitle}`} className="rounded-xl border border-[var(--store-border)] bg-[var(--store-surface-soft)] p-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="inline-flex min-w-0 flex-1 items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.includes(groupTitle)}
                                        onChange={() => onToggleGroup(groupTitle)}
                                    />
                                    <span className="truncate text-sm font-semibold leading-5 text-[var(--store-text)]">{groupTitle}</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setExpanded((prev) => ({ ...prev, [groupTitle]: prev[groupTitle] === false }))}
                                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--store-surface-elevated)] text-[var(--store-primary)] transition-transform"
                                    aria-label={`${isExpanded ? 'Cerrar' : 'Abrir'} ${groupTitle}`}
                                    aria-expanded={isExpanded}
                                >
                                    <ChevronDownSmallIcon className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            {isExpanded && categories.length ? (
                                <div className="mt-2 flex flex-col gap-2 border-l border-[var(--store-border)] pl-5">
                                    {categories.map((category) => (
                                        <label key={`filter-category-${groupTitle}-${category.title}`} className="inline-flex w-full items-center justify-start gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(category.title)}
                                                onChange={() => onToggleCategory(category.title)}
                                            />
                                            <span className="text-sm font-normal leading-5 text-[var(--store-secondary)]">{category.title}</span>
                                        </label>
                                    ))}
                                    {flavors.length ? (
                                        <button
                                            type="button"
                                            onClick={() => setActiveFlavorGroup(group)}
                                            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-[#FF4D00] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#E04400]"
                                        >
                                            Ver sabores
                                            {selectedFlavorCount > 0 ? <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-[#FF4D00]">{selectedFlavorCount}</span> : null}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
            {activeFlavorGroup ? (
                <FlavorSelectionModal
                    group={activeFlavorGroup}
                    selectedFlavors={selectedFlavors}
                    onToggleFlavor={onToggleFlavor}
                    onClose={() => setActiveFlavorGroup(null)}
                />
            ) : null}
        </div>
    );
}

export function FlavorSelectionModal({ group, selectedFlavors, onToggleFlavor, onClose }) {
    const flavors = Array.isArray(group?.flavors) ? group.flavors : [];
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true" aria-label={`Seleccionar sabores de ${group?.title || ''}`}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-text)] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--store-border)] px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--store-primary)]">Selector profesional</p>
                        <h3 className="mt-1 text-3xl font-black text-[var(--store-text)]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                            {group?.title}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-[var(--store-surface-soft)] text-[var(--store-primary)] hover:bg-[var(--store-surface-elevated)]"
                        aria-label="Cerrar selector"
                    >
                        <CloseIcon className="size-5" />
                    </button>
                </div>
                <div className="custom-scrollbar grid gap-3 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {flavors.map((flavor) => {
                        const selected = selectedFlavors.includes(flavor.name);
                        return (
                            <button
                                key={`${group.title}-${flavor.name}`}
                                type="button"
                                onClick={() => onToggleFlavor(flavor.name)}
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                                    selected
                                        ? 'border-[var(--store-primary)] bg-[var(--store-surface-soft)] shadow-[0_10px_26px_rgba(255,77,0,0.14)]'
                                        : 'border-[var(--store-border)] bg-[var(--store-card-bg)] hover:border-[var(--store-primary)]'
                                }`}
                            >
                                <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: flavor.color || '#E8DFD8' }} />
                                <span className="min-w-0 flex-1 text-sm font-bold text-[var(--store-text)]">{flavor.name}</span>
                                {selected ? <CheckIcon className="size-4 shrink-0 text-[#FF4D00]" /> : null}
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--store-border)] px-6 py-4">
                    <p className="text-xs font-semibold text-[var(--store-muted-text)]">
                        {selectedFlavors.length} {selectedFlavors.length === 1 ? 'sabor seleccionado' : 'sabores seleccionados'}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-[#FF4D00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E04400]"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function SuggestionGroup({ title, items, onPick }) {
    if (!items?.length) return null;
    return (
        <div className="w-full pb-4">
            <div className="mb-2 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[var(--store-primary)]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[var(--store-primary)]">{title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <button
                        key={`${title}-${item}`}
                        type="button"
                        onClick={() => onPick(item)}
                        className="rounded-full border border-[var(--store-border)] bg-[var(--store-surface-soft)] px-2.5 py-1 text-xs text-[var(--store-secondary)] hover:border-[var(--store-primary)] hover:text-[var(--store-text)]"
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function FilterGroup({ title, options, selected, onToggle }) {
    if (!options?.length) return null;
    return (
        <div className="w-full pb-6">
            <div className="mb-3 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[var(--store-primary)]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[var(--store-primary)]">{title}</h3>
            </div>
            <div className="flex w-full flex-col items-start justify-start gap-2">
                {options.map((item) => (
                    <label key={`${title}-${item}`} className="inline-flex w-full items-center justify-start gap-2">
                        <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} />
                        <span className="text-sm font-normal leading-5 text-[var(--store-secondary)]">{item}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
