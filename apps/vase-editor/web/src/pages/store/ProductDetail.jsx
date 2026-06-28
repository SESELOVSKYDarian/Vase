import React, { useEffect, useMemo, useState } from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import { useStore } from "../../context/StoreContext";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/format";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../utils/api";
import { navigate } from "../../utils/navigation";
import { getPriceAccessState } from "../../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../../utils/stock";
import { createPlaceholderImage } from "../../utils/productImage";
import PriceAccessPrompt from "../../components/PriceAccessPrompt";
import StoreSkeleton from "../../components/StoreSkeleton";
import ProductDetailMinimal from "./ProductDetailMinimal";
import ProductDetailImmersive from "./ProductDetailImmersive";
import ProductBreadcrumb from "../../components/ProductBreadcrumb";
import { PIQUIM_SUBCATALOGS } from "../../data/piquimSubcatalogs";
import { ArrowRight, Bookmark, ShoppingCart } from "lucide-react";

const FALLBACK_IMAGE = createPlaceholderImage({ label: "Producto", width: 900, height: 900 });

const getProductId = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "product") return null;
    return parts[1] || null;
};

const normalizeBreadcrumbText = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const toTitleLabel = (value) =>
    String(value || "")
        .replace(/^de\s+/i, "")
        .replace(/[-_]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const getSearchParam = (name) => {
    try {
        return new URLSearchParams(window.location.search || "").get(name) || "";
    } catch {
        return "";
    }
};

const resolveCatalogSlugFromText = (...values) => {
    const text = normalizeBreadcrumbText(values.filter(Boolean).join(" "));
    if (!text) return "";
    if (text.includes("heladeria") || text.includes("helado")) return "heladeria";
    if (text.includes("panaderia") || text.includes("pan ") || text.includes("bolleria")) return "panaderia";
    if (text.includes("confiteria") || text.includes("reposteria") || text.includes("pasteleria")) return "panaderia";
    return "";
};

const getCatalogLabel = (slug) => {
    const fixedLabels = {
        heladeria: "Heladería",
        panaderia: "Panadería/Confitería",
        confiteria: "Panadería/Confitería",
    };
    if (fixedLabels[slug]) return fixedLabels[slug];
    const catalog = PIQUIM_SUBCATALOGS[slug];
    if (!catalog) return toTitleLabel(slug);
    return toTitleLabel(catalog.headingAccent || slug);
};

const findBreadcrumbGroupForFilter = (catalogSlug, filterLabel) => {
    const catalog = PIQUIM_SUBCATALOGS[catalogSlug];
    const normalizedFilter = normalizeBreadcrumbText(filterLabel);
    if (!catalog || !normalizedFilter || !Array.isArray(catalog.productGroups)) return "";

    const group = catalog.productGroups.find((item) => {
        if (normalizeBreadcrumbText(item.title) === normalizedFilter) return true;
        const categories = Array.isArray(item.categories) ? item.categories : [];
        return categories.some((category) => normalizeBreadcrumbText(category.title) === normalizedFilter);
    });

    return group?.title || "";
};

const getSpecificationValue = (specifications = {}, keys = []) => {
    if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) return "";
    const entries = Object.entries(specifications);
    const normalizedKeys = keys.map(normalizeBreadcrumbText);
    const match = entries.find(([key]) => normalizedKeys.includes(normalizeBreadcrumbText(key)));
    return String(match?.[1] || "").trim();
};

const getProductKicker = (breadcrumbItems = [], sourcePath = []) => {
    const path = Array.isArray(sourcePath) ? sourcePath.filter(Boolean) : [];
    const catalog = path[0] || breadcrumbItems[1]?.label || "";
    const group = path[1] || breadcrumbItems[2]?.label || "";
    return [group, catalog].filter(Boolean).join(" + ");
};

const getProductImageUrl = (item, fallback = FALLBACK_IMAGE) => {
    const data = item?.data && typeof item.data === "object" ? item.data : {};
    const rawImages = Array.isArray(data.images) ? data.images : [];
    const rawFirst = rawImages[0];
    return (
        data.image ||
        data.image_url ||
        (rawFirst && (rawFirst.url || rawFirst.src || rawFirst)) ||
        fallback
    );
};

