import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Flame, Snowflake } from "lucide-react";
import StoreLayout from "../../components/layout/StoreLayout";
import { formatCurrency } from "../../utils/format";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../utils/api";
import { useStore } from "../../context/StoreContext";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import { navigate } from "../../utils/navigation";
import { getPriceAccessState } from "../../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../../utils/stock";
import { createPlaceholderImage } from "../../utils/productImage";
import { PIQUIM_CATALOG_CARDS } from "../../data/piquimBranding";
import { PIQUIM_SUBCATALOGS } from "../../data/piquimSubcatalogs";
import { isPiquimTenantIdentity } from "../../utils/tenantBranding";
import {
    buildCatalogPaginationModel,
    buildPiquimCategoryGroups,
    fetchAllCatalogPages,
    paginateCatalogItems,
    resolvePiquimProductGroups,
    selectCanonicalCatalogMemberships,
    synchronizeCatalogPageRequest,
} from "../../utils/piquimCatalogCategories";
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import StoreSkeleton from "../../components/StoreSkeleton";
const FALLBACK_IMAGE = createPlaceholderImage({ label: "Producto", width: 720, height: 720 });
const PIQUIM_PAGE_SIZE = 20;
const EXCLUDED_TERMS = [
    "accesorios de gas",
    "accesorios polietileno",
    "accesorios polipropileno",
    "accesorios sanitarios",
    "alessitech",
    "decca",
    "ferrum",
    "fogata"
];

const isNotExcluded = (name) => {
    if (!name) return true;
    const lowerName = name.toLowerCase();
    return !EXCLUDED_TERMS.some(t => lowerName.includes(t));
};

const filterCategoryTree = (categories) => {
    return categories
        .filter(c => isNotExcluded(c.name))
        .map(c => ({
            ...c,
            children: c.children ? filterCategoryTree(c.children) : []
        }));
};
const DEFAULT_SORT = "name-asc";
const SORT_OPTIONS = [
    { value: "name-asc", label: "Nombre A-Z" },
    { value: "name-desc", label: "Nombre Z-A" },
    { value: "price-asc", label: "Precio menor a mayor" },
    { value: "price-desc", label: "Precio mayor a menor" },
    { value: "stock-desc", label: "Mayor stock" },
    { value: "stock-asc", label: "Menor stock" },
];

const normalizeFilterValue = (value) => {
    const raw = String(value || "").trim();
    return raw || null;
};

const normalizeCatalogLabel = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const normalizePiquimCatalogSlug = (value) => {
    const normalized = normalizeCatalogLabel(value);
    return normalized === "confiteria" ? "panaderia" : normalized;
};

const formatSearchTerm = (value) =>
    String(value || "")
        .trim()
        .replace(/\s+/g, " ");

const SEARCH_HISTORY_KEY = "piquim_search_terms_v1";
const SEARCH_HISTORY_LIMIT = 12;

const readSearchHistory = () => {
    try {
        const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => ({
                term: formatSearchTerm(item?.term || item),
                count: Number(item?.count || 0) || 0,
            }))
            .filter((item) => item.term);
    } catch {
        return [];
    }
};

const writeSearchHistory = (nextHistory) => {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory.slice(0, SEARCH_HISTORY_LIMIT)));
    } catch {
        // ignore storage errors
    }
};

const normalizePriceFilterValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return "";
    return String(parsed);
};

const parseBooleanFilter = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return ["true", "1", "yes", "si", "on"].includes(normalized);
};

const normalizeSortValue = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return SORT_OPTIONS.some((option) => option.value === normalized) ? normalized : DEFAULT_SORT;
};

const getFiltersFromUrl = () => {
    const params = new URLSearchParams(window.location.search || "");
    return {
        category: normalizeFilterValue(params.get("category")),
        brand: normalizeFilterValue(params.get("brand")),
        minPrice: normalizePriceFilterValue(params.get("minPrice")),
        maxPrice: normalizePriceFilterValue(params.get("maxPrice")),
        inStock: parseBooleanFilter(params.get("inStock")),
        sort: normalizeSortValue(params.get("sort")),
    };
};

const buildCatalogHref = ({ category, brand, minPrice, maxPrice, inStock, sort }) => {
    const params = new URLSearchParams();
    if (normalizeFilterValue(category)) {
        params.set("category", normalizeFilterValue(category));
    }
    if (normalizeFilterValue(brand)) {
        params.set("brand", normalizeFilterValue(brand));
    }
    if (normalizePriceFilterValue(minPrice)) {
        params.set("minPrice", normalizePriceFilterValue(minPrice));
    }
    if (normalizePriceFilterValue(maxPrice)) {
        params.set("maxPrice", normalizePriceFilterValue(maxPrice));
    }
    if (inStock) {
        params.set("inStock", "true");
    }
    if (normalizeSortValue(sort) !== DEFAULT_SORT) {
        params.set("sort", normalizeSortValue(sort));
    }
    const query = params.toString();
    return query ? `/catalog?${query}` : "/catalog";
};

const getProductImage = (product) => {
    const data = product?.data || {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        FALLBACK_IMAGE
    );
};

const getRealProductImage = (product) => {
    const data = product?.data || {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        ""
    );
};

const getVariationName = (product) => {
    const explicit = String(product?.variation_label || "").trim();
    if (explicit) return explicit;
    const data = product?.data || {};
    const specs = data.specifications && typeof data.specifications === "object" ? data.specifications : {};
    return (
        String(data.variant_label || data.variant || specs.color || specs.acabado || specs.modelo || product?.sku || product?.name || "")
            .trim() || "Variacion"
    );
};

const CATALOG_STYLES = {
    shell: { backgroundColor: "var(--catalog-shell-bg, #f7f3ee)" },
    panel: {
        backgroundColor: "var(--catalog-panel-bg, #fffdfb)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    surface: {
        backgroundColor: "var(--catalog-surface-bg, #fcfbfa)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    card: {
        backgroundColor: "var(--catalog-card-bg, #ffffff)",
        borderColor: "var(--catalog-border, #e5e1de)",
    },
    media: { backgroundColor: "var(--catalog-surface-bg, #fcfbfa)" },
    border: { borderColor: "var(--catalog-border, #e5e1de)" },
    muted: { color: "var(--catalog-muted-text, #8a7560)" },
};

const normalizeCategory = (item) => {
    if (!item || (!item.id && !item.slug && !item.name)) return null;
    const name = String(item.name || item.slug || item.id).trim();
    if (!name) return null;

    return {
        id: String(item.id || item.slug || name).trim(),
        slug: String(item.slug || "").trim() || null,
        name,
        parentId: String(item.parent_id || "").trim() || null,
        parentName: String(item.parent_name || "").trim() || null,
    };
};

const normalizeBrand = (item) => {
    if (typeof item === "string") {
        const name = item.trim();
        return name ? { id: name, name } : null;
    }

    if (!item) return null;
    const name = String(item.name || item.id || "").trim();
    if (!name) return null;

    return {
        id: String(item.id || name).trim(),
        name,
    };
};

const findCategory = (categories, value) => {
    const normalized = normalizeFilterValue(value);
    if (!normalized) return null;
    return categories.find((item) => item.id === normalized || item.slug === normalized || item.name === normalized) || null;
};

