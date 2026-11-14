// Panel de filtros del catálogo.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_SORT, SORT_OPTIONS, normalizePriceFilterValue, normalizeSortValue } from "./filters.js";
import { CATALOG_STYLES } from "./catalog-data.js";
import { ChevronRightIcon, CloseIcon, ResetIcon } from "./icons.jsx";

export function CatalogFilters({
    categoryTree,
    brands,
    selectedCategory,
    selectedBrand,
    selectedMinPrice,
    selectedMaxPrice,
    inStockOnly,
    sort,
    onSelectCategory,
    onSelectBrand,
    onApplyAdvanced,
    onReset,
    mobile = false,
    onClose,
}) {
    const [draftMinPrice, setDraftMinPrice] = useState(selectedMinPrice || "");
    const [draftMaxPrice, setDraftMaxPrice] = useState(selectedMaxPrice || "");
    const [draftInStockOnly, setDraftInStockOnly] = useState(Boolean(inStockOnly));
    const [draftSort, setDraftSort] = useState(normalizeSortValue(sort));
    const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);
    const [showAllBrandsModal, setShowAllBrandsModal] = useState(false);

    const visibleCategories = categoryTree.slice(0, 6);
    const hasMoreCategories = categoryTree.length > 6;

    const visibleBrands = brands.slice(0, 4);
    const hasMoreBrands = brands.length > 4;

    const [expandedCategories, setExpandedCategories] = useState(() => {
        const next = {};
        categoryTree.forEach((category) => {
            const childActive = category.children.some((child) => selectedCategory === child.id || selectedCategory === child.slug);
            next[category.id] = Boolean(childActive || selectedCategory === category.id || selectedCategory === category.slug);
        });
        return next;
    });

    useEffect(() => {
        setDraftMinPrice(selectedMinPrice || "");
    }, [selectedMinPrice]);

    useEffect(() => {
        setDraftMaxPrice(selectedMaxPrice || "");
    }, [selectedMaxPrice]);

    useEffect(() => {
        setDraftInStockOnly(Boolean(inStockOnly));
    }, [inStockOnly]);

    useEffect(() => {
        setDraftSort(normalizeSortValue(sort));
    }, [sort]);

    useEffect(() => {
        setExpandedCategories((prev) => {
            const next = {};
            categoryTree.forEach((category) => {
                const childActive = category.children.some((child) => selectedCategory === child.id || selectedCategory === child.slug);
                if (typeof prev[category.id] === "boolean") {
                    next[category.id] = prev[category.id] || childActive;
                } else {
                    next[category.id] = Boolean(childActive || selectedCategory === category.id || selectedCategory === category.slug);
                }
            });
            return next;
        });
    }, [categoryTree, selectedCategory]);

    return (
        <div className={`rounded-[24px] border p-5 shadow-sm relative z-20 ${mobile ? "min-h-full" : ""}`} style={CATALOG_STYLES.panel}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Explorar</p>
                    <h2 className="mt-1 text-xl font-black text-[#181411] dark:text-white">Filtros</h2>
                </div>
                {mobile ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border p-2 text-[#181411] dark:text-white"
                        style={CATALOG_STYLES.border}
                        aria-label="Cerrar filtros"
                    >
                        <CloseIcon className="size-4" />
                    </button>
                ) : null}
            </div>

            <button
                type="button"
                onClick={onReset}
                className="mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                style={CATALOG_STYLES.border}
            >
                <span>Catalogo completo</span>
                <ResetIcon className="size-4" />
            </button>

            <div className="mt-6 space-y-6">
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Categorias</h3>
                        {selectedCategory ? (
                            <button
                                type="button"
                                onClick={() => onSelectCategory(null)}
                                className="text-xs font-bold text-primary"
                            >
                                Limpiar
                            </button>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-1">
                        {categoryTree.length ? (
                            <>
                                {visibleCategories.map((category) => {
                                    const parentActive = selectedCategory === category.id || selectedCategory === category.slug;
                                    const hasChildren = category.children.length > 0;
                                    const expanded = expandedCategories[category.id] ?? false;
                                    return (
                                        <div key={`category-${category.id}`} className="flex flex-col">
                                            <div className="flex h-full items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectCategory(category.id)}
                                                    className={`flex min-w-0 flex-1 h-full items-center justify-center lg:justify-start rounded-xl border lg:border-none px-1 py-2 lg:p-1 text-center lg:text-left text-[11px] leading-tight lg:text-sm transition-colors ${parentActive
                                                            ? "border-primary bg-primary/10 font-bold text-primary lg:bg-transparent"
                                                            : "border-[#e5e1de] text-[#181411] hover:border-primary hover:text-primary dark:border-[#3d2f21] dark:text-white"
                                                        }`}
                                                >
                                                    <span className="line-clamp-2">{category.name}</span>
                                                </button>
                                                {hasChildren ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedCategories((prev) => ({
                                                                ...prev,
                                                                [category.id]: !expanded,
                                                            }))
                                                        }
                                                        className="hidden lg:block ml-2 p-1 text-[#6f5f50] transition-colors hover:text-primary dark:text-[#d6c4b4]"
                                                        aria-label={expanded ? `Ocultar subcategorias de ${category.name}` : `Mostrar subcategorias de ${category.name}`}
                                                    >
                                                        <ChevronRightIcon className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                                                    </button>
                                                ) : null}
                                            </div>
                                            {hasChildren && expanded ? (
                                                <div className="hidden lg:flex mt-1 flex-col space-y-1 border-l pl-3" style={CATALOG_STYLES.border}>
                                                    {category.children.map((child) => {
                                                        const childActive = selectedCategory === child.id || selectedCategory === child.slug;
                                                        return (
                                                            <button
                                                                key={`category-child-${child.id}`}
                                                                type="button"
                                                                onClick={() => onSelectCategory(child.id)}
                                                                className={`py-1 text-left text-sm transition-colors ${childActive
                                                                        ? "font-bold text-primary"
                                                                        : "text-[#6f5f50] hover:text-[#181411] dark:text-[#d6c4b4] dark:hover:text-white"
                                                                    }`}
                                                            >
                                                                <span className="truncate">{child.name}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                                {hasMoreCategories ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllCategoriesModal(true)}
                                        className="col-span-3 mt-2 text-sm font-semibold text-primary hover:underline lg:mt-1 lg:text-left"
                                    >
                                        Ver todas las categorías
                                    </button>
                                ) : null}
                            </>
                        ) : (
                            <p className="text-sm" style={CATALOG_STYLES.muted}>No hay categorias disponibles.</p>
                        )}
                    </div>
                </section>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Precio</h3>
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
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Minimo</span>
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
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Maximo</span>
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Disponibilidad</h3>
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Orden</h3>
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
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-[0.12em]" style={CATALOG_STYLES.muted}>Marcas</h3>
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
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active
                                                    ? "bg-primary text-white"
                                                    : "border text-[#181411] hover:border-primary hover:text-primary dark:text-white"
                                                }`}
                                            style={active ? undefined : CATALOG_STYLES.border}
                                        >
                                            {brand.name}
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

            {showAllCategoriesModal ? createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#181411]">
                        <div className="mb-4 flex items-center justify-between border-b border-[#ebebf0] pb-4 dark:border-[#3d2f21]">
                            <h3 className="text-xl font-black text-[#181411] dark:text-white">Todas las categorías</h3>
                            <button
                                type="button"
                                onClick={() => setShowAllCategoriesModal(false)}
                                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-[#2a1f16] dark:text-gray-400 dark:hover:bg-[#3d2f21]"
                            >
                                <CloseIcon className="size-5" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 gap-3 items-start sm:grid-cols-2 md:grid-cols-3">
                                {categoryTree.map((category) => {
                                    const active = selectedCategory === category.id || selectedCategory === category.slug;
                                    const hasChildren = category.children.length > 0;
                                    const expanded = expandedCategories[category.id] ?? false;

                                    return (
                                        <div key={`modal-cat-${category.id}`} className="flex flex-col">
                                            <div className={`flex items-center justify-between rounded-xl border transition-colors hover:border-primary ${
                                                active ? "border-primary bg-primary/5 font-bold text-primary" : "border-[#e5e1de] dark:border-[#3d2f21]"
                                            }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectCategory(category.id);
                                                        setShowAllCategoriesModal(false);
                                                    }}
                                                    className={`flex flex-1 items-center justify-between p-4 text-left ${
                                                        active ? "text-primary" : "text-[#181411] dark:text-white"
                                                    }`}
                                                >
                                                    <span className="line-clamp-2 text-sm">{category.name}</span>
                                                </button>
                                                {hasChildren ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExpandedCategories((prev) => ({
                                                                ...prev,
                                                                [category.id]: !expanded,
                                                            }))
                                                        }
                                                        className="p-4 text-[#6f5f50] hover:text-primary dark:text-[#d6c4b4]"
                                                        aria-label={expanded ? `Ocultar subcategorias de ${category.name}` : `Mostrar subcategorias de ${category.name}`}
                                                    >
                                                        <ChevronRightIcon className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                                                    </button>
                                                ) : null}
                                            </div>
                                            {hasChildren && expanded ? (
                                                <div className="mt-2 flex flex-col space-y-1 border-l pl-3" style={CATALOG_STYLES.border}>
                                                    {category.children.map((child) => {
                                                        const childActive = selectedCategory === child.id || selectedCategory === child.slug;
                                                        return (
                                                            <button
                                                                key={`modal-category-child-${child.id}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    onSelectCategory(child.id);
                                                                    setShowAllCategoriesModal(false);
                                                                }}
                                                                className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${childActive
                                                                        ? "bg-primary/10 font-bold text-primary"
                                                                        : "text-[#6f5f50] hover:bg-[#f7f4f1] hover:text-[#181411] dark:text-[#d6c4b4] dark:hover:bg-[#1d140d] dark:hover:text-white"
                                                                    }`}
                                                            >
                                                                <span className="truncate">{child.name}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            , document.body) : null}

            {showAllBrandsModal ? createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#181411]">
                        <div className="mb-4 flex items-center justify-between border-b border-[#ebebf0] pb-4 dark:border-[#3d2f21]">
                            <h3 className="text-xl font-black text-[#181411] dark:text-white">Todas las marcas</h3>
                            <button
                                type="button"
                                onClick={() => setShowAllBrandsModal(false)}
                                className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-[#2a1f16] dark:text-gray-400 dark:hover:bg-[#3d2f21]"
                            >
                                <CloseIcon className="size-5" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <div className="flex flex-wrap gap-2">
                                {brands.map((brand) => {
                                    const active = selectedBrand === brand.id || selectedBrand === brand.name;
                                    return (
                                        <button
                                            key={`modal-brand-${brand.id}`}
                                            type="button"
                                            onClick={() => {
                                                onSelectBrand(brand.id);
                                                setShowAllBrandsModal(false);
                                            }}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active
                                                    ? "bg-primary text-white"
                                                    : "border border-gray-200 text-[#181411] hover:border-primary hover:text-primary dark:border-[#3d2f21] dark:text-white"
                                                }`}
                                        >
                                            {brand.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            , document.body) : null}
        </div>
    );
}