const normalizePresentationOptionLabel = (value) =>
    String(value || "")
        .replace(/^precio\s+\d+$/i, "")
        .replace(/^price[_\s-]?\d+$/i, "")
        .trim();

const resolveProductBreadcrumb = (product, view, categories = []) => {
    const data = product?.data && typeof product.data === "object" ? product.data : {};
    const categoryNames = (Array.isArray(product?.category_ids) ? product.category_ids : [])
        .map((id) => categories.find((category) => category.id === id))
        .filter(Boolean)
        .flatMap((category) => [category.parent_name, category.name, category.slug])
        .filter(Boolean);
    const sourcePath = Array.isArray(product?.source_category_path)
        ? product.source_category_path
        : Array.isArray(data.source_category_path)
            ? data.source_category_path
            : [];
    const rawCatalogFromUrl = normalizeBreadcrumbText(getSearchParam("catalog"));
    const catalogFromUrl = rawCatalogFromUrl === "confiteria" ? "panaderia" : rawCatalogFromUrl;
    const catalogSlug = PIQUIM_SUBCATALOGS[catalogFromUrl]
        ? catalogFromUrl
        : resolveCatalogSlugFromText(
            sourcePath.join(" "),
            product?.source_category,
            data.source_category,
            data.category,
            product?.category?.name,
            categoryNames.join(" "),
            view?.brand,
            view?.name,
        );
    const groupFromUrl = String(getSearchParam("group") || "").trim();
    const rawFilter =
        getSearchParam("filter") ||
        sourcePath.find((item) => normalizeBreadcrumbText(item) && normalizeBreadcrumbText(item) !== catalogSlug) ||
        data.subtype ||
        data.presentation ||
        "";
    const filterLabel = String(rawFilter || "").trim();
    const groupLabel = groupFromUrl || findBreadcrumbGroupForFilter(catalogSlug, filterLabel);
    const normalizedGroup = normalizeBreadcrumbText(groupLabel);
    const normalizedFilter = normalizeBreadcrumbText(filterLabel);
    const showGroup = Boolean(groupLabel);
    const showFilter = Boolean(filterLabel) && normalizedFilter !== normalizedGroup;
    const catalogHref = catalogSlug ? `/catalog?category=${encodeURIComponent(catalogSlug)}` : "/catalog";

    return [
        { label: "Productos", href: "/catalog" },
        ...(catalogSlug ? [{ label: getCatalogLabel(catalogSlug), href: catalogHref }] : []),
        ...(showGroup ? [{ label: groupLabel, href: catalogHref }] : []),
        ...(showFilter ? [{ label: filterLabel, href: catalogHref }] : []),
        { label: view?.name || product?.name || "Producto" },
    ];
};