const findBrand = (brands, value) => {
    const normalized = normalizeFilterValue(value);
    if (!normalized) return null;
    return brands.find((item) => item.id === normalized || item.name === normalized) || null;
};

const findCatalogCardCategory = (categories, card) => {
    const target = normalizeCatalogLabel(card?.category || card?.categorySlug || card?.title || card?.id);
    if (!target) return null;
    return categories.find((item) => {
        const values = [item.id, item.slug, item.name].map(normalizeCatalogLabel);
        return values.includes(target);
    }) || null;
};

export default function CatalogPage() {
    const { search, showToast } = useStore();
    const { tenant, settings } = useTenant();
    const isPiquimTenant = isPiquimTenantIdentity({ tenant, settings });
    const { user, loading: authLoading } = useAuth();
    const currency = settings?.commerce?.currency || "ARS";
    const locale = settings?.commerce?.locale || "es-AR";
    const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);
    const showStock = settings?.commerce?.show_stock !== false;
    const lowStockThreshold = getLowStockThreshold(settings);

    const initialFilters = useMemo(() => getFiltersFromUrl(), []);
    const [page, setPage] = useState(1);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(initialFilters.category);
    const [selectedBrand, setSelectedBrand] = useState(initialFilters.brand);
    const [selectedMinPrice, setSelectedMinPrice] = useState(initialFilters.minPrice);
    const [selectedMaxPrice, setSelectedMaxPrice] = useState(initialFilters.maxPrice);
    const [inStockOnly, setInStockOnly] = useState(initialFilters.inStock);
    const [sort, setSort] = useState(initialFilters.sort);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [retryKey, setRetryKey] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const productRequestKeyRef = useRef("");
    const limit = 12;

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
            setPage(1);
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
            page,
        ]);

        const loadProducts = async () => {
            let progressiveItemCount = 0;
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
                if (isPiquimSubcatalog && isNewRequest) {
                    setProducts([]);
                    setTotalItems(0);
                }
                url.searchParams.set("page", String(isPiquimSubcatalog ? 1 : page));
                url.searchParams.set("limit", String(isPiquimSubcatalog ? 48 : limit));
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

                const fetchPage = async (pageNumber) => {
                    const pageUrl = new URL(url.toString());
                    pageUrl.searchParams.set("page", String(pageNumber));
                    const response = await fetch(pageUrl.toString(), {
                        headers: { ...getTenantHeaders(), ...getAuthHeaders() },
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
                    progressiveItemCount = filteredItems.length;
                    setProducts((current) => {
                        if (!isPiquimSubcatalog || isNewRequest) return filteredItems;
                        const merged = new Map(current.map((product) => [product.id, product]));
                        filteredItems.forEach((product) => merged.set(product.id, product));
                        return [...merged.values()];
                    });

                    const removedCount = items.length - filteredItems.length;
                    const originalTotal = Number(data?.total || items.length || 0);
                    setTotalItems(Math.max(0, originalTotal - removedCount));
                };

                const data = isPiquimSubcatalog
                    ? await fetchAllCatalogPages(fetchPage, publishProducts)
                    : await fetchPage(page);
                if (!active) return;
                publishProducts(data);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("No se pudieron cargar los productos", error);
                    if (active) {
                        setLoadError(progressiveItemCount > 0
                            ? "No se pudieron cargar algunos productos"
                            : "No se pudieron cargar los productos");
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
    }, [inStockOnly, isPiquimTenant, limit, page, retryKey, search, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]);

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
                image: getProductImage(variation),
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
                image: getProductImage(product),
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
            }));
        },
        [inStockOnly, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]
    );

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
    const catalogCards = useMemo(() => {
        if (!isPiquimTenant) return [];
        const configured = settings?.branding?.catalog_cards;
        const source = Array.isArray(configured) && configured.length ? configured : PIQUIM_CATALOG_CARDS;
        const combinedPanaderia = PIQUIM_CATALOG_CARDS.find((card) => card.id === "panaderia") || {};
        return source
            .filter((card) => normalizeCatalogLabel(card?.categorySlug || card?.slug || card?.category || card?.id || card?.title) !== "confiteria")
            .map((card) => {
                const slug = normalizePiquimCatalogSlug(card?.categorySlug || card?.slug || card?.category || card?.id || card?.title);
                if (slug !== "panaderia") return card;
                return {
                    ...card,
                    ...combinedPanaderia,
                    category: "panaderia",
                    categorySlug: "panaderia",
                };
            });
    }, [isPiquimTenant, settings?.branding?.catalog_cards]);

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
            : "Catalogo online para consultar productos, disponibilidad y opciones comerciales.";
    }, [inStockOnly, isPiquimTenant, search, selectedBrandEntry, selectedCategoryEntry, selectedMaxPrice, selectedMinPrice]);

    const isCatalogLanding = !search.trim()
        && !selectedCategory
        && !selectedBrand
        && !selectedMinPrice
        && !selectedMaxPrice
        && !inStockOnly
        && normalizeSortValue(sort) === DEFAULT_SORT;

    if (isPiquimTenant && isCatalogLanding) {
        return (
            <StoreLayout>
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
                    key={selectedSubcatalog.slug}
                    catalog={selectedSubcatalog}
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
                                Catalogo completo
                            </span>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tight text-[#181411] dark:text-white md:text-4xl">
                                    {selectedCategoryEntry?.name || selectedBrandEntry?.name || "Todos los productos"}
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
                                <p className="text-lg font-bold text-[#181411] dark:text-white">No encontramos productos para esta busqueda.</p>
                                <p className="mt-2 text-sm">Prueba con otra categoria, otra marca o limpia los filtros activos.</p>
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
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                                            onClick={() => setPage(pageNumber)}
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
                                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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

const PIQUIM_EXACT_CARDS = [
    {
        id: 'heladeria',
        slug: 'heladeria',
        prefix: '01 — Frío que enamora',
        title: 'Heladería',
        tags: ['Estabilizantes', 'Aditivos'],
        description: 'Materia prima para la elaboración de productos de heladería artesanal de altísima calidad.',
        image: '/piquim/catalogo/card-heladeria.png',
        imageStyle: { width: 566, height: 700, left: -64, top: 0 },
        overlay: 'linear-gradient(180deg, rgba(107, 184, 224, 0.56) 0%, rgba(26, 22, 20, 0.80) 100%)',
        width: 478,
    },
    {
        id: 'panaderia',
        slug: 'panaderia',
        prefix: '02 — Hornear y decorar',
        title: 'Panadería/Confitería',
        tags: ['Premezclas', 'Mejoradores', 'Cremas', 'DDL'],
        description: 'Premezclas, mejoradores, cremas y bases para panaderia, reposteria y confiteria profesional.',
        image: '/piquim/catalogo/card-panaderia.png',
        imageStyle: { width: 770, height: 752, left: -210, top: -26 },
        overlay: 'linear-gradient(180deg, rgba(212, 162, 74, 0.56) 0%, rgba(26, 22, 20, 0.80) 100%)',
        width: 478,
    },
];

function PiquimCatalogLanding({ onSelectCard }) {
    return (
        <div className="min-h-screen bg-[#FFFAF6] font-[Inter] text-[#1A1614]">
            <div className="w-full overflow-hidden bg-[#FFFAF6]">
                <section className="w-full overflow-hidden pt-[86px] max-md:pt-[74px]">
                    <div className="grid w-full grid-cols-1 items-stretch gap-0.5 overflow-hidden rounded-t-[45px] bg-[#FF4D00] lg:grid-cols-2">
                        {PIQUIM_EXACT_CARDS.map((card) => (
                            <PiquimExactCatalogCard
                                key={card.id}
                                card={card}
                                onClick={() => onSelectCard({ ...card, categorySlug: card.slug, category: card.slug })}
                            />
                        ))}
                    </div>
                </section>
                <PiquimCatalogFooter />
            </div>
        </div>
    );
}

function PiquimCatalogHeader() {
    return (
        <div className="fixed left-0 right-0 top-0 z-50 flex w-full flex-col items-center justify-center overflow-hidden border-b border-[#E8DFD8]/80 bg-[#FFFAF6]/35 px-[60px] py-[18px] backdrop-blur-2xl max-md:px-4">
            <div className="inline-flex w-full items-center justify-center overflow-hidden rounded-[30px] bg-[linear-gradient(90deg,rgba(255,191,140,0.74)_0%,rgba(255,239,232,0.62)_48%,rgba(255,191,140,0.74)_100%)] px-[60px] py-[18px] shadow-[0_18px_60px_rgba(255,77,0,0.12)] outline outline-1 -outline-offset-1 outline-[#E8DFD8]/90 backdrop-blur-2xl max-md:px-5">
                <button type="button" onClick={() => navigate('/')} className="shrink-0" aria-label="Ir a inicio">
                    <img src="/piquim/catalogo/logo-navbar.png" alt="Piquim" style={{ width: 108, height: 31 }} />
                </button>

                <nav className="flex flex-1 items-center justify-center gap-8 overflow-hidden max-md:hidden">
                    <button type="button" onClick={() => navigate('/')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Inicio
                    </button>
                    <button type="button" onClick={() => navigate('/catalog')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Catálogos
                    </button>
                    <button type="button" onClick={() => navigate('/about')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Nosotros
                    </button>
                </nav>

                <div className="flex items-center justify-center gap-3.5 overflow-hidden">
                    <button type="button" onClick={() => navigate('/catalog')} className="flex items-center justify-center overflow-hidden rounded-full" aria-label="Buscar">
                        <SearchIcon className="size-6 text-black" />
                    </button>
                    <button type="button" onClick={() => navigate('/profile')} className="flex items-center justify-center overflow-hidden rounded-full max-sm:hidden" aria-label="Guardados">
                        <BookmarkIcon className="size-6 text-black" />
                    </button>
                    <button type="button" onClick={() => navigate('/cart')} className="flex items-center justify-center overflow-hidden rounded-full" aria-label="Carrito">
                        <CartIcon className="size-6 text-black" />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="flex h-6 w-[100px] items-center justify-center gap-5 overflow-hidden rounded-full bg-[#FF4D00] text-sm font-bold text-[#FFFAF6] max-sm:hidden"
                        style={{ fontFamily: 'Gilroy, sans-serif' }}
                    >
                        Registrarse
                    </button>
                </div>
            </div>
        </div>
    );
}

function PiquimExactCatalogCard({ card, onClick }) {
    return (
        <article
            className="relative h-[700px] w-full overflow-hidden bg-[#1A1614] lg:h-[calc(100vh-113px)] lg:min-h-[700px]"
        >
            <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: card.overlay }} />
            <div className="absolute inset-x-10 bottom-[30px] inline-flex min-h-[290px] flex-col items-center justify-center gap-4 overflow-hidden">
                <div className="inline-flex items-center justify-center gap-3 overflow-hidden">
                    <div className="text-[11px] font-bold text-white" style={{ fontFamily: 'Gilroy, sans-serif', letterSpacing: 1.98 }}>
                        {card.prefix}
                    </div>
                </div>
                <h2 className="text-[56px] font-black italic leading-none text-[#FF4D00]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                    {card.title}
                </h2>
                <div className="inline-flex w-full max-w-[398px] flex-wrap content-center items-center justify-center gap-1.5 overflow-hidden">
                    {card.tags.map((tag) => (
                        <span
                            key={`${card.id}-${tag}`}
                            className="flex items-start justify-start overflow-hidden rounded-full bg-white/15 px-2.5 py-[5px] text-[10px] font-medium text-[#FFFAF6] outline outline-1 -outline-offset-1 outline-white"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="w-full max-w-80 text-center text-[13px] font-normal leading-[19.5px] text-[#FFFAF6]" style={{ fontFamily: 'HelveticaNeueW01-66MediumIt, Gilroy, sans-serif' }}>
                    {card.description}
                </p>
                <button
                    type="button"
                    onClick={onClick}
                    className="inline-flex items-center justify-center gap-2 overflow-hidden border-b-2 border-[#FF4D00] pb-1"
                >
                    <span className="text-[11px] font-bold text-[#FFFAF6]" style={{ letterSpacing: 0.88 }}>VER CATÁLOGO</span>
                    <span className="text-sm font-bold text-[#FFFAF6]">→</span>
                </button>
            </div>
        </article>
    );
}

function PiquimCatalogFooter() {
    const shopLinks = [
        { label: 'Heladería', href: '/catalog?category=heladeria' },
        { label: 'Panadería/Confitería', href: '/catalog?category=panaderia' },
        { label: 'Promociones', href: '/catalog' },
    ];
    const helpLinks = ['Envíos y entregas', 'Pagos y facturación', 'Cambios y devoluciones', 'Preguntas frecuentes'];
    const legalLinks = ['Términos', 'Privacidad', 'Cookies', 'Defensa al consumidor'];

    return (
        <footer className="flex w-full flex-col items-start justify-start overflow-hidden bg-[#1A1614]">
            <div className="inline-flex w-full items-start justify-center gap-[130px] overflow-hidden px-[120px] pb-[60px] pt-20 max-xl:flex-wrap max-xl:gap-12 max-xl:px-8">
                <div className="inline-flex w-[280px] flex-col items-start justify-start gap-5 overflow-hidden">
                    <img src="/piquim/catalogo/logo-footer.png" alt="Piquim" style={{ width: 142, height: 41 }} />
                    <p className="w-[280px] text-[13px] font-normal leading-[22.1px] text-[#B5ADA8]">
                        Materia prima premium para heladerías, panaderías y confiterías. Mar del Plata, desde 1992.
                    </p>
                    <div className="inline-flex items-start justify-start gap-2.5 overflow-hidden">
                        {['IG', 'FB', 'YT', 'TT'].map((item) => (
                            <span key={item} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-[#FFFAF6] outline outline-1 -outline-offset-1 outline-[#4A4441]" style={{ letterSpacing: 0.66 }}>
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <PiquimFooterColumn title="COMPRAR" links={shopLinks} />
                <PiquimFooterColumn title="AYUDA" links={helpLinks.map((label) => ({ label, href: '/about' }))} />

                <div className="inline-flex w-[280px] flex-col items-start justify-start gap-4 overflow-hidden">
                    <h3 className="text-[11px] font-bold text-[#FF4D00]" style={{ letterSpacing: 2.2 }}>NEWSLETTER</h3>
                    <p className="w-[280px] text-[13px] font-normal leading-[22.1px] text-[#B5ADA8]">
                        Recetas, novedades y descuentos para profesionales. Una vez al mes. Sin spam.
                    </p>
                    <div className="inline-flex w-full items-start justify-start overflow-hidden rounded-full bg-[rgba(74,68,65,0.40)]">
                        <div className="flex flex-1 items-start justify-start overflow-hidden py-3.5 pl-[18px]">
                            <span className="text-[13px] font-normal text-[#B5ADA8]">tu@email.com</span>
                        </div>
                        <button type="button" className="flex items-start justify-start overflow-hidden bg-[#FF4D00] px-[22px] py-3.5 text-base font-bold text-white">
                            →
                        </button>
                    </div>
                    <p className="w-[280px] text-[11px] font-normal leading-[17.6px] text-[#B5ADA8]">
                        Al suscribirte aceptás nuestros Términos y Política de privacidad.
                    </p>
                </div>
            </div>
            <div className="h-px w-full bg-[rgba(74,68,65,0.50)]" />
            <div className="inline-flex w-full items-center justify-between overflow-hidden px-[120px] py-7 max-xl:flex-col max-xl:items-start max-xl:gap-5 max-xl:px-8">
                <p className="text-xs font-normal text-[#B5ADA8]">
                    © 2026 Piquim Profesional S.A.  ·  Mar del Plata, Argentina  ·  CUIT 30-XXXXXXXX-X
                </p>
                <div className="flex items-start justify-start gap-7 overflow-hidden">
                    {legalLinks.map((label) => (
                        <button key={label} type="button" onClick={() => navigate('/about')} className="text-xs font-medium text-[#FFFAF6]">
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </footer>
    );
}

const getConfiguredGroupTitles = (catalog) =>
    Array.isArray(catalog?.productGroups)
        ? catalog.productGroups.map((group) => group.title).filter(Boolean)
        : [];

const getConfiguredCategoryTitles = (catalog) =>
    Array.isArray(catalog?.productGroups)
        ? catalog.productGroups.flatMap((group) =>
            (Array.isArray(group.categories) ? group.categories : []).map((category) => category.title).filter(Boolean)
        )
        : [];

const getPiquimCatalogDisplayLabel = (catalog) => {
    const fixedLabels = {
        heladeria: 'Heladería',
        panaderia: 'Panadería/Confitería',
        confiteria: 'Panadería/Confitería',
    };
    return fixedLabels[catalog?.slug] || String(catalog?.headingAccent || catalog?.slug || 'Catalogo').replace(/^de\s+/i, '');
};

const matchesCatalogKeyword = (haystack, value) => {
    const normalized = normalizeCatalogLabel(value);
    return Boolean(normalized) && haystack.includes(normalized);
};

const getFlavorSearchTerms = (flavor) => [
    flavor?.name,
    ...(Array.isArray(flavor?.keywords) ? flavor.keywords : []),
    ...String(flavor?.name || "").split("/"),
].map((item) => String(item || "").trim()).filter(Boolean);

const resolveConfiguredProductGroups = (catalog, product, labels = {}) => {
    if (!Array.isArray(catalog?.productGroups) || !catalog.productGroups.length) return [];

    const data = product?.data || {};
    const categoryNames = Array.isArray(product?.category_names) ? product.category_names : [];
    const categoryPaths = Array.isArray(product?.category_paths) ? product.category_paths : [];
    const sourcePath = [
        ...categoryPaths,
        ...categoryNames,
        ...(Array.isArray(product?.source_category_path) ? product.source_category_path : []),
        ...(Array.isArray(data?.source_category_path) ? data.source_category_path : []),
    ];
    const haystack = normalizeCatalogLabel([
        product?.name,
        product?.sku,
        product?.erp_id,
        product?.category?.name,
        data?.category,
        data?.source_category,
        labels.category,
        labels.type,
        labels.format,
        ...sourcePath,
    ].filter(Boolean).join(" "));
    const matches = [];
    const seen = new Set();

    const addMatch = (groupTitle, categoryTitle) => {
        const key = `${groupTitle}::${categoryTitle}`;
        if (seen.has(key)) return;
        seen.add(key);
        matches.push({ groupTitle, categoryTitle });
    };

    for (const group of catalog.productGroups) {
        const groupKeywords = [
            group.title,
            ...(Array.isArray(group.keywords) ? group.keywords : []),
            ...(Array.isArray(group.flavors) ? group.flavors.flatMap(getFlavorSearchTerms) : []),
        ];
        const groupMatches = groupKeywords.some((keyword) => matchesCatalogKeyword(haystack, keyword));
        const categories = Array.isArray(group.categories) ? group.categories : [];

        for (const category of categories) {
            const categoryKeywords = [category.title, ...(Array.isArray(category.keywords) ? category.keywords : [])];
            if (categoryKeywords.some((keyword) => matchesCatalogKeyword(haystack, keyword))) {
                addMatch(group.title, category.title);
            }
        }

        if (groupMatches && !matches.some((item) => item.groupTitle === group.title)) {
            addMatch(group.title, categories[0]?.title || group.title);
        }
    }

    return matches;
};

const resolveConfiguredProductGroup = (catalog, product, labels = {}) =>
    resolveConfiguredProductGroups(catalog, product, labels)[0] || null;

const resolveConfiguredProductFlavor = (catalog, groupTitle, product, labels = {}) => {
    if (!Array.isArray(catalog?.productGroups) || !groupTitle) return null;
    const group = catalog.productGroups.find((item) => item.title === groupTitle);
    const flavors = Array.isArray(group?.flavors) ? group.flavors : [];
    if (!flavors.length) return null;

    const data = product?.data || {};
    const categoryNames = Array.isArray(product?.category_names) ? product.category_names : [];
    const categoryPaths = Array.isArray(product?.category_paths) ? product.category_paths : [];
    const sourcePath = [
        ...categoryPaths,
        ...categoryNames,
        ...(Array.isArray(product?.source_category_path) ? product.source_category_path : []),
        ...(Array.isArray(data?.source_category_path) ? data.source_category_path : []),
    ];
    const haystack = normalizeCatalogLabel([
        product?.name,
        product?.sku,
        product?.erp_id,
        product?.category?.name,
        data?.category,
        data?.source_category,
        labels.category,
        labels.type,
        labels.format,
        ...sourcePath,
    ].filter(Boolean).join(" "));

    return flavors.find((flavor) => getFlavorSearchTerms(flavor).some((term) => matchesCatalogKeyword(haystack, term))) || null;
};

function PiquimFooterColumn({ title, links }) {
    return (
        <div className="inline-flex flex-col items-start justify-start gap-4 overflow-hidden">
            <h3 className="text-[11px] font-bold text-[#FF4D00]" style={{ letterSpacing: 2.2 }}>{title}</h3>
            {links.map((link) => (
                <button
                    key={`${title}-${link.label}`}
                    type="button"
                    onClick={() => navigate(link.href)}
                    className="text-sm font-medium text-[#FFFAF6]"
                >
                    {link.label}
                </button>
            ))}
        </div>
    );
}

function PiquimSubcatalogPage({ catalog, categories, products, loading, loadError, onRetry, currency, locale, onProductClick, labels }) {
    const [query, setQuery] = useState("");
    const [typeFilters, setTypeFilters] = useState([]);
    const [formatFilters, setFormatFilters] = useState([]);
    const [flavorFilters, setFlavorFilters] = useState([]);
    const [stockOnly, setStockOnly] = useState(false);
    const [catalogPage, setCatalogPage] = useState(1);
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
                image: image || getProductImage(product),
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

    useEffect(() => {
        setCatalogPage((currentPage) => synchronizeCatalogPageRequest(currentPage, paginatedProducts.currentPage));
    }, [paginatedProducts.currentPage]);

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
        setCatalogPage(nextPage);
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
        <div className="min-h-screen bg-[#FFFAF6] font-[Inter] text-[#1A1614]">
            <main className="flex w-full items-start justify-center gap-0 bg-[#FFFAF6] px-[60px] pb-10 pt-[104px] max-lg:flex-col max-lg:px-5 max-md:pt-[86px]">
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
                />
                <section className="flex flex-1 flex-col items-start justify-start gap-[30px] overflow-hidden bg-[#FFFAF6] px-[60px] py-[30px] max-xl:px-8 max-lg:w-full max-md:px-0">
                    <header ref={catalogTopRef} className="inline-flex w-full scroll-mt-24 items-end justify-between overflow-hidden">
                        <div className="inline-flex flex-col items-start justify-start gap-4 overflow-hidden">
                            <h1 className="text-[56px] font-black leading-[56px] max-md:text-[40px] max-md:leading-[42px]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                                <span className="text-[#1A1614]">{catalog.headingBase} </span>
                                <span className="italic text-[#FF4D00]">{catalog.headingAccent}</span>
                            </h1>
                        </div>
                    </header>

                    {loading && !normalizedProducts.length ? (
                        <PiquimProductsLoadingState />
                    ) : null}

                    {loading && normalizedProducts.length ? (
                        <div className="w-full rounded-2xl border border-[#FFDCC1] bg-[#FFF1E6] px-5 py-3 text-sm font-semibold text-[#A04100]" role="status" aria-live="polite">
                            Cargando más productos... {normalizedProducts.length} visibles
                        </div>
                    ) : null}

                    {loadError ? (
                        <div className="flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#FFB98A] bg-[#FFF1E6] px-5 py-4 text-sm text-[#7A3510]" role="alert">
                            <span>{normalizedProducts.length ? "No se pudieron cargar algunos productos" : "No se pudieron cargar los productos"}</span>
                            <button type="button" onClick={onRetry} className="rounded-full bg-[#FF4D00] px-4 py-2 font-bold text-white transition hover:bg-[#E04400]">
                                Reintentar
                            </button>
                        </div>
                    ) : null}

                    {!loading && !loadError && !sections.length ? (
                        <div className="rounded-2xl border border-[#E8DFD8] bg-white p-6 text-sm text-[#6B7280]">
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
                                        className="flex w-full items-center justify-between gap-4 border-b border-[#E8DFD8] pb-4 text-left"
                                        aria-expanded={expanded}
                                    >
                                        <span className="flex min-w-0 flex-col gap-1">
                                            <span className="text-4xl font-bold leading-9 text-[#1A1614]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                                                {section.title}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A7560]">
                                                {section.products.length} {section.products.length === 1 ? 'producto' : 'productos'}
                                            </span>
                                        </span>
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF4D00] text-white transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                            <ChevronDownSmallIcon className="size-5" />
                                        </span>
                                    </button>
                                ) : (
                                    <h2 className="text-4xl font-bold leading-9 text-[#1A1614]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
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
                            <div className="mb-3 text-center text-sm font-semibold text-[#8A7560]">
                                {visibleRangeStart}-{visibleRangeEnd} de {paginatedProducts.totalItems} productos
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#E8DFD8] bg-white/70 p-2 shadow-sm">
                                <PaginationButton
                                    label="Anterior"
                                    onClick={() => handleCatalogPageChange(paginatedProducts.currentPage - 1)}
                                    disabled={paginatedProducts.currentPage === 1}
                                />

                                {paginationItems.map((paginationItem, index) => {
                                    if (paginationItem === "ellipsis") {
                                        return (
                                            <span key={`piquim-ellipsis-${index}`} className="px-2 text-sm font-bold text-[#8A7560]" aria-hidden="true">
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
                                                ? "bg-[#FF4D00] text-white"
                                                : "border border-transparent text-[#1A1614] hover:border-[#FF4D00]/30 hover:bg-[#FF4D00]/10 hover:text-[#FF4D00]"
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
            <PiquimCatalogFooter />
        </div>
    );
}

function PiquimProductsLoadingState() {
    return (
        <div className="w-full" role="status" aria-live="polite">
            <p className="mb-4 text-sm font-semibold text-[#A04100]">Cargando productos...</p>
            <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(282px,1fr))] gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`piquim-loading-${index}`} className="h-[390px] animate-pulse rounded-3xl border border-[#E8DFD8] bg-white">
                        <div className="h-64 rounded-t-3xl bg-[#F3EAE3]" />
                        <div className="space-y-3 p-5">
                            <div className="h-4 w-2/3 rounded bg-[#F3EAE3]" />
                            <div className="h-3 w-1/2 rounded bg-[#F3EAE3]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PiquimSubcatalogSidebar({
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
}) {
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
        <aside className="flex min-h-[1850px] w-64 shrink-0 flex-col items-start justify-start gap-2 overflow-hidden rounded-xl border-r border-[#FFDCC1] bg-[#FFD7B6] p-6 shadow-sm max-lg:min-h-0 max-lg:w-full">
            <div className="flex w-full flex-col items-start justify-start gap-2">
                <div className="flex w-full flex-col items-start justify-start pb-6">
                    <h2 className="flex w-full flex-col justify-center text-2xl font-bold leading-8 text-[#A04100]" style={{ fontFamily: 'Epilogue, Gilroy, sans-serif' }}>
                        {titleLabel}
                    </h2>
                    <p className="mt-1 whitespace-pre-line text-sm font-normal leading-5 text-[#5A4136]" style={{ fontFamily: 'Work Sans, Inter, sans-serif' }}>
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
                            className="w-full rounded-lg bg-[#FFEDDE] py-2.5 pl-3 pr-8 text-sm text-[#6B7280] outline-none ring-0"
                        />
                        <SearchIcon className="absolute right-2 top-2.5 size-5 text-[#A04100]" />
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
                    <span className="text-sm font-normal leading-5 text-[#5A4136]">{stockLabel}</span>
                </label>
            </div>
        </aside>
    );
}

function GroupedFilterTree({ title, groups, selectedGroups, onToggleGroup, selectedCategories, onToggleCategory, selectedFlavors, onToggleFlavor }) {
    const [expanded, setExpanded] = useState(() => {
        const initial = {};
        (Array.isArray(groups) ? groups : []).forEach((group) => {
            if (group?.title) initial[group.title] = true;
        });
        return initial;
    });
    const [activeFlavorGroup, setActiveFlavorGroup] = useState(null);

    if (!Array.isArray(groups) || !groups.length) return null;

    return (
        <div className="w-full pb-6">
            <div className="mb-3 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[#A04100]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[#A04100]">{title}</h3>
            </div>
            <div className="flex w-full flex-col gap-2">
                {groups.map((group) => {
                    const groupTitle = group.title;
                    const isExpanded = expanded[groupTitle] !== false;
                    const categories = Array.isArray(group.categories) ? group.categories : [];
                    const flavors = Array.isArray(group.flavors) ? group.flavors : [];
                    const selectedFlavorCount = flavors.filter((flavor) => selectedFlavors.includes(flavor.name)).length;

                    return (
                        <div key={`filter-group-${groupTitle}`} className="rounded-xl bg-[#FFEDDE]/70 p-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="inline-flex min-w-0 flex-1 items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.includes(groupTitle)}
                                        onChange={() => onToggleGroup(groupTitle)}
                                    />
                                    <span className="truncate text-sm font-semibold leading-5 text-[#5A4136]">{groupTitle}</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setExpanded((prev) => ({ ...prev, [groupTitle]: prev[groupTitle] === false }))}
                                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#A04100] transition-transform"
                                    aria-label={`${isExpanded ? 'Cerrar' : 'Abrir'} ${groupTitle}`}
                                    aria-expanded={isExpanded}
                                >
                                    <ChevronDownSmallIcon className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            {isExpanded && categories.length ? (
                                <div className="mt-2 flex flex-col gap-2 border-l border-[#FFC89E] pl-5">
                                    {categories.map((category) => (
                                        <label key={`filter-category-${groupTitle}-${category.title}`} className="inline-flex w-full items-center justify-start gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(category.title)}
                                                onChange={() => onToggleCategory(category.title)}
                                            />
                                            <span className="text-sm font-normal leading-5 text-[#5A4136]">{category.title}</span>
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

function FlavorSelectionModal({ group, selectedFlavors, onToggleFlavor, onClose }) {
    const flavors = Array.isArray(group?.flavors) ? group.flavors : [];
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true" aria-label={`Seleccionar sabores de ${group?.title || ''}`}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#FFFAF6] shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-[#E8DFD8] px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF4D00]">Selector profesional</p>
                        <h3 className="mt-1 text-3xl font-black text-[#1A1614]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                            {group?.title}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-[#FFEDDE] text-[#A04100] hover:bg-[#FFD7B6]"
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
                                        ? 'border-[#FF4D00] bg-[#FFEDDE] shadow-[0_10px_26px_rgba(255,77,0,0.14)]'
                                        : 'border-[#E8DFD8] bg-white hover:border-[#FFB27D]'
                                }`}
                            >
                                <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: flavor.color || '#E8DFD8' }} />
                                <span className="min-w-0 flex-1 text-sm font-bold text-[#1A1614]">{flavor.name}</span>
                                {selected ? <CheckIcon className="size-4 shrink-0 text-[#FF4D00]" /> : null}
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DFD8] px-6 py-4">
                    <p className="text-xs font-semibold text-[#8A7560]">
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

function SuggestionGroup({ title, items, onPick }) {
    if (!items?.length) return null;
    return (
        <div className="w-full pb-4">
            <div className="mb-2 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[#A04100]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[#A04100]">{title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <button
                        key={`${title}-${item}`}
                        type="button"
                        onClick={() => onPick(item)}
                        className="rounded-full bg-[#FFEDDE] px-2.5 py-1 text-xs text-[#5A4136] hover:bg-white"
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FilterGroup({ title, options, selected, onToggle }) {
    if (!options?.length) return null;
    return (
        <div className="w-full pb-6">
            <div className="mb-3 inline-flex w-full items-center justify-start gap-2">
                <FilterDotIcon className="size-4 text-[#A04100]" />
                <h3 className="text-sm font-semibold leading-[16.8px] text-[#A04100]">{title}</h3>
            </div>
            <div className="flex w-full flex-col items-start justify-start gap-2">
                {options.map((item) => (
                    <label key={`${title}-${item}`} className="inline-flex w-full items-center justify-start gap-2">
                        <input type="checkbox" checked={selected.includes(item)} onChange={() => onToggle(item)} />
                        <span className="text-sm font-normal leading-5 text-[#5A4136]">{item}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function PiquimSubcatalogProductCard({ product, accent, mediaGradient, icon, currency, locale, onOpen }) {
    const { addToCart, toggleFavorite, isFavorite } = useStore();
    const temperatureType = String(product?.temperature || icon || "").toLowerCase();
    const isCold = temperatureType.includes("ice") || temperatureType.includes("cold") || temperatureType.includes("frio") || temperatureType.includes("frío");
    const isHot = temperatureType.includes("fire") || temperatureType.includes("hot") || temperatureType.includes("calor");
    const showCold = isCold || (!isCold && !isHot);
    const showHot = isHot;
    const inStock = Number(product?.stock || 0) > 0;
    const favorite = isFavorite(product.id);
    const cartPayload = {
        id: product.id,
        sku: product.sku || product.id,
        name: product.name,
        price: product.priceValue || 0,
        image: product.image || "",
        alt: product.alt || product.name,
        stock: product.stock,
    };

    const openProduct = () => {
        if (typeof onOpen === "function") onOpen();
    };

    const handleCardKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openProduct();
    };

    const handleFavoriteClick = (event) => {
        event.stopPropagation();
        toggleFavorite(cartPayload);
    };

    const handleAddToCart = (event) => {
        event.stopPropagation();
        if (!inStock) return;
        addToCart(cartPayload, 1);
    };

    return (
        <article
            role="link"
            tabIndex={0}
            aria-label={`Ver detalle de ${product.name}`}
            onClick={openProduct}
            onKeyDown={handleCardKeyDown}
            className="group flex h-[400px] min-w-[282px] cursor-pointer flex-col items-start justify-start overflow-hidden rounded-[18px] bg-white outline outline-1 -outline-offset-1 outline-[#E8DFD8] transition-all duration-300 hover:-translate-y-1.5 hover:outline-[#FF4D00] hover:shadow-[0_18px_46px_rgba(255,77,0,0.16)] focus-visible:outline-2 focus-visible:outline-[#FF4D00]"
        >
            <div className="relative h-[220px] w-full overflow-hidden" style={{ background: mediaGradient }}>
                {product.badge ? (
                    <div
                        className="absolute left-4 top-4 inline-flex items-start justify-start overflow-hidden rounded-full px-2.5 py-1.5"
                        style={{ background: product.badgeDark ? '#1A1614' : '#FF4D00' }}
                    >
                        <span className="text-[9px] font-bold text-white" style={{ letterSpacing: 0.72 }}>
                            {product.badge}
                        </span>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={handleFavoriteClick}
                    aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                    aria-pressed={favorite}
                    className={`absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-[#1A1614] transition-all hover:scale-105 ${
                        favorite ? "bg-[#FF4D00] text-white" : "bg-white/85 hover:bg-white"
                    }`}
                >
                    <HeartIcon className="size-5" />
                </button>
                {product.hasImage ? (
                    <img
                        src={product.image}
                        alt={product.alt || product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <ProductDisplayIcon type={icon} className="absolute left-1/2 top-12 h-[138px] w-[86px] -translate-x-1/2 transition-transform duration-500 group-hover:scale-105" accent={accent} />
                )}
                <div className="absolute bottom-[17px] right-6 inline-flex h-[35px] min-w-[44px] items-center justify-center gap-[10px] rounded-[15px] bg-white px-3 py-2.5">
                    {showCold ? <Snowflake className="size-4" style={{ color: accent }} /> : null}
                    {showHot ? <Flame className="size-4 text-[#FF4D00]" /> : null}
                </div>
            </div>
            <div className="flex w-full flex-col items-start justify-start gap-1.5 overflow-hidden p-[18px]">
                <p className="line-clamp-1 text-[10px] font-bold uppercase text-[#8A7560]" style={{ fontFamily: 'Gilroy, sans-serif', letterSpacing: 1.2 }}>
                    {product.breadcrumbLabel || `${product.category} › ${product.subtype}`}
                </p>
                <h3 className="text-base font-bold leading-[20.8px] text-[#1A1614]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                    {product.name}
                </h3>
                <div className="flex min-h-5 items-center gap-2">
                    {product.flavorColor ? (
                        <span className="size-3 rounded-full border border-black/10" style={{ backgroundColor: product.flavorColor }} />
                    ) : null}
                    <p className="line-clamp-1 text-xs font-normal text-[#B5ADA8]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                        {product.flavorTitle || product.subtype}
                    </p>
                </div>
                <div className="h-2 w-px" />
                <div className="inline-flex w-full items-center justify-between overflow-hidden">
                    <p className="text-xl font-black text-[#1A1614]">{formatCurrency(product.priceValue || 0, currency || "ARS", locale || "es-AR")}</p>
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        aria-label={inStock ? "Agregar al carrito" : "Sin stock"}
                        className="flex size-9 items-center justify-center rounded-full bg-[#FF4D00] text-white transition-all hover:scale-105 hover:shadow-[0_10px_22px_rgba(255,77,0,0.28)] disabled:cursor-not-allowed disabled:bg-[#D8CCC5] disabled:text-[#8A7560]"
                    >
                        <CartPlusIcon className="size-5" />
                    </button>
                </div>
            </div>
        </article>
    );
}

function ProductDisplayIcon({ type, className = '', accent = '#6BB8E0' }) {
    if (type === 'bread') {
        return (
            <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13 66C13 35 26 16 43 16s30 19 30 50v46c0 7-6 13-13 13H26c-7 0-13-6-13-13V66Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M27 50c4-8 9-12 16-12M43 38c7 0 12 4 16 12" stroke={accent} strokeWidth="5" strokeLinecap="round" />
                <path d="M26 77h34M26 96h34" stroke="#1A1614" strokeWidth="5" strokeLinecap="round" />
            </svg>
        );
    }
    if (type === 'cake') {
        return (
            <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M20 58h46v55c0 7-6 13-13 13H33c-7 0-13-6-13-13V58Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M18 58c0-15 11-27 25-27s25 12 25 27H18Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
                <path d="M28 70c4 8 11 8 15 0s11-8 15 0" stroke={accent} strokeWidth="5" strokeLinecap="round" />
                <path d="M33 92h20" stroke="#1A1614" strokeWidth="5" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg className={className} viewBox="0 0 86 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M43 12c18 0 31 12 31 29 0 11-6 21-16 26l-8 55c-.5 4-3.8 7-7.9 7s-7.4-3-7.9-7l-8-55C16 62 10 52 10 41c0-17 15-29 33-29Z" fill="#fffaf6" stroke="#1A1614" strokeWidth="5" />
            <path d="M25 42c7 7 29 7 36 0M31 65h24" stroke={accent} strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}

function FilterDotIcon({ className = 'size-4' }) {
    return (
        <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M5 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function ChevronDownSmallIcon({ className = 'size-4' }) {
    return (
        <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}


function SearchIcon({ className = "size-4" }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L16.66 16.66M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CartIcon({ className = "size-4" }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6H21L19 13H8L6 6ZM6 6L5.2 3H3M9 21C9.55228 21 10 20.5523 10 20C10 19.4477 9.55228 19 9 19C8.44772 19 8 19.4477 8 20C8 20.5523 8.44772 21 9 21ZM18 21C18.5523 21 19 20.5523 19 20C19 19.4477 18.5523 19 18 19C17.4477 19 17 19.4477 17 20C17 20.5523 17.4477 21 18 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BookmarkIcon({ className = "size-4" }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 21L12 17L5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CatalogFamilySection({ cards, onSelectCard }) {
    const items = Array.isArray(cards) && cards.length ? cards : PIQUIM_CATALOG_CARDS;

    return (
        <section className="mb-6 overflow-hidden rounded-[36px_36px_18px_18px] bg-[#ff4d00] p-4 shadow-[0_24px_70px_rgba(255,77,0,0.22)] md:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffe0d0]">Catalogo Piquim</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#fffaf6] md:text-5xl">
                        Materia prima por rubro
                    </h2>
                </div>
                <p className="max-w-md text-sm font-semibold leading-6 text-[#ffe0d0]">
                    Elegi una familia para filtrar el catalogo real y encontrar productos para produccion profesional.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {items.slice(0, 3).map((card, index) => {
                    const tags = Array.isArray(card.tags)
                        ? card.tags
                        : String(card.tags || "")
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean);
                    return (
                        <article
                            key={card.id || `${card.title}-${index}`}
                            className="group relative min-h-[430px] overflow-hidden rounded-[28px] bg-[#1a1614] shadow-[0_18px_46px_rgba(26,22,20,0.28)] md:min-h-[540px]"
                        >
                            <img
                                src={card.image || PIQUIM_CATALOG_CARDS[index]?.image}
                                alt={card.title || "Catalogo Piquim"}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                loading={index === 0 ? "eager" : "lazy"}
                            />
                            <div
                                className="absolute inset-0"
                                style={{ background: card.overlay || PIQUIM_CATALOG_CARDS[index]?.overlay }}
                            />
                            <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-between p-6 text-white md:min-h-[540px] md:p-8">
                                <div className="space-y-4">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                                        {card.prefix}
                                    </p>
                                    <h3 className="text-4xl font-black tracking-[-0.05em] md:text-5xl">
                                        {card.title}
                                    </h3>
                                    <p className="max-w-sm text-sm font-semibold leading-6 text-white/82">
                                        {card.description}
                                    </p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <span key={`${card.id}-${tag}`} className="rounded-full bg-white/18 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] backdrop-blur">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onSelectCard(card)}
                                        className="inline-flex w-fit items-center rounded-full bg-[#fffaf6] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#ff4d00] transition-transform hover:-translate-y-0.5"
                                    >
                                        <span className="inline-flex items-center">
                                            Ver catalogo <ArrowRight className="ml-2 size-4" />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function CatalogFilters({
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

function CatalogProductCard({
    product,
    showPricesEnabled,
    canViewPrices,
    authLoading,
    currency,
    locale,
    showStock,
    lowStockThreshold,
    onFavoriteChange,
}) {
    const { addToCart, toggleFavorite, isFavorite } = useStore();
    const [expanded, setExpanded] = useState(false);
    const { name, desc, price, minPrice, maxPrice, oldPrice, tag, image, alt, stock, grouped, variationCount, variations, variationGroupLabel } = product;
    const favoriteActive = isFavorite(product.id);
    const inStock = isInStock(stock);
    const stockStatus = showStock ? getStockStatus(stock, lowStockThreshold) : null;
    const hasVariations = grouped && Array.isArray(variations) && variations.length > 1;
    const hasPriceRange = Number.isFinite(minPrice) && Number.isFinite(maxPrice) && minPrice !== maxPrice;

    const openProduct = () => navigate(`/product/${product.id}`);
    const handleCardKeyDown = (event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProduct();
        }
    };

    return (
        <article
            role="link"
            tabIndex={0}
            onClick={openProduct}
            onKeyDown={handleCardKeyDown}
            className="group cursor-pointer overflow-hidden rounded-[16px] border shadow-sm outline-none transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40 md:rounded-[24px]"
            style={CATALOG_STYLES.card}
            aria-label={`Ver detalle de ${name}`}
        >
            <div className="relative aspect-square overflow-hidden" style={CATALOG_STYLES.media}>
                <img
                    alt={name}
                    title={alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={image}
                    loading="lazy"
                />

                <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            const nextValue = !favoriteActive;
                            toggleFavorite(product);
                            onFavoriteChange?.(product, nextValue);
                        }}
                        className={`rounded-full p-2 shadow-sm transition-colors ${favoriteActive
                                ? "bg-primary text-white"
                                : "bg-white/90 text-[#181411] hover:bg-primary hover:text-white"
                            }`}
                        aria-label="Agregar a favoritos"
                    >
                        <HeartIcon active={favoriteActive} className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openProduct();
                        }}
                        className="rounded-full bg-white/90 p-2 text-[#181411] shadow-sm transition-colors hover:bg-primary hover:text-white"
                        aria-label="Ver detalle"
                    >
                        <EyeIcon className="size-4" />
                    </button>
                </div>

                {tag ? (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                        {String(tag).toLowerCase() === "nuevo" || String(tag).toLowerCase() === "new" ? "Nuevo" : tag}
                    </span>
                ) : null}
            </div>

            <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-5">
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openProduct();
                        }}
                        className="text-left"
                    >
                        <h3 className="text-sm font-black leading-tight text-[#181411] transition-colors group-hover:text-primary dark:text-white md:text-lg">
                            {name}
                        </h3>
                    </button>
                    <p className="hidden line-clamp-2 text-sm leading-6 md:block" style={CATALOG_STYLES.muted}>{desc || "Producto profesional listo para tu obra."}</p>
                    {stockStatus ? (
                        <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${stockStatus.bg} ${stockStatus.tone}`}
                        >
                            {stockStatus.label}
                        </span>
                    ) : null}
                    {hasVariations ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                {variationCount} variaciones
                            </span>
                            {variationGroupLabel ? (
                                <span className="text-[11px] font-semibold" style={CATALOG_STYLES.muted}>{variationGroupLabel}</span>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                <div className="mt-auto flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="min-w-0 flex flex-col">
                        {showPricesEnabled ? (
                            canViewPrices ? (
                                <>
                                    {oldPrice ? (
                                        <span className="text-xs font-semibold text-slate-400 line-through mb-1">{formatCurrency(oldPrice, currency, locale)}</span>
                                    ) : null}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-lg font-black text-primary md:text-2xl">
                                            {hasPriceRange
                                                ? `Desde ${formatCurrency(minPrice, currency, locale)}`
                                                : formatCurrency(price, currency, locale)}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.12em] ${product.isWholesaleItem
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-[#181411]/10 text-[#181411] dark:bg-white/10 dark:text-white"
                                                }`}
                                        >
                                            {product.isWholesaleItem ? "Mayorista" : "Minorista"}
                                        </span>
                                    </div>
                                    {hasPriceRange ? (
                                        <span className="text-sm" style={CATALOG_STYLES.muted}>
                                            Hasta {formatCurrency(maxPrice, currency, locale)}
                                        </span>
                                    ) : null}
                                </>
                            ) : authLoading ? (
                                <span className="text-sm" style={CATALOG_STYLES.muted}>Cargando precio...</span>
                            ) : (
                                <PriceAccessPrompt compact />
                            )
                        ) : (
                            <span className="text-sm" style={CATALOG_STYLES.muted}>Consultar precio</span>
                        )}
                    </div>

                    {hasVariations ? (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setExpanded((current) => !current);
                            }}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-white transition-all hover:bg-primary md:h-9 md:w-auto md:text-xs"
                            style={{ backgroundColor: "var(--color-accent, #181411)" }}
                        >
                            {expanded ? "Ocultar" : "Ver variantes"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                addToCart(product, 1);
                            }}
                            disabled={!inStock}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:px-0 md:text-xs"
                        >
                            <CartPlusIcon className="size-5 md:size-4" />
                            <span className="md:hidden">Agregar al carrito</span>
                        </button>
                    )}
                </div>

                {hasVariations && expanded ? (
                    <div className="rounded-2xl border p-3" style={CATALOG_STYLES.surface}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Variaciones</p>
                                <p className="text-sm font-semibold text-[#181411] dark:text-white">
                                    {variationGroupLabel || "Opciones disponibles"}
                                </p>
                            </div>
                            <span className="text-[11px]" style={CATALOG_STYLES.muted}>{variationCount} opciones</span>
                        </div>

                        <div className="space-y-2">
                            {variations.map((variation) => {
                                const variationInStock = isInStock(variation.stock);
                                const variationStockStatus = showStock ? getStockStatus(variation.stock, lowStockThreshold) : null;
                                return (
                                    <div
                                        key={`variation-${variation.id}`}
                                        className={`rounded-2xl border px-3 py-3 transition-colors ${variation.isRoot
                                                ? "border-primary/30 bg-primary/5"
                                                : ""
                                            }`}
                                        style={variation.isRoot ? undefined : CATALOG_STYLES.card}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                        {variation.variationName}
                                                    </p>
                                                    {variation.isRoot ? (
                                                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                                                            Raiz
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {variation.sku ? (
                                                    <p className="mt-1 text-[11px]" style={CATALOG_STYLES.muted}>SKU: {variation.sku}</p>
                                                ) : null}
                                                {variationStockStatus ? (
                                                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${variationStockStatus.bg} ${variationStockStatus.tone}`}>
                                                        {variationStockStatus.label}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-col items-start gap-2 sm:items-end">
                                                {showPricesEnabled ? (
                                                    canViewPrices ? (
                                                        <span className="text-base font-black text-primary">
                                                            {formatCurrency(variation.price, currency, locale)}
                                                        </span>
                                                    ) : authLoading ? (
                                                        <span className="text-sm" style={CATALOG_STYLES.muted}>Cargando precio...</span>
                                                    ) : (
                                                        <PriceAccessPrompt compact />
                                                    )
                                                ) : (
                                                    <span className="text-sm" style={CATALOG_STYLES.muted}>Consultar precio</span>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            navigate(`/product/${variation.id}`);
                                                        }}
                                                        className="rounded-xl border px-3 py-2 text-xs font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                                                        style={CATALOG_STYLES.border}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            addToCart(variation, 1);
                                                        }}
                                                        disabled={!variationInStock}
                                                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </article>
    );
}

function PaginationButton({ label, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-xl border px-4 py-2 text-sm font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:text-white"
            style={CATALOG_STYLES.border}
        >
            {label}
        </button>
    );
}

function FilterIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
    );
}

function ResetIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    );
}

function CloseIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function CheckIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function ChevronRightIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function HeartIcon({ active = false, className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );
}

function EyeIcon({ className = "size-4" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function CartPlusIcon({ className = "size-5" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.64 16h9.72a2 2 0 0 0 1.96-1.61L23 6H6" />
            <path d="M12 9h6" />
            <path d="M15 6v6" />
        </svg>
    );
}
