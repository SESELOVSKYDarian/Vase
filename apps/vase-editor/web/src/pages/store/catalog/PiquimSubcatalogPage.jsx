// Página de un subcatálogo de Piquim.
import { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../../../utils/navigation";
import { buildCatalogPaginationModel, buildPiquimCategoryGroups, paginateCatalogItems, resolvePiquimProductGroups, selectCanonicalCatalogMemberships, synchronizeCatalogPageRequest } from "../../../utils/piquimCatalogCategories";
import { withImageWidth } from "../../../utils/catalogRequest";
import { PIQUIM_PAGE_SIZE, SEARCH_HISTORY_LIMIT, formatSearchTerm, normalizeCatalogLabel, readSearchHistory, writeSearchHistory } from "./filters.js";
import { getProductImage, getRealProductImage } from "./catalog-data.js";
import { getConfiguredCategoryTitles, getConfiguredGroupTitles, getPiquimCatalogDisplayLabel, resolveConfiguredProductFlavor, resolveConfiguredProductGroup, resolveConfiguredProductGroups } from "./piquim-groups.js";
import { PiquimProductsLoadingState, PiquimSubcatalogSidebar } from "./PiquimSidebar.jsx";
import { PiquimSubcatalogProductCard } from "./PiquimProductCard.jsx";
import { ChevronDownSmallIcon } from "./icons.jsx";
import { PaginationButton } from "./CatalogProductCard.jsx";

export function PiquimSubcatalogPage({ catalog, categories, initialGroup = "", products, loading, loadError, onRetry, currency, locale, onProductClick, labels }) {
    const [query, setQuery] = useState("");
    // `group` en la URL (ej. una categoria sugerida del buscador) preselecciona la subcategoria.
    const [typeFilters, setTypeFilters] = useState(() => (initialGroup ? [initialGroup] : []));
    const [formatFilters, setFormatFilters] = useState([]);
    const [flavorFilters, setFlavorFilters] = useState([]);
    const [stockOnly, setStockOnly] = useState(false);
    const [catalogPage, setCatalogPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search || '').get('page') || 1) || 1));
    const [recentTerms, setRecentTerms] = useState([]);
    const [expandedSections, setExpandedSections] = useState({});
    const catalogTopRef = useRef(null);
    const catalogSlug = catalog?.slug;
    const configuredProductGroups = catalog?.productGroups;
    const publishedProductGroups = useMemo(
        () => buildPiquimCategoryGroups(categories, catalogSlug),
        [catalogSlug, categories]
    );
    const hasRootOnlyProducts = useMemo(
        () => publishedProductGroups.length > 0 && (Array.isArray(products) ? products : [])
            .some((product) => resolvePiquimProductGroups(publishedProductGroups, product).length === 0),
        [products, publishedProductGroups]
    );
    const productGroups = useMemo(
        () => publishedProductGroups.length
            ? [
                ...publishedProductGroups,
                ...(hasRootOnlyProducts ? [{ id: `${catalogSlug || 'catalog'}-unclassified`, title: 'Sin subcategoría', categories: [] }] : []),
            ]
            : configuredProductGroups,
        [catalogSlug, configuredProductGroups, hasRootOnlyProducts, publishedProductGroups]
    );
    const resolvedCatalog = useMemo(
        () => ({ ...catalog, productGroups }),
        [catalog, productGroups]
    );
    const usesPublishedGroups = publishedProductGroups.length > 0;
    const usesConfiguredGroups = Array.isArray(productGroups) && productGroups.length > 0;

    useEffect(() => {
        setRecentTerms(readSearchHistory());
    }, []);

    const normalizedProducts = useMemo(() => {
        const mapped = (Array.isArray(products) ? products : []).flatMap((product) => {
            const data = product?.data || {};
            const specs = data?.specifications && typeof data.specifications === "object" ? data.specifications : {};
            const categoryNames = Array.isArray(product?.category_names) ? product.category_names : [];
            const categoryPaths = Array.isArray(product?.category_paths) ? product.category_paths : [];
            const category = String(
                categoryPaths[0] ||
                categoryNames[0] ||
                product?.category?.name ||
                data?.category ||
                ""
            ).trim();
            const type = String(
                specs.tipo ||
                specs.tipo_producto ||
                data?.subtype ||
                product?.variation_group_label ||
                product?.variation_group ||
                category
            ).trim();
            const format = String(
                specs.presentacion ||
                specs.envase ||
                specs.packaging ||
                data?.presentation ||
                ""
            ).trim();
            const configuredGroups = usesPublishedGroups
                ? resolvePiquimProductGroups(publishedProductGroups, product, 'Sin subcategoría')
                : usesConfiguredGroups
                ? resolveConfiguredProductGroups(resolvedCatalog, product, { category, type, format })
                : [resolveConfiguredProductGroup(catalog, product, { category, type, format })].filter(Boolean);

            if (usesConfiguredGroups && !configuredGroups.length) {
                return [];
            }

            const variations = Array.isArray(product?.variations) ? product.variations : [];
            const variationPrices = variations
                .map((variation) => Number(variation?.price || 0))
                .filter((value) => Number.isFinite(value) && value > 0);
            const unitPrice = Number(product?.price || 0);
            const effectivePrice = variationPrices.length ? Math.min(...variationPrices) : unitPrice;

            const image = getRealProductImage(product);
            const groupsToRender = configuredGroups.length ? configuredGroups : [null];

            return groupsToRender.map((configuredGroup) => {
                const configuredFlavor = resolveConfiguredProductFlavor(catalog, configuredGroup?.groupTitle, product, { category, type, format });
                return {
                id: product?.id,
                sku: String(product?.sku || product?.erp_id || product?.id || "").trim(),
                name: String(product?.name || "").trim(),
                category: configuredGroup?.groupTitle || category || "Sin categoria",
                subtype: configuredGroup?.categoryTitle || type || "General",
                sectionTitle: configuredGroup?.groupTitle || type || "General",
                familyTitle: configuredGroup?.categoryTitle || format || "Sin especificar",
                breadcrumbLabel: [
                    getPiquimCatalogDisplayLabel(catalog),
                    configuredGroup?.groupTitle || category || "",
                    configuredGroup?.categoryTitle || type || "",
                ].filter(Boolean).join(" › "),
                flavorTitle: configuredFlavor?.name || "",
                flavorColor: configuredFlavor?.color || "",
                format: format || "Sin especificar",
                priceValue: Number.isFinite(effectivePrice) ? effectivePrice : 0,
                stock: Number(product?.stock || 0),
                image: withImageWidth(image || getProductImage(product)),
                hasImage: Boolean(image),
                alt: product?.alt || product?.name || "Producto",
                temperature: `${category} ${type}`.toLowerCase(),
                };
            });
        }).filter((item) => item && item.id && item.name);
        return mapped;
    }, [catalog, products, publishedProductGroups, resolvedCatalog, usesConfiguredGroups, usesPublishedGroups]);

    const availableTypes = useMemo(
        () => {
            if (usesConfiguredGroups) {
                return getConfiguredGroupTitles(resolvedCatalog);
            }
            return [...new Set(normalizedProducts.map((item) => item.subtype).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
        },
        [normalizedProducts, resolvedCatalog, usesConfiguredGroups]
    );
    const availableFormats = useMemo(
        () => {
            if (usesConfiguredGroups) {
                return getConfiguredCategoryTitles(resolvedCatalog);
            }
            return [...new Set(normalizedProducts.map((item) => item.format).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
        },
        [normalizedProducts, resolvedCatalog, usesConfiguredGroups]
    );

    const queryNormalized = normalizeCatalogLabel(query);
    const productSuggestions = useMemo(() => {
        if (!queryNormalized) return [];
        return normalizedProducts
            .filter((item) => normalizeCatalogLabel(item.name).includes(queryNormalized))
            .slice(0, 6)
            .map((item) => item.name);
    }, [normalizedProducts, queryNormalized]);

    const trendingSuggestions = useMemo(() => {
        const fromHistory = recentTerms
            .sort((a, b) => b.count - a.count)
            .map((item) => item.term)
            .filter(Boolean);
        const fallback = ["Chocolate", "Neutro", "Base", "Mousse", "Premezcla"];
        return [...new Set([...fromHistory, ...fallback])].slice(0, 6);
    }, [recentTerms]);

    const filteredProducts = useMemo(() => {
        return selectCanonicalCatalogMemberships(normalizedProducts.filter((item) => {
            const matchText = !queryNormalized || normalizeCatalogLabel(`${item.name} ${item.category} ${item.subtype} ${item.format}`).includes(queryNormalized);
            const matchType = !typeFilters.length || typeFilters.includes(usesConfiguredGroups ? item.sectionTitle : item.subtype);
            const matchFormat = !formatFilters.length || formatFilters.includes(usesConfiguredGroups ? item.familyTitle : item.format);
            const matchFlavor = !flavorFilters.length || flavorFilters.some((flavor) =>
                item.flavorTitle === flavor ||
                normalizeCatalogLabel(`${item.name} ${item.category} ${item.subtype} ${item.format}`).includes(normalizeCatalogLabel(flavor))
            );
            const matchStock = !stockOnly || Number(item.stock || 0) > 0;
            return matchText && matchType && matchFormat && matchFlavor && matchStock;
        }));
    }, [flavorFilters, formatFilters, normalizedProducts, queryNormalized, stockOnly, typeFilters, usesConfiguredGroups]);

    const paginatedProducts = useMemo(
        () => paginateCatalogItems(filteredProducts, catalogPage, PIQUIM_PAGE_SIZE),
        [catalogPage, filteredProducts]
    );

    // Solo se ajusta la pagina cuando ya hay productos: mientras cargan, la lista esta vacia y "recortar" a la
    // pagina 1 hacia perder la pagina pedida (al recargar o volver con el boton atras).
    useEffect(() => {
        if (!normalizedProducts.length) return;
        setCatalogPage((currentPage) => synchronizeCatalogPageRequest(currentPage, paginatedProducts.currentPage));
    }, [normalizedProducts.length, paginatedProducts.currentPage]);

    // Boton atras/adelante del navegador: la pagina vuelve a la de la URL.
    useEffect(() => {
        const syncPageFromUrl = () => {
            const urlPage = Math.max(1, Number(new URLSearchParams(window.location.search || '').get('page') || 1) || 1);
            setCatalogPage((currentPage) => (currentPage === urlPage ? currentPage : urlPage));
        };
        window.addEventListener('popstate', syncPageFromUrl);
        return () => window.removeEventListener('popstate', syncPageFromUrl);
    }, []);

    const paginatedItems = paginatedProducts.items;
    const paginationItems = useMemo(
        () => buildCatalogPaginationModel(paginatedProducts.currentPage, paginatedProducts.totalPages),
        [paginatedProducts.currentPage, paginatedProducts.totalPages]
    );
    const visibleRangeStart = (paginatedProducts.currentPage - 1) * PIQUIM_PAGE_SIZE + 1;
    const visibleRangeEnd = Math.min(paginatedProducts.currentPage * PIQUIM_PAGE_SIZE, paginatedProducts.totalItems);

    const sections = useMemo(() => {
        if (usesConfiguredGroups) {
            return getConfiguredGroupTitles(resolvedCatalog)
                .map((title) => {
                    const sectionProducts = paginatedItems.filter((item) => item.sectionTitle === title);
                    const categories = getConfiguredCategoryTitles({
                        productGroups: resolvedCatalog.productGroups.filter((group) => group.title === title),
                    })
                        .map((categoryTitle) => ({
                            title: categoryTitle,
                            products: sectionProducts.filter((item) => item.familyTitle === categoryTitle),
                        }))
                        .filter((categorySection) => categorySection.products.length > 0);

                    return { title, products: sectionProducts, categories };
                })
                .filter((section) => section.products.length > 0);
        }

        const byType = new Map();
        paginatedItems.forEach((item) => {
            if (!byType.has(item.subtype)) byType.set(item.subtype, []);
            byType.get(item.subtype).push(item);
        });
        return [...byType.entries()].map(([title, items]) => ({ title, products: items, categories: [] }));
    }, [paginatedItems, resolvedCatalog, usesConfiguredGroups]);

    useEffect(() => {
        if (!usesConfiguredGroups || !sections.length) return;
        setExpandedSections((prev) => {
            const next = { ...prev };
            let changed = false;
            sections.forEach((section) => {
                if (!Object.prototype.hasOwnProperty.call(next, section.title)) {
                    next[section.title] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [sections, usesConfiguredGroups]);

    const handleQueryChange = (value) => {
        setQuery(value);
        setCatalogPage(1);
    };

    const handleSuggestionPick = (value) => {
        handleQueryChange(value);
    };

    const toggleFilter = (setter, value) => {
        setter((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
        setCatalogPage(1);
    };

    const handleStockChange = (value) => {
        setStockOnly(value);
        setCatalogPage(1);
    };

    const handleCatalogPageChange = (nextPage) => {
        const safePage = Math.max(1, Number(nextPage) || 1);
        setCatalogPage(safePage);
        const params = new URLSearchParams(window.location.search || '');
        params.set('page', String(safePage));
        navigate(`/catalog?${params.toString()}`);
        requestAnimationFrame(() => {
            catalogTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const handleSearchCommit = (value) => {
        const term = formatSearchTerm(value);
        if (!term) return;
        const current = readSearchHistory();
        const index = current.findIndex((item) => normalizeCatalogLabel(item.term) === normalizeCatalogLabel(term));
        if (index >= 0) {
            current[index] = { ...current[index], count: current[index].count + 1, term };
        } else {
            current.push({ term, count: 1 });
        }
        const sorted = current.sort((a, b) => b.count - a.count).slice(0, SEARCH_HISTORY_LIMIT);
        writeSearchHistory(sorted);
        setRecentTerms(sorted);
    };

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
