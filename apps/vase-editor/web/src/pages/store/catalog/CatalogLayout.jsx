// Catálogo: la página (migas, filtros y grilla de productos).
import StoreLayout from '../../../components/layout/StoreLayout';
import StoreSkeleton from '../../../components/StoreSkeleton';
import { CATALOG_STYLES } from './catalog-data.js';
import { CatalogFilters } from './CatalogFilters.jsx';
import { CatalogProductCard } from './CatalogProductCard.jsx';
import { CloseIcon } from './icons.jsx';
import { FilterIcon } from './icons.jsx';
import { PaginationButton } from './CatalogProductCard.jsx';
import { ResetIcon } from './icons.jsx';
import { navigate } from '../../../utils/navigation';

export default function CatalogLayout({ activeFilterCount, applyFilters, authLoading, brands, canViewPrices, catalogProducts, catalogText, categoryTree, chips, currency, handleFavoriteChange, handlePageChange, inStockOnly, loading, locale, lowStockThreshold, mobileFiltersOpen, page, resetFilters, resultsSummary, selectedBrand, selectedBrandEntry, selectedCategory, selectedCategoryEntry, selectedMaxPrice, selectedMinPrice, setMobileFiltersOpen, showPricesEnabled, showStock, sort, totalItems, totalPages }) {
    return (
        <StoreLayout>
            <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 md:px-6 lg:pt-8 xl:px-10" style={CATALOG_STYLES.shell}>
                {mobileFiltersOpen ? (
                    <div
                        className="fixed inset-0 z-40 bg-black/45 lg:hidden"
                        onClick={() => setMobileFiltersOpen(false)}
                        aria-hidden="true"
                    />
                ) : null}



                <section className="rounded-[28px] border p-5 shadow-sm md:p-8" style={CATALOG_STYLES.panel}>
                    <div className="flex flex-wrap items-center gap-2 text-sm" style={CATALOG_STYLES.muted}>
                        <button type="button" className="transition-colors hover:text-primary" onClick={() => navigate("/")}>Inicio</button>
                        <span>/</span>
                        <button type="button" className="transition-colors hover:text-primary" onClick={resetFilters}>Catalogo</button>
                        {selectedCategoryEntry ? (
                            <>
                                <span>/</span>
                                <span className="text-[#181411] dark:text-white">{selectedCategoryEntry.name}</span>
                            </>
                        ) : null}
                    </div>

                    <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-3">
                            <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                                {catalogText("badge")}
                            </span>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tight text-[#181411] dark:text-white md:text-4xl">
                                    {selectedCategoryEntry?.name || selectedBrandEntry?.name || catalogText("title")}
                                </h1>
                                <p className="max-w-2xl text-sm leading-6 md:text-base" style={CATALOG_STYLES.muted}>{resultsSummary}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white lg:hidden"
                                style={CATALOG_STYLES.border}
                            >
                                <FilterIcon className="size-4" />
                                {activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : "Filtros"}
                            </button>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#181411] transition-colors hover:bg-primary hover:text-white dark:text-white"
                                style={CATALOG_STYLES.surface}
                            >
                                <ResetIcon className="size-4" />
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {chips.length ? (
                            chips.map((chip) => (
                                <button
                                    key={chip.id}
                                    type="button"
                                    onClick={chip.clear}
                                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
                                >
                                    <span>{chip.label}</span>
                                    <CloseIcon className="size-3.5" />
                                </button>
                            ))
                        ) : null}
                    </div>
                </section>

                <div className="mt-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
                    <aside className="hidden lg:block">
                        <CatalogFilters
                            categoryTree={categoryTree}
                            brands={brands}
                            selectedCategory={selectedCategory}
                            selectedBrand={selectedBrand}
                            selectedMinPrice={selectedMinPrice}
                            selectedMaxPrice={selectedMaxPrice}
                            inStockOnly={inStockOnly}
                            sort={sort}
                            onSelectCategory={(value) => applyFilters({ category: value })}
                            onSelectBrand={(value) => applyFilters({ brand: value })}
                            onApplyAdvanced={(values) => applyFilters(values)}
                            onReset={resetFilters}
                        />
                    </aside>

                    {mobileFiltersOpen ? (
                        <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-sm overflow-y-auto p-4 shadow-2xl lg:hidden" style={CATALOG_STYLES.panel}>
                            <CatalogFilters
                                mobile
                                categoryTree={categoryTree}
                                brands={brands}
                                selectedCategory={selectedCategory}
                                selectedBrand={selectedBrand}
                                selectedMinPrice={selectedMinPrice}
                                selectedMaxPrice={selectedMaxPrice}
                                inStockOnly={inStockOnly}
                                sort={sort}
                                onSelectCategory={(value) => applyFilters({ category: value })}
                                onSelectBrand={(value) => applyFilters({ brand: value })}
                                onApplyAdvanced={(values) => applyFilters(values)}
                                onReset={resetFilters}
                                onClose={() => setMobileFiltersOpen(false)}
                            />
                        </aside>
                    ) : null}

                    <section className="mt-6 min-w-0 lg:mt-0">
                        <div className="sticky top-20 z-30 mb-5 flex items-center justify-between rounded-2xl border bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md lg:hidden" style={CATALOG_STYLES.border}>
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(true)}
                                className="flex items-center gap-2 text-sm font-bold text-[#181411] dark:text-white"
                            >
                                <FilterIcon className="size-5" />
                                Filtrar {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                            </button>
                            <span className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>
                                {totalItems} {totalItems === 1 ? "resultado" : "resultados"}
                            </span>
                        </div>


                        {loading ? (
                            <StoreSkeleton variant="catalog" />
                        ) : catalogProducts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed px-6 py-14 text-center" style={{ ...CATALOG_STYLES.border, ...CATALOG_STYLES.muted }}>
                                <p className="text-lg font-bold text-[#181411] dark:text-white">{catalogText("empty_title")}</p>
                                <p className="mt-2 text-sm">{catalogText("empty_text")}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {catalogProducts.map((product) => (
                                    <CatalogProductCard
                                        key={product.id}
                                        product={product}
                                        showPricesEnabled={showPricesEnabled}
                                        canViewPrices={canViewPrices}
                                        authLoading={authLoading}
                                        currency={currency}
                                        locale={locale}
                                        showStock={showStock}
                                        lowStockThreshold={lowStockThreshold}
                                        onFavoriteChange={handleFavoriteChange}
                                    />
                                ))}
                            </div>
                        )}

                        {totalPages > 1 ? (
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 rounded-2xl border bg-white/70 p-2 shadow-sm dark:bg-white/5" style={CATALOG_STYLES.border}>
                                <PaginationButton
                                    label="Anterior"
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                />

                                {Array.from({ length: totalPages }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const nearCurrent = pageNumber === 1 || pageNumber === totalPages || (pageNumber >= page - 1 && pageNumber <= page + 1);
                                    if (!nearCurrent) {
                                        if (pageNumber === page - 2 || pageNumber === page + 2) {
                                            return (
                                                <span key={`ellipsis-${pageNumber}`} className="px-2 text-sm font-bold" style={CATALOG_STYLES.muted}>
                                                    ...
                                                </span>
                                            );
                                        }
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={`page-${pageNumber}`}
                                            type="button"
                                            onClick={() => handlePageChange(pageNumber)}
                                            className={`min-w-[42px] rounded-xl px-4 py-2 text-sm font-bold transition-all ${pageNumber === page
                                                    ? "bg-primary text-white"
                                                    : "border border-transparent text-[#181411] hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:text-white"
                                                }`}
                                            aria-label={`Pagina ${pageNumber}`}
                                            aria-current={pageNumber === page ? "page" : undefined}
                                        >
                                            {pageNumber}
                                        </button>
                                    );
                                })}

                                <PaginationButton
                                    label="Siguiente"
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                />
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </StoreLayout>
    );
}
