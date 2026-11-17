// Página de un subcatálogo de Piquim.
// partes: ./PiquimSubcatalogPageParte.jsx
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

import PiquimSubcatalogPageParte from './PiquimSubcatalogPageParte.jsx';
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
        <PiquimSubcatalogPageParte availableFormats={availableFormats} availableTypes={availableTypes} catalog={catalog} catalogTopRef={catalogTopRef} currency={currency} expandedSections={expandedSections} flavorFilters={flavorFilters} formatFilters={formatFilters} handleCatalogPageChange={handleCatalogPageChange} handleQueryChange={handleQueryChange} handleSearchCommit={handleSearchCommit} handleStockChange={handleStockChange} handleSuggestionPick={handleSuggestionPick} labels={labels} loadError={loadError} loading={loading} locale={locale} normalizedProducts={normalizedProducts} onProductClick={onProductClick} onRetry={onRetry} paginatedProducts={paginatedProducts} paginationItems={paginationItems} productSuggestions={productSuggestions} query={query} resolvedCatalog={resolvedCatalog} sections={sections} setExpandedSections={setExpandedSections} setFlavorFilters={setFlavorFilters} setFormatFilters={setFormatFilters} setTypeFilters={setTypeFilters} stockOnly={stockOnly} toggleFilter={toggleFilter} trendingSuggestions={trendingSuggestions} typeFilters={typeFilters} usesConfiguredGroups={usesConfiguredGroups} visibleRangeEnd={visibleRangeEnd} visibleRangeStart={visibleRangeStart} />
    );
}
