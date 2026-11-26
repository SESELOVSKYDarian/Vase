// Catálogo: filtros de categorías, precio y disponibilidad.
import { CATALOG_STYLES } from './catalog-data.js';
import { ChevronRightIcon } from './icons.jsx';
import { DEFAULT_SORT } from './filters.js';
import { SORT_OPTIONS } from './filters.js';
import { normalizePriceFilterValue } from './filters.js';
import { normalizeSortValue } from './filters.js';
import { useMemo, useState } from 'react';
import { prettyLabel, searchKey } from '../../../utils/prettyLabel';

export default function CatalogFiltersPanel({ brands, categoryTree, draftInStockOnly, draftMaxPrice, draftMinPrice, draftSort, expandedCategories, hasMoreBrands, hasMoreCategories, onApplyAdvanced, onReset, onSelectBrand, onSelectCategory, selectedBrand, selectedCategory, setDraftInStockOnly, setDraftMaxPrice, setDraftMinPrice, setDraftSort, setExpandedCategories, setShowAllBrandsModal, setShowAllCategoriesModal, visibleBrands, visibleCategories }) {
    // Buscador de categorías: muestra las que coinciden (o que tienen una subcategoría que coincide).
    const [categoryQuery, setCategoryQuery] = useState('');
    const filteredCategories = useMemo(() => {
        const query = searchKey(categoryQuery);
        if (!query) return categoryTree;
        return categoryTree
            .map((category) => {
                if (searchKey(category.name).includes(query)) return category;
                const children = category.children.filter((child) => searchKey(child.name).includes(query));
                return children.length ? { ...category, children } : null;
            })
            .filter(Boolean);
    }, [categoryTree, categoryQuery]);

    return (
        <div className="mt-5 space-y-5">
            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Categorías</h3>
                    {selectedCategory ? (
                        <button type="button" onClick={() => onSelectCategory(null)} className="text-xs font-bold text-primary">
                            Limpiar
                        </button>
                    ) : null}
                </div>
                {categoryTree.length ? (
                    <>
                        {/* Con muchas categorías, un buscador arriba para encontrar la que querés. */}
                        {categoryTree.length > 8 ? (
                            <input
                                type="search"
                                value={categoryQuery}
                                onChange={(event) => setCategoryQuery(event.target.value)}
                                placeholder="Buscar categoría"
                                className="mb-2 w-full rounded-xl border px-3 py-2 text-sm text-[#181411] outline-none transition-colors focus:border-primary dark:text-white"
                                style={CATALOG_STYLES.card}
                            />
                        ) : null}
                        <div className="max-h-[340px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                            {filteredCategories.length ? (
                                filteredCategories.map((category) => {
                                    const parentActive = selectedCategory === category.id || selectedCategory === category.slug;
                                    const hasChildren = category.children.length > 0;
                                    const expanded = categoryQuery ? true : (expandedCategories[category.id] ?? false);
                                    return (
                                        <div key={`category-${category.id}`}>
                                            <div className="flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectCategory(category.id)}
                                                    className={`min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${parentActive
                                                        ? "bg-primary/10 font-semibold text-primary"
                                                        : "text-[#181411] hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/5"
                                                        }`}
                                                >
                                                    {prettyLabel(category.name)}
                                                </button>
                                                {hasChildren ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedCategories((prev) => ({ ...prev, [category.id]: !expanded }))}
                                                        className="ml-1 rounded-md p-1 text-[#6f5f50] transition-colors hover:text-primary dark:text-[#d6c4b4]"
                                                        aria-label={expanded ? `Ocultar subcategorías de ${category.name}` : `Mostrar subcategorías de ${category.name}`}
                                                    >
                                                        <ChevronRightIcon className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                                                    </button>
                                                ) : null}
                                            </div>
                                            {hasChildren && expanded ? (
                                                <div className="mb-1 ml-3 flex flex-col border-l pl-2" style={CATALOG_STYLES.border}>
                                                    {category.children.map((child) => {
                                                        const childActive = selectedCategory === child.id || selectedCategory === child.slug;
                                                        return (
                                                            <button
                                                                key={`category-child-${child.id}`}
                                                                type="button"
                                                                onClick={() => onSelectCategory(child.id)}
                                                                className={`truncate rounded-lg px-2.5 py-1 text-left text-[13px] transition-colors ${childActive
                                                                    ? "font-semibold text-primary"
                                                                    : "text-[#6f5f50] hover:text-[#181411] dark:text-[#d6c4b4] dark:hover:text-white"
                                                                    }`}
                                                            >
                                                                {prettyLabel(child.name)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="px-2.5 py-2 text-sm" style={CATALOG_STYLES.muted}>No hay categorías con ese nombre.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-sm" style={CATALOG_STYLES.muted}>No hay categorias disponibles.</p>
                )}
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Precio</h3>
                    {(draftMinPrice || draftMaxPrice) ? (
                        <button
                            type="button"
                            onClick={() => {
                                setDraftMinPrice("");
                                setDraftMaxPrice("");
                                onApplyAdvanced?.({ minPrice: "", maxPrice: "" });
                            }}
                            className="text-xs font-bold text-primary"
                        >
                            Limpiar
                        </button>
                    ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Mínimo</span>
                        <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={draftMinPrice}
                            onChange={(event) => setDraftMinPrice(normalizePriceFilterValue(event.target.value))}
                            placeholder="0"
                            className="w-full rounded-xl border px-3 py-2.5 text-sm text-[#181411] outline-none transition-colors focus:border-primary dark:text-white"
                            style={CATALOG_STYLES.card}
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Máximo</span>
                        <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={draftMaxPrice}
                            onChange={(event) => setDraftMaxPrice(normalizePriceFilterValue(event.target.value))}
                            placeholder="999999"
                            className="w-full rounded-xl border px-3 py-2.5 text-sm text-[#181411] outline-none transition-colors focus:border-primary dark:text-white"
                            style={CATALOG_STYLES.card}
                        />
                    </label>
                </div>
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Disponibilidad</h3>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold text-[#181411] dark:text-white" style={CATALOG_STYLES.surface}>
                    <input
                        type="checkbox"
                        checked={draftInStockOnly}
                        onChange={(event) => setDraftInStockOnly(event.target.checked)}
                        className="size-4 rounded border-[#d9d1ca] text-primary focus:ring-primary"
                    />
                    <span>Solo productos con stock</span>
                </label>
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Orden</h3>
                </div>
                <select
                    value={draftSort}
                    onChange={(event) => setDraftSort(normalizeSortValue(event.target.value))}
                    className="w-full rounded-xl border px-3 py-3 text-sm font-semibold text-[#181411] outline-none transition-colors focus:border-primary dark:text-white"
                    style={CATALOG_STYLES.card}
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() =>
                        onApplyAdvanced?.({
                            minPrice: draftMinPrice,
                            maxPrice: draftMaxPrice,
                            inStock: draftInStockOnly,
                            sort: draftSort,
                        })
                    }
                    className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:opacity-90"
                >
                    Aplicar filtros
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setDraftMinPrice("");
                        setDraftMaxPrice("");
                        setDraftInStockOnly(false);
                        setDraftSort(DEFAULT_SORT);
                        onReset?.();
                    }}
                    className="rounded-2xl border px-4 py-3 text-sm font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                    style={CATALOG_STYLES.border}
                >
                    Limpiar todo
                </button>
            </div>

            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Marcas</h3>
                    {selectedBrand ? (
                        <button
                            type="button"
                            onClick={() => onSelectBrand(null)}
                            className="text-xs font-bold text-primary"
                        >
                            Limpiar
                        </button>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    {brands.length ? (
                        <>
                            {visibleBrands.map((brand) => {
                                const active = selectedBrand === brand.id || selectedBrand === brand.name;
                                return (
                                    <button
                                        key={`brand-${brand.id}`}
                                        type="button"
                                        onClick={() => onSelectBrand(brand.id)}
                                        className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${active
                                                ? "bg-primary text-white"
                                                : "border text-[#181411] hover:border-primary hover:text-primary dark:text-white"
                                            }`}
                                        style={active ? undefined : CATALOG_STYLES.border}
                                    >
                                        {prettyLabel(brand.name)}
                                    </button>
                                );
                            })}
                            {hasMoreBrands ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAllBrandsModal(true)}
                                    className="mt-1 text-sm font-semibold text-primary hover:underline w-full text-left"
                                >
                                    Ver todas las marcas
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <p className="text-sm" style={CATALOG_STYLES.muted}>No hay marcas disponibles.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
