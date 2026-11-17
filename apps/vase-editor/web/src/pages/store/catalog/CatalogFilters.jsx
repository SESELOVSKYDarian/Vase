// Panel de filtros del catálogo.
// partes: ./CatalogFiltersCategorias.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_SORT, SORT_OPTIONS, normalizePriceFilterValue, normalizeSortValue } from "./filters.js";
import { CATALOG_STYLES } from "./catalog-data.js";
import { ChevronRightIcon, CloseIcon, ResetIcon } from "./icons.jsx";

import CatalogFiltersCategorias from './CatalogFiltersCategorias.jsx';
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

            <CatalogFiltersCategorias brands={brands} categoryTree={categoryTree} draftInStockOnly={draftInStockOnly} draftMaxPrice={draftMaxPrice} draftMinPrice={draftMinPrice} draftSort={draftSort} expandedCategories={expandedCategories} hasMoreBrands={hasMoreBrands} hasMoreCategories={hasMoreCategories} onApplyAdvanced={onApplyAdvanced} onReset={onReset} onSelectBrand={onSelectBrand} onSelectCategory={onSelectCategory} selectedBrand={selectedBrand} selectedCategory={selectedCategory} setDraftInStockOnly={setDraftInStockOnly} setDraftMaxPrice={setDraftMaxPrice} setDraftMinPrice={setDraftMinPrice} setDraftSort={setDraftSort} setExpandedCategories={setExpandedCategories} setShowAllBrandsModal={setShowAllBrandsModal} setShowAllCategoriesModal={setShowAllCategoriesModal} visibleBrands={visibleBrands} visibleCategories={visibleCategories} />

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
