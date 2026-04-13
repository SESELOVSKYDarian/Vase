import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import StoreSkeleton from "../../components/StoreSkeleton";

const FALLBACK_IMAGE = createPlaceholderImage({ label: "Producto", width: 720, height: 720 });
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

export default function CatalogPage() {
    const { search, showToast } = useStore();
    const { settings } = useTenant();
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
    const [totalItems, setTotalItems] = useState(0);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const limit = 24;

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
                        ? categoriesData.map(normalizeCategory).filter(Boolean)
                        : [];
                    setCategories(normalizedCategories);
                }

                if (active && brandsRes.ok) {
                    const brandsData = await brandsRes.json();
                    const normalizedBrands = Array.isArray(brandsData)
                        ? brandsData.map(normalizeBrand).filter(Boolean)
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
    }, []);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        const loadProducts = async () => {
            try {
                setLoading(true);
                const url = new URL(`${getApiBase()}/public/products`);
                url.searchParams.set("page", String(page));
                url.searchParams.set("limit", String(limit));
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

                const response = await fetch(url.toString(), {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Error al cargar el catalogo: ${response.status}`);
                }

                const data = await response.json();
                if (!active) return;

                const items = Array.isArray(data.items) ? data.items : [];
                setProducts(items);
                setTotalItems(Number(data.total || items.length || 0));
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("No se pudieron cargar los productos", error);
                    if (active) {
                        setProducts([]);
                        setTotalItems(0);
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
    }, [inStockOnly, limit, page, search, selectedBrand, selectedCategory, selectedMaxPrice, selectedMinPrice, sort]);

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
            return "Resultados refinados por rango de precio, disponibilidad y taxonomias comerciales.";
        }
        return "Coleccion profesional para obras y reformas.";
    }, [inStockOnly, search, selectedBrandEntry, selectedCategoryEntry, selectedMaxPrice, selectedMinPrice]);

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

                {/* FAB Flotante para Filtros en Móvil */}
                <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(true)}
                    className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-[#181411] px-5 font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 lg:hidden"
                >
                    <FilterIcon className="size-5" />
                    <span>Filtros</span>
                    {activeFilterCount > 0 ? (
                        <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">
                            {activeFilterCount}
                        </span>
                    ) : null}
                </button>

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
                        ) : (
                            <>
                                {quickCategories.map((category) => (
                                    <button
                                        key={`quick-category-${category.id}`}
                                        type="button"
                                        onClick={() => applyFilters({ category: category.id })}
                                        className="rounded-full border px-4 py-2 text-sm font-medium text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                                        style={CATALOG_STYLES.border}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                                {quickBrands.map((brand) => (
                                    <button
                                        key={`quick-brand-${brand.id}`}
                                        type="button"
                                        onClick={() => applyFilters({ brand: brand.id })}
                                        className="rounded-full border px-4 py-2 text-sm font-medium text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                                        style={CATALOG_STYLES.border}
                                    >
                                        {brand.name}
                                    </button>
                                ))}
                            </>
                        )}
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
                        <div className="mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between" style={CATALOG_STYLES.surface}>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em]" style={CATALOG_STYLES.muted}>Resultados</p>
                                <h2 className="mt-1 text-lg font-bold text-[#181411] dark:text-white">
                                    {totalItems === 1 ? "1 raiz o producto" : `${totalItems} raices o productos`}
                                </h2>
                            </div>
                            <p className="text-sm" style={CATALOG_STYLES.muted}>
                                {activeFilterCount > 0
                                    ? "Filtra por categoria, marca, rango de precios, stock y orden para acotar mejor la grilla."
                                    : "Usa el buscador, categorias, marcas y orden para encontrar mas rapido lo que necesitas."}
                            </p>
                        </div>

                        {loading ? (
                            <StoreSkeleton variant="catalog" />
                        ) : catalogProducts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed px-6 py-14 text-center" style={{ ...CATALOG_STYLES.border, ...CATALOG_STYLES.muted }}>
                                <p className="text-lg font-bold text-[#181411] dark:text-white">No encontramos productos para esta busqueda.</p>
                                <p className="mt-2 text-sm">Prueba con otra categoria, otra marca o limpia los filtros activos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
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
                                            className={`min-w-[42px] rounded-xl px-4 py-2 text-sm font-bold transition-colors ${pageNumber === page
                                                    ? "bg-primary text-white"
                                                    : "border border-[#e5e1de] text-[#181411] hover:border-primary hover:text-primary dark:border-[#3d2f21] dark:text-white"
                                                }`}
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
        <div className={`rounded-[24px] border p-5 shadow-sm ${mobile ? "min-h-full" : "sticky top-24"}`} style={CATALOG_STYLES.panel}>
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
                    <div className="space-y-3">
                        {categoryTree.length ? (
                            categoryTree.map((category) => {
                                const parentActive = selectedCategory === category.id || selectedCategory === category.slug;
                                const hasChildren = category.children.length > 0;
                                const expanded = expandedCategories[category.id] ?? false;
                                return (
                                    <div key={`category-${category.id}`} className="rounded-2xl border p-3" style={CATALOG_STYLES.surface}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onSelectCategory(category.id)}
                                                className={`flex min-w-0 flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${parentActive
                                                        ? "bg-primary text-white"
                                                        : "text-[#181411] hover:bg-[#f5f2f0] dark:text-white dark:hover:bg-[#21160e]"
                                                    }`}
                                            >
                                                <span className="truncate">{category.name}</span>
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
                                                    className={`inline-flex size-10 items-center justify-center rounded-xl border transition-colors ${expanded
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "text-[#6f5f50] hover:border-primary hover:text-primary dark:text-[#d6c4b4]"
                                                        }`}
                                                    style={expanded ? undefined : { ...CATALOG_STYLES.border, ...CATALOG_STYLES.muted }}
                                                    aria-label={expanded ? `Ocultar subcategorias de ${category.name}` : `Mostrar subcategorias de ${category.name}`}
                                                >
                                                    <ChevronRightIcon className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                                                </button>
                                            ) : null}
                                        </div>
                                        {hasChildren && expanded ? (
                                            <div className="mt-2 space-y-1 border-l pl-3" style={CATALOG_STYLES.border}>
                                                {category.children.map((child) => {
                                                    const childActive = selectedCategory === child.id || selectedCategory === child.slug;
                                                    return (
                                                        <button
                                                            key={`category-child-${child.id}`}
                                                            type="button"
                                                            onClick={() => onSelectCategory(child.id)}
                                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${childActive
                                                                    ? "bg-primary/12 font-bold text-primary"
                                                                    : "text-[#6f5f50] hover:bg-[#f7f4f1] hover:text-[#181411] dark:text-[#d6c4b4] dark:hover:bg-[#1d140d] dark:hover:text-white"
                                                                }`}
                                                            style={childActive ? undefined : CATALOG_STYLES.muted}
                                                        >
                                                            <span>{child.name}</span>
                                                            <ChevronRightIcon className="size-4" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })
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
                            brands.map((brand) => {
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
                            })
                        ) : (
                            <p className="text-sm" style={CATALOG_STYLES.muted}>No hay marcas disponibles.</p>
                        )}
                    </div>
                </section>
            </div>
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

    return (
        <article className="group overflow-hidden rounded-[24px] border shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl" style={CATALOG_STYLES.card}>
            <div className="relative aspect-square cursor-pointer overflow-hidden" style={CATALOG_STYLES.media} onClick={openProduct}>
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

            <div className="flex flex-col gap-4 p-5">
                <div className="space-y-2">
                    <button type="button" onClick={openProduct} className="text-left">
                        <h3 className="text-lg font-black leading-tight text-[#181411] transition-colors group-hover:text-primary dark:text-white">
                            {name}
                        </h3>
                    </button>
                    <p className="line-clamp-2 text-sm leading-6" style={CATALOG_STYLES.muted}>{desc || "Producto profesional listo para tu obra."}</p>
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

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-auto">
                    <div className="min-w-0 flex flex-col">
                        {showPricesEnabled ? (
                            canViewPrices ? (
                                <>
                                    {oldPrice ? (
                                        <span className="text-sm font-semibold text-slate-400 line-through mb-1">{formatCurrency(oldPrice, currency, locale)}</span>
                                    ) : null}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-2xl font-black text-primary">
                                            {hasPriceRange
                                                ? `Desde ${formatCurrency(minPrice, currency, locale)}`
                                                : formatCurrency(price, currency, locale)}
                                        </span>
                                        <span
                                            className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${product.isWholesaleItem
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
                            onClick={() => setExpanded((current) => !current)}
                            className="inline-flex h-12 md:h-11 w-full md:w-auto items-center justify-center rounded-xl px-4 text-base md:text-sm font-bold text-white transition-all hover:bg-primary"
                            style={{ backgroundColor: "var(--color-accent, #181411)" }}
                        >
                            {expanded ? "Ocultar" : "Ver variantes"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => addToCart(product, 1)}
                            disabled={!inStock}
                            className="inline-flex h-12 md:h-11 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base md:text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <CartPlusIcon className="size-5" />
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
                                                        onClick={() => navigate(`/product/${variation.id}`)}
                                                        className="rounded-xl border px-3 py-2 text-xs font-bold text-[#181411] transition-colors hover:border-primary hover:text-primary dark:text-white"
                                                        style={CATALOG_STYLES.border}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => addToCart(variation, 1)}
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

