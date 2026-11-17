// Página del catálogo de la tienda.
// partes: ./CatalogPageParte.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StoreLayout from "../../../components/layout/StoreLayout";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../../utils/api";
import { useStore } from "../../../context/StoreContext";
import { useTenant } from "../../../context/TenantContext";
import { useAuth } from "../../../context/AuthContext";
import { navigate } from "../../../utils/navigation";
import { getPriceAccessState } from "../../../utils/priceVisibility";
import { getLowStockThreshold } from "../../../utils/stock";
import { getVisibleCatalogCards } from "../../../utils/catalogCards";
import { PIQUIM_SUBCATALOGS } from "../../../data/piquimSubcatalogs";
import { isPiquimTenantIdentity } from "../../../utils/tenantBranding";
import { fetchAllCatalogPages } from "../../../utils/piquimCatalogCategories";
import { buildCatalogCacheKey, getCatalogCache, getProductsRequestPage, isCatalogCacheFresh, setCatalogCache, withImageWidth } from "../../../utils/catalogRequest";
import StoreSkeleton from "../../../components/StoreSkeleton";
import { storeText } from "../../../utils/storeTexts";
import { DEFAULT_SORT, buildCatalogHref, filterCategoryTree, getFiltersFromUrl, isNotExcluded, normalizeFilterValue, normalizePiquimCatalogSlug, normalizePriceFilterValue, normalizeSortValue } from "./filters.js";
import { CATALOG_STYLES, findBrand, findCatalogCardCategory, findCategory, getProductImage, getVariationName, normalizeBrand, normalizeCategory } from "./catalog-data.js";
import { PiquimCatalogLanding } from "./PiquimLanding.jsx";
import { PiquimSubcatalogPage } from "./PiquimSubcatalogPage.jsx";
import { CloseIcon, FilterIcon, ResetIcon } from "./icons.jsx";
import { CatalogFilters } from "./CatalogFilters.jsx";
import { CatalogProductCard, PaginationButton } from "./CatalogProductCard.jsx";

