// Subcatálogo de Piquim: la página (filtros y productos).
import { ChevronDownSmallIcon } from './icons.jsx';
import { PaginationButton } from './CatalogProductCard.jsx';
import { PiquimProductsLoadingState } from './PiquimSidebar.jsx';
import { PiquimSubcatalogProductCard } from './PiquimProductCard.jsx';
import { PiquimSubcatalogSidebar } from './PiquimSidebar.jsx';

export default function PiquimSubcatalogLayout({ availableFormats, availableTypes, catalog, catalogTopRef, currency, expandedSections, flavorFilters, formatFilters, handleCatalogPageChange, handleQueryChange, handleSearchCommit, handleStockChange, handleSuggestionPick, labels, loadError, loading, locale, normalizedProducts, onProductClick, onRetry, paginatedProducts, paginationItems, productSuggestions, query, resolvedCatalog, sections, setExpandedSections, setFlavorFilters, setFormatFilters, setTypeFilters, stockOnly, toggleFilter, trendingSuggestions, typeFilters, usesConfiguredGroups, visibleRangeEnd, visibleRangeStart }) {
    return (
        <div className="min-h-screen bg-[var(--store-background)] font-[Inter] text-[var(--store-text)] transition-colors duration-300">
            <main className="flex w-full items-start justify-center gap-0 bg-[var(--store-background)] px-[60px] pb-10 pt-8 max-lg:flex-col max-lg:px-5 max-lg:pt-3 max-md:pb-8">
                <PiquimSubcatalogSidebar
                    catalog={resolvedCatalog}
                    labels={labels}
                    query={query}
                    onQueryChange={handleQueryChange}
                    onSearchCommit={handleSearchCommit}
                    trendingSuggestions={trendingSuggestions}
                    productSuggestions={productSuggestions}
                    onSuggestionPick={handleSuggestionPick}
                    availableTypes={availableTypes}
                    selectedTypes={typeFilters}
                    onToggleType={(value) => toggleFilter(setTypeFilters, value)}
                    availableFormats={availableFormats}
                    selectedFormats={formatFilters}
                    onToggleFormat={(value) => toggleFilter(setFormatFilters, value)}
                    selectedFlavors={flavorFilters}
                    onToggleFlavor={(value) => toggleFilter(setFlavorFilters, value)}
                    stockOnly={stockOnly}
                    onStockChange={handleStockChange}
                    resultCount={sections.reduce((total, section) => total + section.products.length, 0)}
                />
                <section className="flex flex-1 flex-col items-start justify-start gap-[30px] overflow-hidden bg-[var(--store-background)] px-[60px] py-[30px] max-xl:px-8 max-lg:w-full max-md:px-0">
                    <header ref={catalogTopRef} className="inline-flex w-full scroll-mt-24 items-end justify-between overflow-hidden">
                        <div className="inline-flex flex-col items-start justify-start gap-4 overflow-hidden">
                            <h1 className="text-[56px] font-black leading-[56px] max-md:text-[40px] max-md:leading-[42px]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                                <span className="text-[var(--store-text)]">{catalog.headingBase} </span>
                                <span className="italic text-[var(--store-primary)]">{catalog.headingAccent}</span>
                            </h1>
                        </div>
                    </header>

                    {loading && !normalizedProducts.length ? (
                        <PiquimProductsLoadingState />
                    ) : null}

                    {loading && normalizedProducts.length ? (
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--store-surface-soft)]" role="status" aria-label="Cargando más productos...">
                            <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--store-primary)]" />
                        </div>
                    ) : null}

                    {loadError ? (
                        <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--store-primary)]/50 bg-[var(--store-surface-soft)] px-5 py-4 text-sm text-[var(--store-text)]" role="alert">
                            <span>{normalizedProducts.length ? "No se pudieron cargar algunos productos" : "No se pudieron cargar los productos"}</span>
                            <button type="button" onClick={onRetry} className="rounded-full bg-[#FF4D00] px-4 py-2 font-bold text-white transition hover:bg-[#E04400]">
                                Reintentar
                            </button>
                        </div>
                    ) : null}

                    {!loading && !loadError && !sections.length ? (
                        <div className="rounded-2xl border border-[var(--store-border)] bg-[var(--store-card-bg)] p-6 text-sm text-[var(--store-muted-text)]">
                            No encontramos productos con esos filtros.
                        </div>
                    ) : null}

                    {sections.map((section) => {
                        const expanded = !usesConfiguredGroups || expandedSections[section.title] !== false;

                        return (
                            <section key={section.title} className="flex w-full flex-col items-start justify-start gap-[25px]">
                                {usesConfiguredGroups ? (
                                    <button
                                        type="button"
                                        onClick={() => setExpandedSections((prev) => ({ ...prev, [section.title]: prev[section.title] === false }))}
                                        className="flex w-full items-center justify-between gap-4 border-b border-[var(--store-border)] pb-4 text-left"
                                        aria-expanded={expanded}
                                    >
                                        <span className="flex min-w-0 flex-col gap-1">
                                            <span className="text-4xl font-bold leading-9 text-[var(--store-text)]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                                                {section.title}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--store-muted-text)]">
                                                {section.products.length} {section.products.length === 1 ? 'producto' : 'productos'}
                                            </span>
                                        </span>
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--store-primary)] text-white transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                            <ChevronDownSmallIcon className="size-5" />
                                        </span>
                                    </button>
                                ) : (
                                    <h2 className="text-4xl font-bold leading-9 text-[var(--store-text)]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                                        {section.title}
                                    </h2>
                                )}

                                {expanded && section.categories?.length ? (
                                    <div className="flex w-full flex-col gap-8">
                                        {section.categories.map((categorySection) => (
                                            <div key={`${section.title}-${categorySection.title}`} className="flex w-full flex-col gap-4">
                                                <h3 className="text-2xl font-bold leading-8" style={{ color: catalog.accent, fontFamily: 'Gilroy, sans-serif' }}>
                                                    {categorySection.title}
                                                </h3>
                                                <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(282px,1fr))] gap-6">
                                                    {categorySection.products.map((product) => (
                                                        <PiquimSubcatalogProductCard
                                                            key={product.id}
                                                            product={product}
                                                            accent={catalog.accent}
                                                            mediaGradient={catalog.mediaGradient}
                                                            icon={catalog.icon}
                                                            currency={currency}
                                                            locale={locale}
                                                        onOpen={() => onProductClick(product.id, { group: section.title, filter: categorySection.title })}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                {expanded && !section.categories?.length ? (
                                    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(282px,1fr))] gap-6">
                                        {section.products.map((product) => (
                                            <PiquimSubcatalogProductCard
                                                key={product.id}
                                                product={product}
                                                accent={catalog.accent}
                                                mediaGradient={catalog.mediaGradient}
                                                icon={catalog.icon}
                                                currency={currency}
                                                locale={locale}
                                                onOpen={() => onProductClick(product.id, { filter: section.title })}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </section>
                        );
                    })}

                    {paginatedProducts.totalPages > 1 ? (
                        <nav aria-label="Paginacion del catalogo">
                            <div className="mb-3 text-center text-sm font-semibold text-[var(--store-muted-text)]">
                                {visibleRangeStart}-{visibleRangeEnd} de {paginatedProducts.totalItems} productos
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-2 shadow-sm">
                                <PaginationButton
                                    label="Anterior"
                                    onClick={() => handleCatalogPageChange(paginatedProducts.currentPage - 1)}
                                    disabled={paginatedProducts.currentPage === 1}
                                />

                                {paginationItems.map((paginationItem, index) => {
                                    if (paginationItem === "ellipsis") {
                                        return (
                                            <span key={`piquim-ellipsis-${index}`} className="px-2 text-sm font-bold text-[var(--store-muted-text)]" aria-hidden="true">
                                                ...
                                            </span>
                                        );
                                    }
                                    const pageNumber = paginationItem;

                                    return (
                                        <button
                                            key={`piquim-page-${pageNumber}`}
                                            type="button"
                                            onClick={() => handleCatalogPageChange(pageNumber)}
                                            className={`min-w-[42px] rounded-xl px-4 py-2 text-sm font-bold transition-all ${pageNumber === paginatedProducts.currentPage
                                                ? "bg-[var(--store-primary)] text-white"
                                                : "border border-transparent text-[var(--store-text)] hover:border-[var(--store-primary)] hover:bg-[var(--store-surface-soft)] hover:text-[var(--store-primary)]"
                                                }`}
                                            aria-label={`Pagina ${pageNumber}`}
                                            aria-current={pageNumber === paginatedProducts.currentPage ? "page" : undefined}
                                        >
                                            {pageNumber}
                                        </button>
                                    );
                                })}

                                <PaginationButton
                                    label="Siguiente"
                                    onClick={() => handleCatalogPageChange(paginatedProducts.currentPage + 1)}
                                    disabled={paginatedProducts.currentPage === paginatedProducts.totalPages}
                                />
                            </div>
                        </nav>
                    ) : null}
                </section>
            </main>
        </div>
    );
}
