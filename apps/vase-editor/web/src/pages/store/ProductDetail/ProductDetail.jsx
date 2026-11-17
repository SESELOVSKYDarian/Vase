// Parte de ProductDetail.jsx: ProductDetail.
// partes: ./review-submit.js, ./ProductTabs.jsx, ./ProductDetailView.jsx
import { useEffect, useMemo, useState } from "react";
import StoreLayout from "../../../components/layout/StoreLayout";
import { useStore } from "../../../context/StoreContext";
import { useTenant } from "../../../context/TenantContext";
import { useAuth } from "../../../context/AuthContext";
import { formatCurrency } from "../../../utils/format";
import { getApiBase, getAuthHeaders, getTenantHeaders } from "../../../utils/api";
import { navigate } from "../../../utils/navigation";
import { getPriceAccessState } from "../../../utils/priceVisibility";
import { getLowStockThreshold, getStockStatus, isInStock } from "../../../utils/stock";
import PriceAccessPrompt from "../../../components/PriceAccessPrompt";
import StoreSkeleton from "../../../components/StoreSkeleton";
import ProductDetailMinimal from "../ProductDetailMinimal";
import ProductDetailImmersive from "../ProductDetailImmersive";
import ProductBreadcrumb from "../../../components/ProductBreadcrumb";
import { resolveProductCategoryContext } from "../../../utils/productCategoryContext";
import { ArrowRight, Bookmark, ShoppingCart } from "lucide-react";
import SpecSheetDownload from "../../../components/store/SpecSheetDownload";
import { specSheetFrom } from "../../../utils/specSheet";
import { FALLBACK_IMAGE, getProductId, getProductImageUrl, getSpecificationValue, normalizePresentationOptionLabel } from "./resolve-product-breadcrumb.js";

import { makeHandleReviewSubmit } from './review-submit.js';
import ProductTabs from './ProductTabs.jsx';
import ProductDetailView from './ProductDetailView.jsx';
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
    const [categories, setCategories] = useState([]);
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
        fetch(`${getApiBase()}/public/categories`, { headers: getTenantHeaders() })
            .then((response) => (response.ok ? response.json() : []))
            .then((data) => {
                if (active) setCategories(Array.isArray(data) ? data : (data?.items || []));
            })
            .catch(() => {
                if (active) setCategories([]);
            });
        return () => { active = false; };
    }, []);

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
            specSheet: specSheetFrom(product.spec_sheet, data.spec_sheet),
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
    // La pestaña aparece si hay datos para mostrar o una ficha técnica para descargar.
    const canShowSpecifications = Boolean((view?.showSpecifications && specificationEntries.length) || view?.specSheet);
    const categoryContext = useMemo(
        () => (product ? resolveProductCategoryContext(product, categories) : null),
        [categories, product],
    );
    const breadcrumbItems = useMemo(() => {
        if (!view || !categoryContext) return [];
        const hierarchy = categoryContext.breadcrumb.map((label, index) => ({
            label,
            href: index === 0 ? '/catalog' : '/catalog',
        }));
        return [{ label: 'Productos', href: '/catalog' }, ...hierarchy, { label: view.name }];
    }, [categoryContext, view]);
    const productKicker = categoryContext?.kicker || "";

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

    const handleReviewSubmit = makeHandleReviewSubmit({ productId, reviewForm, reviewSubmitting, setReviewForm, setReviewSubmitting, setReviews, setReviewsEnabled, setReviewsError, showToast });

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
        <ProductDetailView activeImage={activeImage} activeTab={activeTab} addToCart={addToCart} authLoading={authLoading} breadcrumbItems={breadcrumbItems} canBuy={canBuy} canShowSpecifications={canShowSpecifications} canViewPrices={canViewPrices} currency={currency} displayAlt={displayAlt} displayImage={displayImage} displayName={displayName} displayOldPrice={displayOldPrice} displayPrice={displayPrice} displaySku={displaySku} error={error} favoriteActive={favoriteActive} formatReviewDate={formatReviewDate} handleAdd={handleAdd} handleReviewSubmit={handleReviewSubmit} images={images} loading={loading} locale={locale} presentationOptions={presentationOptions} productKicker={productKicker} relatedCards={relatedCards} relatedLoading={relatedLoading} renderRatingStars={renderRatingStars} reviewForm={reviewForm} reviewSubmitting={reviewSubmitting} reviews={reviews} reviewsEnabled={reviewsEnabled} reviewsError={reviewsError} reviewsLoading={reviewsLoading} selectedPresentation={selectedPresentation} setActiveImage={setActiveImage} setActiveTab={setActiveTab} setReviewForm={setReviewForm} setSelectedPresentationId={setSelectedPresentationId} showPricesEnabled={showPricesEnabled} showToast={showToast} specificationEntries={specificationEntries} stockStatus={stockStatus} toggleFavorite={toggleFavorite} user={user} view={view} />
    );
}
