// Barra lateral del subcatálogo de Piquim y su estado de carga.
import { useState } from "react";
import { FilterGroup, GroupedFilterTree, SuggestionGroup } from "./PiquimFilters.jsx";
import { ChevronDownSmallIcon, SearchIcon } from "./icons.jsx";

export function PiquimProductsLoadingState() {
    return (
        <div className="w-full" role="status" aria-live="polite">
            <p className="mb-4 text-sm font-semibold text-[var(--store-primary)]">Cargando productos...</p>
            <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(282px,1fr))] gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`piquim-loading-${index}`} className="h-[390px] animate-pulse rounded-3xl border border-[var(--store-border)] bg-[var(--store-card-bg)]">
                        <div className="h-64 rounded-t-3xl bg-[var(--store-surface-soft)]" />
                        <div className="space-y-3 p-5">
                            <div className="h-4 w-2/3 rounded bg-[var(--store-surface-soft)]" />
                            <div className="h-3 w-1/2 rounded bg-[var(--store-surface-soft)]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PiquimSubcatalogSidebar({
    catalog,
    labels,
    query,
    onQueryChange,
    onSearchCommit,
    trendingSuggestions,
    productSuggestions,
    onSuggestionPick,
    availableTypes,
    selectedTypes,
    onToggleType,
    availableFormats,
    selectedFormats,
    onToggleFormat,
    selectedFlavors,
    onToggleFlavor,
    stockOnly,
    onStockChange,
    resultCount = 0,
}) {
    // En el celular el panel arranca cerrado: ocupaba una pantalla entera antes de ver un solo producto.
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeFilterCount =
        selectedTypes.length + selectedFormats.length + selectedFlavors.length + (stockOnly ? 1 : 0) + (query.trim() ? 1 : 0);
    const titleLabel = labels?.title || catalog?.filters?.title || "Filtros";
    const subtitleLabel = labels?.subtitle || catalog?.filters?.subtitle || "Refina tu busqueda profesional";
    const searchPlaceholder = labels?.search_placeholder || catalog?.filters?.searchPlaceholder || "Buscar producto...";
    const topSearchesLabel = labels?.top_searches_label || "Mas buscados";
    const productMatchesLabel = labels?.product_matches_label || "Autocompletar";
    const typeLabel = labels?.type_label || catalog?.filters?.groups?.[0]?.title || "Tipo de producto";
    const formatLabel = labels?.format_label || catalog?.filters?.groups?.[1]?.title || "Presentacion";
    const stockLabel = labels?.stock_label || "Solo con stock";
    const usesGroupedFilters = Array.isArray(catalog?.productGroups) && catalog.productGroups.length > 0;

    return (
        <aside className="flex min-h-[1850px] w-64 shrink-0 flex-col items-start justify-start gap-2 overflow-hidden rounded-xl border border-[var(--store-border)] bg-[var(--store-panel-bg)] p-6 max-lg:p-4 shadow-sm max-lg:min-h-0 max-lg:w-full">
            <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-expanded={mobileOpen}
                aria-controls="piquim-filters-body"
                className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
            >
                <span className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--store-primary)]" style={{ fontFamily: 'Epilogue, Gilroy, sans-serif' }}>{titleLabel}</span>
                    {activeFilterCount > 0 ? (
                        <span className="rounded-full bg-[var(--store-primary)] px-2 py-0.5 text-xs font-bold leading-4 text-white">{activeFilterCount}</span>
                    ) : null}
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold text-[var(--store-secondary)]">
                    {mobileOpen ? 'Cerrar' : 'Mostrar'}
                    <ChevronDownSmallIcon className={`size-5 text-[var(--store-primary)] transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>
            <div id="piquim-filters-body" className={`${mobileOpen ? 'flex max-lg:mt-4 max-lg:border-t max-lg:border-[var(--store-border)] max-lg:pt-4' : 'hidden'} w-full flex-col items-start justify-start gap-2 lg:flex`}>
                <div className="flex w-full flex-col items-start justify-start pb-6 max-lg:hidden">
                    <h2 className="flex w-full flex-col justify-center text-2xl font-bold leading-8 text-[var(--store-primary)]" style={{ fontFamily: 'Epilogue, Gilroy, sans-serif' }}>
                        {titleLabel}
                    </h2>
                    <p className="mt-1 whitespace-pre-line text-sm font-normal leading-5 text-[var(--store-secondary)]" style={{ fontFamily: 'Work Sans, Inter, sans-serif' }}>
                        {subtitleLabel}
                    </p>
                </div>

                <div className="w-full pb-4">
                    <div className="relative">
                        <input
                            value={query}
                            onChange={(event) => onQueryChange(event.target.value)}
                            onBlur={() => onSearchCommit(query)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-lg border border-[var(--store-border)] bg-[var(--store-input-bg)] py-2.5 pl-3 pr-8 text-sm text-[var(--store-text)] outline-none placeholder:text-[var(--store-muted-text)] focus:border-[var(--store-primary)]"
                        />
                        <SearchIcon className="absolute right-2 top-2.5 size-5 text-[var(--store-primary)]" />
                    </div>
                </div>

                <SuggestionGroup title={topSearchesLabel} items={trendingSuggestions} onPick={onSuggestionPick} />
                <SuggestionGroup title={productMatchesLabel} items={productSuggestions} onPick={onSuggestionPick} />

                {usesGroupedFilters ? (
                    <GroupedFilterTree
                        title={typeLabel}
                        groups={catalog.productGroups}
                        selectedGroups={selectedTypes}
                        onToggleGroup={onToggleType}
                        selectedCategories={selectedFormats}
                        onToggleCategory={onToggleFormat}
                        selectedFlavors={selectedFlavors}
                        onToggleFlavor={onToggleFlavor}
                    />
                ) : (
                    <>
                        <FilterGroup title={typeLabel} options={availableTypes} selected={selectedTypes} onToggle={onToggleType} />
                        <FilterGroup title={formatLabel} options={availableFormats} selected={selectedFormats} onToggle={onToggleFormat} />
                    </>
                )}

                <label className="inline-flex w-full items-center justify-start gap-2 pb-4">
                    <input type="checkbox" checked={stockOnly} onChange={(event) => onStockChange(event.target.checked)} />
                    <span className="text-sm font-normal leading-5 text-[var(--store-secondary)]">{stockLabel}</span>
                </label>

                <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 h-12 w-full rounded-full bg-[var(--store-primary)] text-sm font-bold text-white transition-opacity hover:opacity-90 lg:hidden"
                >
                    {resultCount > 0 ? `Ver ${resultCount} ${resultCount === 1 ? 'producto' : 'productos'}` : 'Cerrar filtros'}
                </button>
            </div>
        </aside>
    );
}