import CatalogPageParte from './CatalogPageParte.jsx';
export default function CatalogPage() {
    const { search, showToast } = useStore();
    const { tenant, settings } = useTenant();
    const isPiquimTenant = isPiquimTenantIdentity({ tenant, settings });
    const catalogText = (key) => storeText("catalog", key, settings?.branding?.catalog_page);
    const { user, loading: authLoading } = useAuth();
    const currency = settings?.commerce?.currency || "ARS";
    const locale = settings?.commerce?.locale || "es-AR";
    const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);
    const showStock = settings?.commerce?.show_stock !== false;
    const lowStockThreshold = getLowStockThreshold(settings);

    const initialFilters = useMemo(() => getFiltersFromUrl(), []);
    const [page, setPage] = useState(initialFilters.page);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(initialFilters.category);
    const [selectedBrand, setSelectedBrand] = useState(initialFilters.brand);
    const [selectedMinPrice, setSelectedMinPrice] = useState(initialFilters.minPrice);
    const [selectedMaxPrice, setSelectedMaxPrice] = useState(initialFilters.maxPrice);
    const [inStockOnly, setInStockOnly] = useState(initialFilters.inStock);
    const [sort, setSort] = useState(initialFilters.sort);
    const [selectedGroup, setSelectedGroup] = useState(initialFilters.group);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [retryKey, setRetryKey] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const productRequestKeyRef = useRef("");
    const limit = isPiquimTenant ? 20 : 12;

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        const syncFiltersFromLocation = () => {
            const next = getFiltersFromUrl();
            setSelectedCategory((prev) => (prev === next.category ? prev : next.category));
            setSelectedBrand((prev) => (prev === next.brand ? prev : next.brand));
            setSelectedMinPrice((prev) => (prev === next.minPrice ? prev : next.minPrice));
            setSelectedMaxPrice((prev) => (prev === next.maxPrice ? prev : next.maxPrice));
            setInStockOnly((prev) => (prev === next.inStock ? prev : next.inStock));
            setSort((prev) => (prev === next.sort ? prev : next.sort));
            setSelectedGroup((prev) => (prev === next.group ? prev : next.group));
            setPage(next.page);
            setMobileFiltersOpen(false);
        };

        window.addEventListener("navigate", syncFiltersFromLocation);
        window.addEventListener("popstate", syncFiltersFromLocation);

        return () => {
            window.removeEventListener("navigate", syncFiltersFromLocation);
            window.removeEventListener("popstate", syncFiltersFromLocation);
        };
    }, []);

    useEffect(() => {
        let active = true;

        const loadMetadata = async () => {
            try {
                const [categoriesRes, brandsRes] = await Promise.all([
                    fetch(`${getApiBase()}/public/categories`, { headers: getTenantHeaders() }),
                    fetch(`${getApiBase()}/public/brands`, { headers: getTenantHeaders() }),
                ]);

                if (active && categoriesRes.ok) {
                    const categoriesData = await categoriesRes.json();
                    const normalizedCategories = Array.isArray(categoriesData)
                        ? (isPiquimTenant
                            ? filterCategoryTree(categoriesData.map(normalizeCategory).filter(Boolean))
                            : categoriesData.map(normalizeCategory).filter(Boolean))
                        : [];
                    setCategories(normalizedCategories);
                }

                if (active && brandsRes.ok) {
                    const brandsData = await brandsRes.json();
                    const normalizedBrands = Array.isArray(brandsData)
                        ? brandsData
                            .map(normalizeBrand)
                            .filter(Boolean)
                            .filter((brand) => !isPiquimTenant || isNotExcluded(brand.name))
                        : [];
                    const uniqueBrands = [...new Map(normalizedBrands.map((item) => [item.id.toLowerCase(), item])).values()];
                    setBrands(uniqueBrands);
                }
            } catch (error) {
                console.error("No se pudieron cargar categorias y marcas", error);
            }
        };

        loadMetadata();

        return () => {
            active = false;
        };
    }, [isPiquimTenant]);

    // El subcatalogo de Piquim trae todos los productos y pagina en el navegador: la pagina de la URL no
    // forma parte del pedido (antes, cambiar de pagina borraba y volvia a pedir todo, y la primera pulsacion
    // se perdia).
    const isPiquimSubcatalogRoute = isPiquimTenant && Boolean(
        PIQUIM_SUBCATALOGS[normalizePiquimCatalogSlug(selectedCategory)]
    );
    const requestPage = getProductsRequestPage({ isPiquimSubcatalog: isPiquimSubcatalogRoute, page });

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const requestKey = JSON.stringify([
            search,
            selectedBrand,
            selectedCategory,
            selectedMaxPrice,
            selectedMinPrice,
            inStockOnly,
            sort,
            requestPage,
        ]);

        const loadProducts = async () => {
            let isPiquimSubcatalog = false;
            try {
                setLoading(true);
                setLoadError("");
                const url = new URL(`${getApiBase()}/public/products`);
                isPiquimSubcatalog = isPiquimTenant && Boolean(
                    PIQUIM_SUBCATALOGS[normalizePiquimCatalogSlug(selectedCategory)]
                );
                const isNewRequest = productRequestKeyRef.current !== requestKey;
                productRequestKeyRef.current = requestKey;
                // El subcatalogo de Piquim filtra y pagina en el cliente: necesita todos los productos.
                url.searchParams.set("page", String(isPiquimSubcatalog ? 1 : requestPage));
                url.searchParams.set("limit", String(isPiquimSubcatalog ? 500 : limit));
                url.searchParams.set("grouped", "true");
                url.searchParams.set("sort", sort);

                if (search.trim()) {
                    url.searchParams.set("q", search.trim());
                }
                if (selectedCategory) {
                    url.searchParams.set("category", selectedCategory);
                }
                if (selectedBrand) {
                    url.searchParams.set("brand", selectedBrand);
                }
                if (selectedMinPrice) {
                    url.searchParams.set("minPrice", selectedMinPrice);
                }
                if (selectedMaxPrice) {
                    url.searchParams.set("maxPrice", selectedMaxPrice);
                }
                if (inStockOnly) {
                    url.searchParams.set("inStock", "true");
                }

                const requestHeaders = { ...getTenantHeaders(), ...getAuthHeaders() };
                // Copia en memoria (precargada o de una visita anterior): se muestra de inmediato y, si ya
                // tiene mas de unos segundos, se actualiza en segundo plano sin pantalla de "cargando".
                const cacheKey = isPiquimSubcatalog ? buildCatalogCacheKey(url.toString(), requestHeaders) : "";
                const cachedEntry = cacheKey ? getCatalogCache(cacheKey) : null;
                if (isPiquimSubcatalog && isNewRequest && !cachedEntry) {
                    setProducts([]);
                    setTotalItems(0);
                }

                const fetchPage = async (pageNumber) => {
                    const pageUrl = new URL(url.toString());
                    pageUrl.searchParams.set("page", String(pageNumber));
                    const response = await fetch(pageUrl.toString(), {
                        headers: requestHeaders,
                        signal: controller.signal,
                    });

                    if (!response.ok) {
                        throw new Error(`Error al cargar el catalogo: ${response.status}`);
                    }
                    return response.json();
                };

                const publishProducts = (data) => {
                    if (!active) return;
                    const items = Array.isArray(data?.items) ? data.items : [];
                    const filteredItems = isPiquimTenant ? items.filter(product => {
                        const categoryName = product.category?.name || "";
                        const brandName = product.brand?.name || "";
                        return isNotExcluded(categoryName) && isNotExcluded(brandName) && isNotExcluded(product.name);
                    }) : items;
                    setProducts(filteredItems);

                    const removedCount = items.length - filteredItems.length;
                    const originalTotal = Number(data?.total || items.length || 0);
                    setTotalItems(Math.max(0, originalTotal - removedCount));
                };

                if (cachedEntry) {
                    publishProducts(cachedEntry.data);
                    setLoading(false);
                    if (isCatalogCacheFresh(cachedEntry)) return;
                }

                const data = isPiquimSubcatalog
                    ? await fetchAllCatalogPages(fetchPage, cachedEntry ? undefined : publishProducts)
                    : await fetchPage(requestPage);
                if (!active) return;
                if (isPiquimSubcatalog) setCatalogCache(cacheKey, data);
                if (!cachedEntry || JSON.stringify(cachedEntry.data) !== JSON.stringify(data)) publishProducts(data);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("No se pudieron cargar los productos", error);
                    if (active) {
                        setLoadError("No se pudieron cargar los productos");
                        // En el subcatalogo se conservan las paginas que ya llegaron.
                        if (!isPiquimSubcatalog) {
                            setProducts([]);
                            setTotalItems(0);
                        }
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            active = false;
            controller.abort();
        };
    }, [inStockOnly, isPiquimTenant, limit, requestPage, retryKey, search, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]);

    const selectedCategoryEntry = useMemo(() => findCategory(categories, selectedCategory), [categories, selectedCategory]);
    const selectedBrandEntry = useMemo(() => findBrand(brands, selectedBrand), [brands, selectedBrand]);

    const categoryTree = useMemo(() => {
        const byId = new Map();
        categories.forEach((item) => {
            byId.set(item.id, { ...item, children: [] });
        });

        const roots = [];
        byId.forEach((item) => {
            if (item.parentId && byId.has(item.parentId)) {
                byId.get(item.parentId).children.push(item);
            } else {
                roots.push(item);
            }
        });

        const sorter = (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });
        roots.sort(sorter);
        roots.forEach((item) => item.children.sort(sorter));
        return roots;
    }, [categories]);

    const catalogProducts = useMemo(() => {
        const mapVariation = (variation) => {
            const variationData = variation?.data || {};
            return {
                id: variation.id,
                sku: variation.sku || variation.erp_id,
                name: variation.name,
                variationName: getVariationName(variation),
                variant: getVariationName(variation),
                desc:
                    variation.short_description ||
                    variationData.short_description ||
                    variationData.shortDescription ||
                    variation.description ||
                    "",
                price: Number(variation.price || 0),
                oldPrice: variationData.old_price ? Number(variationData.old_price) : null,
                image: withImageWidth(getProductImage(variation)),
                alt: variationData.image_alt || variation.name || "Producto",
                stock: variation.stock,
                isWholesaleItem: Boolean(variation?.pricing?.segment && variation.pricing.segment !== "retail"),
                isRoot: variation.is_root === true,
            };
        };

        return products.map((product) => {
            const data = product.data || {};
            const variations = Array.isArray(product?.variations) ? product.variations.map(mapVariation) : [];
            const prices = variations.length ? variations.map((item) => Number(item.price || 0)) : [Number(product.price || 0)];
            const stockLevels = variations.length ? variations.map((item) => Number(item.stock || 0)) : [Number(product.stock || 0)];

            return {
                id: product.id,
                sku: product.sku || product.erp_id,
                name: product.name,
                desc:
                    product.short_description ||
                    data.short_description ||
                    data.shortDescription ||
                    product.description ||
                    "",
                price: Number(product.price || 0),
                minPrice: prices.length ? Math.min(...prices) : Number(product.price || 0),
                maxPrice: prices.length ? Math.max(...prices) : Number(product.price || 0),
                oldPrice: data.old_price ? Number(data.old_price) : null,
                tag: data.tag || null,
                image: withImageWidth(getProductImage(product)),
                alt: data.image_alt || product.name || "Producto",
                stock: stockLevels.reduce((total, current) => total + current, 0),
                isWholesaleItem: Boolean(product?.pricing?.segment && product.pricing.segment !== "retail"),
                variationGroup: product.variation_group,
                variationGroupLabel: product.variation_group_label || data.variant_group_label || data.collection || null,
                variationCount: Number(product.variation_count || variations.length || 1),
                grouped: Boolean(product.grouped) && variations.length > 1,
                variations,
            };
        });
    }, [products]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const activeFilterCount = [
        selectedCategory,
        selectedBrand,
        selectedMinPrice,
        selectedMaxPrice,
        inStockOnly ? "stock" : null,
    ].filter(Boolean).length;

    const applyFilters = useCallback(
        (next = {}) => {
            const nextCategory = Object.prototype.hasOwnProperty.call(next, "category")
                ? normalizeFilterValue(next.category)
                : selectedCategory;
            const nextBrand = Object.prototype.hasOwnProperty.call(next, "brand")
                ? normalizeFilterValue(next.brand)
                : selectedBrand;
            const nextMinPrice = Object.prototype.hasOwnProperty.call(next, "minPrice")
                ? normalizePriceFilterValue(next.minPrice)
                : selectedMinPrice;
            const nextMaxPrice = Object.prototype.hasOwnProperty.call(next, "maxPrice")
                ? normalizePriceFilterValue(next.maxPrice)
                : selectedMaxPrice;
            const nextInStock = Object.prototype.hasOwnProperty.call(next, "inStock")
                ? Boolean(next.inStock)
                : inStockOnly;
            const nextSort = Object.prototype.hasOwnProperty.call(next, "sort")
                ? normalizeSortValue(next.sort)
                : sort;
            const nextMinNumber = Number(nextMinPrice);
            const nextMaxNumber = Number(nextMaxPrice);
            const normalizedMinPrice =
                nextMinPrice && nextMaxPrice && Number.isFinite(nextMinNumber) && Number.isFinite(nextMaxNumber) && nextMinNumber > nextMaxNumber
                    ? String(nextMaxNumber)
                    : nextMinPrice;
            const normalizedMaxPrice =
                nextMinPrice && nextMaxPrice && Number.isFinite(nextMinNumber) && Number.isFinite(nextMaxNumber) && nextMinNumber > nextMaxNumber
                    ? String(nextMinNumber)
                    : nextMaxPrice;

            setSelectedCategory(nextCategory);
            setSelectedBrand(nextBrand);
            setSelectedMinPrice(normalizedMinPrice);
            setSelectedMaxPrice(normalizedMaxPrice);
            setInStockOnly(nextInStock);
            setSort(nextSort);
            setPage(1);
            setMobileFiltersOpen(false);
            navigate(buildCatalogHref({
                category: nextCategory,
                brand: nextBrand,
                minPrice: normalizedMinPrice,
                maxPrice: normalizedMaxPrice,
                inStock: nextInStock,
                sort: nextSort,
                page: 1,
            }));
        },
        [inStockOnly, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]
    );

    const handlePageChange = useCallback((nextPage) => {
        const safePage = Math.max(1, Number(nextPage) || 1);
        setPage(safePage);
        navigate(buildCatalogHref({ category: selectedCategory, brand: selectedBrand, minPrice: selectedMinPrice, maxPrice: selectedMaxPrice, inStock: inStockOnly, sort, page: safePage }));
    }, [inStockOnly, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]);

    const resetFilters = useCallback(() => {
        applyFilters({ category: null, brand: null, minPrice: "", maxPrice: "", inStock: false, sort: DEFAULT_SORT });
    }, [applyFilters]);

    const chips = useMemo(() => {
        const next = [];
        if (selectedCategoryEntry) {
            next.push({ id: "category", label: selectedCategoryEntry.name, clear: () => applyFilters({ category: null }) });
        }
        if (selectedBrandEntry) {
            next.push({ id: "brand", label: selectedBrandEntry.name, clear: () => applyFilters({ brand: null }) });
        }
        if (selectedMinPrice || selectedMaxPrice) {
            next.push({
                id: "price",
                label: `Precio ${selectedMinPrice ? `desde ${selectedMinPrice}` : ""}${selectedMinPrice && selectedMaxPrice ? " " : ""}${selectedMaxPrice ? `hasta ${selectedMaxPrice}` : ""}`.trim(),
                clear: () => applyFilters({ minPrice: "", maxPrice: "" }),
            });
        }
        if (inStockOnly) {
            next.push({ id: "stock", label: "Solo con stock", clear: () => applyFilters({ inStock: false }) });
        }
        return next;
    }, [applyFilters, inStockOnly, selectedBrandEntry, selectedCategoryEntry, selectedMaxPrice, selectedMinPrice]);

    const quickCategories = useMemo(() => categoryTree.slice(0, 4), [categoryTree]);
    const quickBrands = useMemo(() => brands.slice(0, 4), [brands]);
    // Tarjetas de la portada del catalogo: lo guardado en el panel pisa los valores por defecto y las
    // ocultas ("Pagina catalogo" en el admin) no se muestran.
    const catalogCards = useMemo(
        () => (isPiquimTenant ? getVisibleCatalogCards(settings?.branding?.catalog_cards) : []),
        [isPiquimTenant, settings?.branding?.catalog_cards]
    );

    const handleCatalogCardClick = useCallback((card) => {
        const directSlug = normalizePiquimCatalogSlug(card?.categorySlug || card?.slug || card?.category || card?.id);
        if (PIQUIM_SUBCATALOGS[directSlug]) {
            applyFilters({ category: directSlug });
            return;
        }
        const matchedCategory = findCatalogCardCategory(categories, card);
        const fallback = card?.categorySlug || card?.category || card?.id || card?.title;
        applyFilters({ category: matchedCategory?.id || fallback });
    }, [applyFilters, categories]);

    const handleFavoriteChange = (_product, added) => {
        if (added) {
            showToast("Producto anadido a favoritos");
        }
    };

    const resultsSummary = useMemo(() => {
        if (search.trim()) {
            return `Resultados para "${search.trim()}"`;
        }
        if (selectedCategoryEntry && selectedBrandEntry) {
            return `${selectedCategoryEntry.name} / ${selectedBrandEntry.name}`;
        }
        if (selectedCategoryEntry) {
            return `Explora ${selectedCategoryEntry.name}`;
        }
        if (selectedBrandEntry) {
            return `Productos de ${selectedBrandEntry.name}`;
        }
        if (selectedMinPrice || selectedMaxPrice || inStockOnly) {
            return "Resultados refinados por precio, disponibilidad y familias de producto.";
        }
        return isPiquimTenant
            ? "Materia prima profesional para heladerias, panaderias y confiterias."
            : catalogText("description");
    }, [inStockOnly, isPiquimTenant, settings?.branding?.catalog_page, search, selectedBrandEntry, selectedCategoryEntry, selectedMaxPrice, selectedMinPrice]);

    const isCatalogLanding = !search.trim()
        && !selectedCategory
        && !selectedBrand
        && !selectedMinPrice
        && !selectedMaxPrice
        && !inStockOnly
        && normalizeSortValue(sort) === DEFAULT_SORT;

    // Sin tarjetas visibles no hay portada: se abre directo el listado de productos.
    if (isPiquimTenant && isCatalogLanding && catalogCards.length > 0) {
        return (
            <StoreLayout overlay>
                <PiquimCatalogLanding cards={catalogCards} onSelectCard={handleCatalogCardClick} />
            </StoreLayout>
        );
    }

    const selectedSubcatalogKey = normalizePiquimCatalogSlug(selectedCategoryEntry?.slug || selectedCategoryEntry?.name || selectedCategory);
    const selectedSubcatalog = PIQUIM_SUBCATALOGS[selectedSubcatalogKey];

    if (isPiquimTenant && selectedSubcatalog) {
        const subcatalogLabels = settings?.branding?.subcatalog_filters || {};
        return (
            <StoreLayout>
                <PiquimSubcatalogPage
                    key={`${selectedSubcatalog.slug}:${selectedGroup}`}
                    catalog={selectedSubcatalog}
                    initialGroup={selectedGroup}
                    categories={categories}
                    products={products}
                    loading={loading}
                    loadError={loadError}
                    onRetry={() => setRetryKey((value) => value + 1)}
                    currency={currency}
                    locale={locale}
                    onProductClick={(productId, context = {}) => {
                        const params = new URLSearchParams();
                        params.set("catalog", selectedSubcatalog.slug);
                        const groupLabel = String(context.group || "").trim();
                        if (groupLabel) params.set("group", groupLabel);
                        const filterLabel = String(context.filter || "").trim();
                        if (filterLabel) params.set("filter", filterLabel);
                        navigate(`/product/${productId}?${params.toString()}`);
                    }}
                    labels={subcatalogLabels}
                />
            </StoreLayout>
        );
    }

    return (
        <CatalogPageParte activeFilterCount={activeFilterCount} applyFilters={applyFilters} authLoading={authLoading} brands={brands} canViewPrices={canViewPrices} catalogProducts={catalogProducts} catalogText={catalogText} categoryTree={categoryTree} chips={chips} currency={currency} handleFavoriteChange={handleFavoriteChange} handlePageChange={handlePageChange} inStockOnly={inStockOnly} loading={loading} locale={locale} lowStockThreshold={lowStockThreshold} mobileFiltersOpen={mobileFiltersOpen} page={page} resetFilters={resetFilters} resultsSummary={resultsSummary} selectedBrand={selectedBrand} selectedBrandEntry={selectedBrandEntry} selectedCategory={selectedCategory} selectedCategoryEntry={selectedCategoryEntry} selectedMaxPrice={selectedMaxPrice} selectedMinPrice={selectedMinPrice} setMobileFiltersOpen={setMobileFiltersOpen} showPricesEnabled={showPricesEnabled} showStock={showStock} sort={sort} totalItems={totalItems} totalPages={totalPages} />
    );
}