export default function ProductDetail() {
    const { addToCart, toggleFavorite, isFavorite, showToast } = useStore();
    const { settings } = useTenant();
    const { isWholesale, user, loading: authLoading } = useAuth();

    const currency = settings?.commerce?.currency || "ARS";
    const locale = settings?.commerce?.locale || "es-AR";
    const { showPricesEnabled, canViewPrices } = getPriceAccessState(settings, user);
    const showStock = settings?.commerce?.show_stock !== false;
    const reviewsEnabledFromSettings = settings?.commerce?.reviews_enabled !== false;
    const lowStockThreshold = getLowStockThreshold(settings);

    const [productId, setProductId] = useState(getProductId);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeImage, setActiveImage] = useState(0);
    const [qty, setQty] = useState(1);
    const [selectedPresentationId, setSelectedPresentationId] = useState("");
    const [activeTab, setActiveTab] = useState("description");
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState("");
    const [reviewsEnabled, setReviewsEnabled] = useState(reviewsEnabledFromSettings);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        comment: "",
    });

    useEffect(() => {
        const update = () => setProductId(getProductId());
        window.addEventListener("popstate", update);
        window.addEventListener("navigate", update);
        return () => {
            window.removeEventListener("popstate", update);
            window.removeEventListener("navigate", update);
        };
    }, []);

    useEffect(() => {
        setReviewsEnabled(reviewsEnabledFromSettings);
    }, [reviewsEnabledFromSettings]);

    useEffect(() => {
        let active = true;
        setActiveImage(0);
        setQty(1);
        setSelectedPresentationId("");
        setActiveTab("description");
        setReviews([]);
        setReviewsError("");
        setReviewForm({ rating: 5, comment: "" });

        const loadProduct = async () => {
            if (!productId) {
                setError("Falta el id del producto.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const response = await fetch(`${getApiBase()}/public/products/${productId}`, {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                });

                if (!response.ok) {
                    throw new Error(`Error al cargar el producto: ${response.status}`);
                }

                const data = await response.json();
                if (!active) return;

                setProduct(data);
            } catch (err) {
                if (!active) return;
                console.error("No se pudo cargar el producto", err);
                setProduct(null);
                setError("No pudimos cargar este producto.");
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadProduct();

        return () => {
            active = false;
        };
    }, [productId]);

    useEffect(() => {
        let active = true;
        if (!productId) return () => { };

        const loadReviews = async () => {
            setReviewsLoading(true);
            setReviewsError("");
            try {
                const res = await fetch(`${getApiBase()}/public/products/${productId}/reviews?limit=50`, {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                });
                if (!res.ok) {
                    throw new Error(`Error al cargar reseñas: ${res.status}`);
                }
                const data = await res.json();
                if (!active) return;
                setReviewsEnabled(data?.enabled !== false);
                setReviews(Array.isArray(data?.items) ? data.items : []);
            } catch (err) {
                if (!active) return;
                console.error("No se pudieron cargar las reseñas", err);
                setReviews([]);
                setReviewsError("No pudimos cargar las reseñas.");
            } finally {
                if (active) {
                    setReviewsLoading(false);
                }
            }
        };

        loadReviews();

        return () => {
            active = false;
        };
    }, [productId]);

    useEffect(() => {
        let active = true;
        if (!productId) return () => { };

        const loadRelated = async () => {
            setRelatedLoading(true);
            try {
                const res = await fetch(`${getApiBase()}/public/products/${productId}/related?limit=4`, {
                    headers: { ...getTenantHeaders(), ...getAuthHeaders() },
                });
                if (!res.ok) {
                    throw new Error(`Error al cargar relacionados: ${res.status}`);
                }
                const data = await res.json();
                if (!active) return;
                setRelatedProducts(Array.isArray(data.items) ? data.items : []);
            } catch (err) {
                if (!active) return;
                console.error("No se pudieron cargar los productos relacionados", err);
                setRelatedProducts([]);
            } finally {
                if (active) {
                    setRelatedLoading(false);
                }
            }
        };

        loadRelated();

        return () => {
            active = false;
        };
    }, [productId]);

    const view = useMemo(() => {
        if (!product) return null;
        const data = product.data || {};
        const image = getProductImageUrl(product);
        const specifications =
            data.specifications && typeof data.specifications === "object" && !Array.isArray(data.specifications)
                ? data.specifications
                : {};
        const sourceCategoryPath = Array.isArray(product.source_category_path)
            ? product.source_category_path
            : Array.isArray(data.source_category_path)
                ? data.source_category_path
                : [];

        const price = isWholesale && product.price_wholesale != null
            ? Number(product.price_wholesale)
            : Number(product.price || 0);

        return {
            id: product.id,
            sku: product.sku || product.erp_id,
            name: product.name || "Producto",
            shortDescription:
                product.short_description ||
                data.short_description ||
                data.shortDescription ||
                "",
            longDescription:
                product.long_description ||
                data.long_description ||
                data.longDescription ||
                product.description ||
                data.description ||
                "",
            brand: product.brand || data.brand,
            stock: product.stock,
            image,
            images: [],
            alt: data.image_alt || product.name || "Producto",
            price,
            oldPrice: !isWholesale && data.old_price ? Number(data.old_price) : null,
            isWholesaleItem: isWholesale && product.price_wholesale != null,
            showSpecifications: product.show_specifications !== false && data.show_specifications !== false,
            collection: data.collection || product.variation_group_label || "",
            sourceCategory: product.source_category || data.source_category || "",
            sourceCategoryPath,
            specifications,
            presentationLabel:
                product.variation_label ||
                data.variant_label ||
                data.variantLabel ||
                data.variant ||
                data.presentation ||
                getSpecificationValue(specifications, ["presentacion", "presentación", "envase", "formato", "peso"]) ||
                "",
            variationGroupLabel: product.variation_group_label || data.variant_group_label || data.variantGroupLabel || "",
            priceTiers: Array.isArray(product.price_tiers) ? product.price_tiers : [],
            variations: Array.isArray(product.variations) ? product.variations : [],
            extra: data,
        };
    }, [product, isWholesale]);

    const images = useMemo(() => {
        if (!view) return [];
        const data = view.extra || {};
        const rawImages = Array.isArray(data.images) ? data.images : [];
        const normalized = [];
        const pushUrl = (url) => {
            if (!url) return;
            if (!normalized.some((item) => item.url === url)) {
                normalized.push({ url });
            }
        };

        if (data.image || data.image_url) {
            pushUrl(data.image || data.image_url);
        }

        rawImages.forEach((img) => {
            if (typeof img === "string") {
                pushUrl(img);
                return;
            }
            if (img && typeof img === "object") {
                pushUrl(img.url || img.src || img.image);
            }
        });

        if (!normalized.length) {
            pushUrl(view.image || FALLBACK_IMAGE);
        }

        return normalized;
    }, [view]);

    const relatedCards = useMemo(() => {
        return relatedProducts.map((item, index) => {
            const data = item.data || {};
            const image = getProductImageUrl(item);

            const price = isWholesale && item.price_wholesale != null
                ? Number(item.price_wholesale)
                : Number(item.price || 0);

            return {
                id: item.id,
                name: item.name,
                price,
                image,
                alt: data.image_alt || item.name || "Producto",
                stock: item.stock,
                isWholesaleItem: isWholesale && item.price_wholesale != null,
                index,
            };
        });
    }, [relatedProducts, isWholesale]);

    const specificationEntries = useMemo(() => {
        const specs = view?.extra?.specifications;
        if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];
        return Object.entries(specs)
            .map(([label, value]) => ({
                label: String(label || "").trim(),
                value: String(value ?? "").trim(),
            }))
            .filter((item) => item.label && item.value);
    }, [view]);
    const canShowSpecifications = Boolean(view?.showSpecifications && specificationEntries.length);
    const breadcrumbItems = useMemo(
        () => (view ? resolveProductBreadcrumb(product, view) : []),
        [product, view],
    );
    const productKicker = view ? getProductKicker(breadcrumbItems, view.sourceCategoryPath) : "";

    const presentationOptions = useMemo(() => {
        if (!view) return [];
        const next = [];
        const seen = new Set();
        const addOption = (option) => {
            const label = String(option?.label || "").trim();
            if (!label) return;
            const key = `${option.type || "option"}:${option.productId || ""}:${label.toLowerCase()}`;
            if (seen.has(key)) return;
            seen.add(key);
            next.push({ ...option, label });
        };

        if (Array.isArray(view.variations) && view.variations.length > 1) {
            view.variations.forEach((variation) => {
                const data = variation?.data && typeof variation.data === "object" ? variation.data : {};
                const specs = data.specifications && typeof data.specifications === "object" ? data.specifications : {};
                const label =
                    variation.variation_label ||
                    data.variant_label ||
                    data.variantLabel ||
                    data.variant ||
                    getSpecificationValue(specs, ["presentacion", "presentación", "envase", "formato", "peso", "medida"]) ||
                    variation.sku ||
                    variation.name;

                addOption({
                    id: `variation:${variation.id}`,
                    type: "variation",
                    productId: variation.id,
                    sku: variation.sku || variation.erp_id,
                    name: variation.name || view.name,
                    label,
                    price: Number(variation.price || 0),
                    oldPrice: variation.price_retail ? Number(variation.price_retail) : null,
                    stock: variation.stock,
                    image: getProductImageUrl(variation, view.image),
                    isCurrent: variation.id === view.id,
                });
            });
        }

        if (!next.length && Array.isArray(view.priceTiers) && view.priceTiers.length > 1) {
            view.priceTiers.forEach((tier) => {
                const label = normalizePresentationOptionLabel(tier.label || tier.name || tier.key);
                addOption({
                    id: `price-tier:${tier.key || tier.slot}`,
                    type: "price-tier",
                    productId: view.id,
                    sku: view.sku,
                    name: view.name,
                    label,
                    price: Number(tier.value || 0),
                    oldPrice: view.oldPrice,
                    stock: view.stock,
                    image: view.image,
                    isCurrent: tier.slot === 1,
                });
            });
        }

        if (!next.length && view.presentationLabel) {
            addOption({
                id: "current:presentation",
                type: "current",
                productId: view.id,
                sku: view.sku,
                name: view.name,
                label: view.presentationLabel,
                price: view.price,
                oldPrice: view.oldPrice,
                stock: view.stock,
                image: view.image,
                isCurrent: true,
            });
        }

        return next;
    }, [view]);

    useEffect(() => {
        if (!presentationOptions.length) {
            if (selectedPresentationId) setSelectedPresentationId("");
            return;
        }
        const stillExists = presentationOptions.some((option) => option.id === selectedPresentationId);
        if (!stillExists) {
            const current = presentationOptions.find((option) => option.isCurrent) || presentationOptions[0];
            setSelectedPresentationId(current.id);
        }
    }, [presentationOptions, selectedPresentationId]);

    const selectedPresentation =
        presentationOptions.find((option) => option.id === selectedPresentationId) ||
        presentationOptions.find((option) => option.isCurrent) ||
        presentationOptions[0] ||
        null;
    const displayPrice = selectedPresentation?.price && Number(selectedPresentation.price) > 0
        ? Number(selectedPresentation.price)
        : view?.price || 0;
    const displayOldPrice = selectedPresentation?.oldPrice && Number(selectedPresentation.oldPrice) > displayPrice
        ? Number(selectedPresentation.oldPrice)
        : view?.oldPrice || null;
    const displayImage = selectedPresentation?.type === "variation" && selectedPresentation?.image
        ? selectedPresentation.image
        : images[activeImage]?.url || view?.image || FALLBACK_IMAGE;
    const displayAlt = selectedPresentation?.name || view?.alt || "Producto";
    const displayStock = selectedPresentation?.stock ?? view?.stock;
    const displaySku = selectedPresentation?.sku || view?.sku;
    const displayName = selectedPresentation?.type === "variation" ? selectedPresentation.name || view?.name : view?.name;
    const canBuy = view ? isInStock(displayStock) : false;
    const stockStatus = view && showStock ? getStockStatus(displayStock, lowStockThreshold) : null;
    const favoriteActive = view ? isFavorite(view.id) : false;

    const handleReviewSubmit = async (event) => {
        event.preventDefault();
        if (!productId || reviewSubmitting) return;

        const comment = String(reviewForm.comment || "").trim();
        if (!comment) {
            setReviewsError("Escribí un comentario antes de enviar.");
            return;
        }

        setReviewSubmitting(true);
        setReviewsError("");
        try {
            const response = await fetch(`${getApiBase()}/public/products/${productId}/reviews`, {
                method: "POST",
                headers: {
                    ...getTenantHeaders(),
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment,
                    rating: Number(reviewForm.rating || 5),
                }),
            });

            const contentType = response.headers.get("content-type") || "";
            const payload = contentType.includes("application/json")
                ? await response.json()
                : { error: await response.text() };

            if (!response.ok) {
                if (response.status === 401 || payload?.error === "unauthorized") {
                    setReviewsError("Iniciá sesión para comentar.");
                } else if (payload?.error === "reviews_disabled") {
                    setReviewsEnabled(false);
                    setReviewsError("Las reseñas están deshabilitadas para esta tienda.");
                } else {
                    setReviewsError("No se pudo enviar la reseña.");
                }
                return;
            }

            if (payload?.review) {
                setReviews((prev) => [payload.review, ...prev]);
            }
            setReviewForm({ rating: 5, comment: "" });
            showToast("Reseña enviada");
        } catch (err) {
            console.error("No se pudo enviar la reseña", err);
            setReviewsError("No se pudo enviar la reseña.");
        } finally {
            setReviewSubmitting(false);
        }
    };

    const formatReviewDate = (value) => {
        if (!value) return "";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return parsed.toLocaleDateString("es-AR");
    };

    const renderRatingStars = (value) => {
        const safeRating = Math.max(1, Math.min(5, Number(value || 0)));
        return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
    };

    const handleAdd = () => {
        if (!view || !canBuy) return;
        const safeQty = Math.max(1, Number(qty) || 1);
        addToCart({
            id: selectedPresentation?.productId || view.id,
            sku: displaySku,
            name: displayName || view.name,
            price: displayPrice,
            image: displayImage,
            alt: displayAlt,
            stock: displayStock,
            variant: selectedPresentation?.label || view.presentationLabel || view.extra?.variant || "",
        }, safeQty);
    };

    const layoutProps = {
        view, loading, error, images, activeImage, setActiveImage, qty, setQty, addToCart,
        handleAdd, relatedCards, relatedLoading, reviews, reviewsLoading, reviewsError,
        reviewsEnabled, reviewSubmitting, reviewForm, setReviewForm, handleReviewSubmit,
        formatReviewDate, renderRatingStars, favoriteActive, toggleFavorite,
        breadcrumbItems, canBuy, stockStatus, showPricesEnabled, canViewPrices, authLoading, currency, locale,
        activeTab, setActiveTab, canShowSpecifications, specificationEntries, isInStock, user
    };

    const template = settings?.commerce?.product_detail_template || "classic";
    if (template === "minimal") return <ProductDetailMinimal {...layoutProps} />;
    if (template === "immersive") return <ProductDetailImmersive {...layoutProps} />;

    return (
        <StoreLayout>
            <main className="max-w-[1400px] mx-auto w-full px-4 md:px-10 py-10">
                {loading ? (
                    <StoreSkeleton variant="product" />
                ) : error ? (
                    <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-10 text-center text-red-600">
                        {error}
                    </div>
                ) : !view ? (
                    <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-10 text-center text-[#8a7560]">
                        Producto no encontrado.
                    </div>
                ) : (
                    <div className="space-y-10">
                        <ProductBreadcrumb items={breadcrumbItems} className="text-[11px] font-bold" />

                        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-7">
                            <div className="space-y-3">
                                <div className="relative aspect-[1.06] overflow-hidden rounded-lg bg-white dark:bg-[#1a130c]">
                                    <span className="absolute left-5 top-5 z-10 rounded-md bg-[#FF4D00] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                                        {view.extra?.badge || view.extra?.tag || "Producto"}
                                    </span>
                                    <img
                                        src={displayImage}
                                        alt={displayAlt}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                </div>

                                {images.length > 1 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {images.slice(0, 4).map((img, index) => (
                                            <button
                                                key={img.url}
                                                type="button"
                                                onClick={() => setActiveImage(index)}
                                                className={`aspect-square overflow-hidden rounded-md border bg-white transition-colors dark:bg-[#1a130c] ${index === activeImage ? 'border-[#181411] dark:border-white' : 'border-[#e5e1de] hover:border-[#8a7560] dark:border-[#3d2f21] dark:hover:border-[#b8a795]'}`}
                                            >
                                                <img src={img.url} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col justify-center py-1 lg:py-4">
                                {productKicker ? (
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF4D00]">
                                        {productKicker}
                                    </p>
                                ) : null}

                                <h1 className="mt-3 max-w-[520px] text-4xl font-black leading-[0.96] text-[#1A1614] md:text-5xl">
                                    {displayName}
                                </h1>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a7560]">
                                    {displaySku ? <span>SKU: {displaySku}</span> : null}
                                    {stockStatus ? (
                                        <span className={`rounded-full px-2.5 py-1 ${stockStatus.bg} ${stockStatus.tone}`}>
                                            {stockStatus.label}
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-5 max-w-[560px] text-sm leading-7 text-[#6F625C]">
                                    {view.longDescription || view.shortDescription || "Producto cargado desde el panel administrativo."}
                                </p>

                                <div className="mt-6">
                                    {showPricesEnabled ? (
                                        canViewPrices ? (
                                            <div className="flex flex-wrap items-end gap-3">
                                                <span className="text-4xl font-black tracking-tight text-[#FF4D00]">
                                                    {formatCurrency(displayPrice, currency, locale)}
                                                </span>
                                                {displayOldPrice ? (
                                                    <span className="pb-1 text-sm font-bold text-[#B8AAA3] line-through">
                                                        {formatCurrency(displayOldPrice, currency, locale)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : authLoading ? (
                                            <p className="text-sm text-[#8a7560]">Cargando precio...</p>
                                        ) : (
                                            <PriceAccessPrompt />
                                        )
                                    ) : (
                                        <p className="text-sm font-bold text-[#8a7560]">Contactar para precio</p>
                                    )}
                                </div>

                                {presentationOptions.length ? (
                                    <div className="mt-6 space-y-2">
                                        <p className="text-xs font-bold text-[#6F625C]">
                                            {view.variationGroupLabel || "Presentación"}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {presentationOptions.map((option) => {
                                                const selected = option.id === selectedPresentation?.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => setSelectedPresentationId(option.id)}
                                                        className={`min-h-10 rounded-md border px-4 text-xs font-semibold transition-colors ${selected
                                                            ? 'border-[#FF4D00] bg-white text-[#FF4D00]'
                                                            : 'border-[#E7C6B6] bg-[#FFF9F5] text-[#6F625C] hover:border-[#FF4D00]/70'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="mt-8 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleAdd}
                                        className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF4D00] px-6 text-sm font-black text-white shadow-[0_14px_24px_rgba(255,77,0,0.22)] transition-colors hover:bg-[#E64500] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!canBuy}
                                    >
                                        <ShoppingCart className="size-4" />
                                        {canBuy ? "Añadir al carrito" : "Sin stock"}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={favoriteActive ? "Quitar de favoritos" : "Agregar a favoritos"}
                                        onClick={() => {
                                            if (view) {
                                                const added = toggleFavorite(view);
                                                if (added) {
                                                    showToast("Producto añadido a favoritos");
                                                }
                                            }
                                        }}
                                        className={`flex size-14 items-center justify-center rounded-full border transition-colors ${favoriteActive
                                            ? 'border-[#FF4D00] bg-[#FF4D00] text-white'
                                            : 'border-[#FF4D00] bg-white text-[#FF4D00] hover:bg-[#FFF1E8]'
                                            }`}
                                    >
                                        <Bookmark className="size-5" fill={favoriteActive ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                        </section>

                        <div className="rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c]">
                            <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-[#e5e1de] dark:border-[#3d2f21] px-6 pt-5">
                                {[
                                    { id: "description", label: "Descripción" },
                                    ...(canShowSpecifications ? [{ id: "specifications", label: "Especificaciones" }] : []),
                                    { id: "reviews", label: "Reseñas" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-3 px-0.5 text-sm font-bold uppercase tracking-widest ${activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-[#8a7560] hover:text-primary"}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">
                                {activeTab === "description" ? (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xl font-black text-[#181411] dark:text-white mb-2">
                                                {view.name}
                                            </h3>
                                            <p className="text-sm text-[#8a7560] leading-relaxed whitespace-pre-line">
                                                {view.longDescription || view.shortDescription || "Sin descripción disponible."}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                {activeTab === "specifications" && canShowSpecifications ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-black text-[#181411] dark:text-white mb-2">
                                                Especificaciones técnicas
                                            </h3>
                                            <p className="text-sm text-[#8a7560]">
                                                Detalle rápido del producto en formato de celdas.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {specificationEntries.map((item) => (
                                                <div
                                                    key={`spec-${item.label}`}
                                                    className="rounded-2xl border border-[#e5e1de] bg-[#faf8f6] px-4 py-3 dark:border-[#3d2f21] dark:bg-[#120d08]"
                                                >
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7560]">
                                                        {item.label}
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-[#181411] dark:text-white">
                                                        {item.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {activeTab === "reviews" ? (
                                    <div className="space-y-5">
                                        {!reviewsEnabled ? (
                                            <div className="text-sm text-[#8a7560]">
                                                Las reseñas están deshabilitadas para esta tienda.
                                            </div>
                                        ) : null}

                                        {reviewsEnabled ? (
                                            <div className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 bg-[#faf8f6] dark:bg-[#120d08]">
                                                {!user ? (
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <p className="text-sm text-[#8a7560]">
                                                            Iniciá sesión para dejar tu comentario.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate("/login")}
                                                            className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                                        >
                                                            Iniciar sesión
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <form className="space-y-3" onSubmit={handleReviewSubmit}>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#8a7560]">
                                                                Puntuación
                                                            </label>
                                                            <select
                                                                value={reviewForm.rating}
                                                                onChange={(event) =>
                                                                    setReviewForm((prev) => ({
                                                                        ...prev,
                                                                        rating: Number(event.target.value || 5),
                                                                    }))
                                                                }
                                                                className="px-2 py-1 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-xs"
                                                            >
                                                                <option value={5}>5</option>
                                                                <option value={4}>4</option>
                                                                <option value={3}>3</option>
                                                                <option value={2}>2</option>
                                                                <option value={1}>1</option>
                                                            </select>
                                                        </div>
                                                        <textarea
                                                            value={reviewForm.comment}
                                                            onChange={(event) =>
                                                                setReviewForm((prev) => ({
                                                                    ...prev,
                                                                    comment: event.target.value,
                                                                }))
                                                            }
                                                            rows={3}
                                                            maxLength={1000}
                                                            placeholder="Escribí tu experiencia con este producto..."
                                                            className="w-full rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] px-3 py-2 text-sm text-[#181411] dark:text-white placeholder:text-[#8a7560] focus:outline-none focus:border-primary"
                                                        />
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="submit"
                                                                disabled={reviewSubmitting}
                                                                className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-60"
                                                            >
                                                                {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        ) : null}

                                        {reviewsError ? (
                                            <p className="text-sm text-red-600">{reviewsError}</p>
                                        ) : null}

                                        {reviewsLoading ? (
                                            <div className="text-sm text-[#8a7560]">Cargando reseñas...</div>
                                        ) : !reviewsEnabled ? null : reviews.length === 0 ? (
                                            <div className="text-sm text-[#8a7560]">
                                                Todavía no hay reseñas para este producto.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {reviews.map((review) => (
                                                    <article
                                                        key={review.id}
                                                        className="rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] p-4 bg-white dark:bg-[#1a130c]"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                                {review.author_name || "Cliente"}
                                                            </p>
                                                            <p className="text-[10px] uppercase tracking-widest text-[#8a7560]">
                                                                {formatReviewDate(review.created_at)}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs font-bold text-primary mt-1">
                                                            {renderRatingStars(review.rating)}
                                                        </p>
                                                        <p className="text-sm text-[#8a7560] leading-relaxed mt-2">
                                                            {review.comment}
                                                        </p>
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-[#181411] dark:text-white">
                                    Productos relacionados
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => navigate("/catalog")}
                                    className="inline-flex items-center text-[11px] font-bold uppercase tracking-widest text-[#8a7560] hover:text-primary"
                                >
                                    Ver catálogo <ArrowRight className="ml-2 size-4" />
                                </button>
                            </div>

                            {relatedLoading ? (
                                <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-6 text-center text-[#8a7560]">
                                    Cargando relacionados...
                                </div>
                            ) : relatedCards.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#e5e1de] dark:border-[#3d2f21] p-6 text-center text-[#8a7560]">
                                    No hay productos relacionados.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {relatedCards.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-[#1a130c] rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] overflow-hidden group hover:shadow-xl transition-all duration-300">
                                            <div
                                                className="relative aspect-square overflow-hidden bg-[#f5f2f0] dark:bg-[#2c2116] cursor-pointer"
                                                onClick={() => navigate(`/product/${item.id}`)}
                                            >
                                                <img
                                                    alt={item.name}
                                                    title={item.alt}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    src={item.image}
                                                    loading="lazy"
                                                />
                                            </div>

                                            <div className="p-4 flex flex-col gap-2">
                                                <div>
                                                    <h3 className="text-[#181411] dark:text-white font-bold text-sm leading-tight mb-1 line-clamp-2">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                                {showPricesEnabled ? (
                                                    canViewPrices ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-primary font-black text-base">
                                                                {formatCurrency(item.price, currency, locale)}
                                                            </span>
                                                            {item.isWholesaleItem ? (
                                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                                                    Mayorista
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : authLoading ? (
                                                        <span className="text-[#8a7560] text-xs">Cargando precio...</span>
                                                    ) : (
                                                        <PriceAccessPrompt compact />
                                                    )
                                                ) : (
                                                    <span className="text-[#8a7560] text-xs">Consultar precio</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => addToCart(item, 1)}
                                                    className="mt-2 w-full h-9 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white transition-colors"
                                                    disabled={!isInStock(item.stock)}
                                                >
                                                    {isInStock(item.stock) ? "Agregar" : "Sin stock"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </StoreLayout>
    );
}
