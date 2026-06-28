import React, { useMemo, useRef, useState, useEffect } from "react";
import StoreLayout from "../../components/layout/StoreLayout";
import DeliveryLocationSelector from "../../components/store/DeliveryLocationSelector";
import { formatCurrency } from "../../utils/format";
import { useStore } from "../../context/StoreContext";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import { getApiBase, getTenantHeaders } from "../../utils/api";
import { navigate } from "../../utils/navigation";
import {
    BILLING_DOCUMENT_OPTIONS,
    BILLING_VAT_OPTIONS,
    EMPTY_BILLING_INFO,
    getBillingDocumentLabel,
    getBillingVatLabel,
    hasBillingInfo,
    normalizeBillingInfo,
} from "../../utils/billing";
import {
    DISTANCE_DELIVERY_KEY,
    normalizeBranches,
    normalizeShippingZones,
    resolveDistanceQuote,
} from "../../utils/shipping";
import { getCountryLabelByCode } from "../../utils/locations";
import { useAddressLocationFields } from "../../hooks/useAddressLocationFields";

const SUPPORTED_PAYMENT_METHODS = ["transfer", "cash_on_pickup"];
const ORDER_CHANNEL_OPTIONS = [
    {
        key: "whatsapp",
        label: "WhatsApp",
        description: "Recibes el pedido y sigues el contacto por WhatsApp.",
    },
    {
        key: "email",
        label: "Gmail",
        description: "Te enviamos la confirmacion del pedido a tu correo.",
    },
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const GENERIC_FLAT_DELIVERY_KEY = "zone:arg-general";
const checkoutFieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const checkoutNoteClass = "mt-1.5 text-xs leading-relaxed text-gray-500";
const checkoutCardClass =
    "rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl shadow-slate-200/70";
const checkoutSoftCardClass = "rounded-xl border border-gray-200 bg-gray-50 p-4";
const checkoutGhostButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900";
const checkoutPrimaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_var(--color-primary)] transition-all hover:brightness-110 hover:shadow-[0_8px_24px_-4px_var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed";

const normalizePaymentMethod = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return null;
    if (["cash", "pickup", "local", "store"].includes(raw)) return "cash_on_pickup";
    return SUPPORTED_PAYMENT_METHODS.includes(raw) ? raw : null;
};

const uniquePaymentMethods = (list = []) => {
    const methods = [];
    list.forEach((item) => {
        const normalized = normalizePaymentMethod(item);
        if (!normalized) return;
        if (!methods.includes(normalized)) {
            methods.push(normalized);
        }
    });
    return methods;
};

const normalizeOrderChannel = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return null;
    if (["gmail", "mail", "correo"].includes(raw)) return "email";
    if (raw === "wa") return "whatsapp";
    return ["whatsapp", "email"].includes(raw) ? raw : null;
};

const mapDistanceQuoteError = (code) => {
    switch (String(code || "")) {
        case "shipping_location_required":
            return "Activa tu ubicacion para calcular el envio.";
        case "delivery_out_of_range":
            return "La direccion esta fuera de las zonas de entrega configuradas.";
        case "shipping_origin_not_configured":
            return "La tienda todavia no configuro coordenadas para la sucursal de origen.";
        case "distance_shipping_not_configured":
        case "location_shipping_not_configured":
            return "La tienda no tiene zonas geograficas ni radios por distancia configurados.";
        default:
            return "No se pudo calcular el envio por ubicacion.";
    }
};

const getDistanceQuoteDescription = (quote) => {
    if (!quote?.ok) return "Comparte tu ubicacion para cotizar";
    if (quote.match_type === "polygon") {
        return `Tu ubicacion coincide con ${quote.zone?.name || "la zona configurada"}.`;
    }
    const branchLabel = quote.branch?.name || "la sucursal mas cercana";
    if (quote.pricing_mode === "per_km") {
        const rateLabel = formatCurrency(Number(quote.price_per_km || 0), "ARS", "es-AR");
        return `${quote.distance_km} km desde ${branchLabel} · ${rateLabel}/km`;
    }
    return `${quote.distance_km} km desde ${branchLabel}`;
};

export default function CheckoutPage() {
    const { cartItems, clearCart } = useStore();
    const { settings } = useTenant();
    const { user, loading: authLoading } = useAuth();
    const commerce = settings?.commerce || {};
    const currency = commerce.currency || "ARS";
    const locale = commerce.locale || "es-AR";
    const [checkoutSettings, setCheckoutSettings] = useState({
        mode: "both",
        enabled_methods: uniquePaymentMethods(commerce.payment_methods || ["transfer", "cash_on_pickup"]),
        whatsapp_number: commerce.whatsapp_number || "",
        whatsapp_template: "",
        bank_transfer: commerce.bank_transfer || {},
        tax_rate: Number(commerce.tax_rate || 0),
        shipping_zones: Array.isArray(commerce.shipping_zones) ? commerce.shipping_zones : [],
        branches: Array.isArray(commerce.branches) ? commerce.branches : [],
        default_delivery: commerce.default_delivery || "",
    });

    const [items, setItems] = useState(cartItems);
    const [validation, setValidation] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);

    // Form state
    const [customerInfo, setCustomerInfo] = useState({
        fullName: "",
        phone: "",
        email: user?.email || "",
    });
    const [shippingInfo, setShippingInfo] = useState({
        fullAddress: "",
        country: "",
        countryCode: "",
        province: "",
        provinceId: "",
        city: "",
        cityId: "",
        postalCode: "",
    });
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [deliveryQuoteError, setDeliveryQuoteError] = useState(null);
    const [billingInfo, setBillingInfo] = useState(EMPTY_BILLING_INFO);
    const [orderChannel, setOrderChannel] = useState("whatsapp");
    const shippingAutofillRef = useRef(false);
    const {
        countryInput: shippingCountryInput,
        countryOptions: shippingCountryOptions,
        countriesLoading: shippingCountriesLoading,
        provinceOptions: shippingProvinceOptions,
        provinceLoading: shippingProvinceLoading,
        cityOptions: shippingCityOptions,
        citiesLoading: shippingCitiesLoading,
        isArgentinaCountry: isArgentinaShippingCountry,
        provinceSuggestionsEnabled: shippingProvinceSuggestionsEnabled,
        citySuggestionsEnabled: shippingCitySuggestionsEnabled,
        handleCountryInputChange: handleShippingCountryInputChange,
        handleProvinceInputChange: handleShippingProvinceInputChange,
        handleCityInputChange: handleShippingCityInputChange,
    } = useAddressLocationFields({
        value: shippingInfo,
        setValue: setShippingInfo,
        fields: {
            countryCode: "countryCode",
            countryLabel: "country",
            province: "province",
            provinceId: "provinceId",
            city: "city",
            cityId: "cityId",
        },
    });
    const shippingZones = useMemo(() => {
        const fromSettings = Array.isArray(checkoutSettings?.shipping_zones) ? checkoutSettings.shipping_zones : [];
        const fromCommerce = Array.isArray(commerce?.shipping_zones) ? commerce.shipping_zones : [];
        const source = fromSettings.length ? fromSettings : fromCommerce;
        return normalizeShippingZones(source, commerce.shipping_flat || 0);
    }, [checkoutSettings, commerce]);

    const pickupBranches = useMemo(() => {
        const fromSettings = Array.isArray(checkoutSettings?.branches) ? checkoutSettings.branches : [];
        const fromCommerce = Array.isArray(commerce?.branches) ? commerce.branches : [];
        const source = fromSettings.length ? fromSettings : fromCommerce;
        return normalizeBranches(source);
    }, [checkoutSettings, commerce]);

    const deliveryOptions = useMemo(() => {
        const options = [];
        const automaticLocationZones = shippingZones.filter(
            (zone) => zone.type === "distance" || (Array.isArray(zone.polygon) && zone.polygon.length >= 3),
        );
        const manualFlatZone = shippingZones.find(
            (zone) => zone.type !== "distance" && (!Array.isArray(zone.polygon) || zone.polygon.length < 3),
        );
        const fallbackFlatPrice =
            commerce?.shipping_flat != null && commerce.shipping_flat !== ""
                ? Number(commerce.shipping_flat || 0)
                : Number(manualFlatZone?.price || 0);
        if (automaticLocationZones.length) {
            options.push({
                key: DISTANCE_DELIVERY_KEY,
                type: "shipping",
                title: "Envio segun tu ubicacion",
                desc: "Calculamos el costo segun tu ubicacion, priorizando zonas fijas y luego la sucursal mas cercana.",
                price: null,
                dynamic: true,
            });
        }
        if (!automaticLocationZones.length && (fallbackFlatPrice > 0 || !pickupBranches.length)) {
            options.push({
                key: GENERIC_FLAT_DELIVERY_KEY,
                type: "shipping",
                title: "Envio general",
                desc: "Tarifa plana definida por la tienda.",
                price: fallbackFlatPrice,
            });
        }
        pickupBranches.forEach((branch) => {
            const detail = [branch.address, branch.hours].filter(Boolean).join(" - ");
            options.push({
                key: `branch:${branch.id}`,
                type: "pickup",
                title: `Retiro: ${branch.name}`,
                desc: detail || "Retiro en sucursal",
                price: Number(branch.pickup_fee || 0),
            });
        });
        if (!options.length) {
            options.push({
                key: GENERIC_FLAT_DELIVERY_KEY,
                type: "shipping",
                title: "Envio general",
                desc: "Tarifa plana definida por la tienda.",
                price: fallbackFlatPrice,
            });
        }
        return options;
    }, [shippingZones, pickupBranches, commerce]);

    const shippingDeliveryOptions = useMemo(
        () => deliveryOptions.filter((option) => option.type === "shipping"),
        [deliveryOptions],
    );
    const pickupDeliveryOptions = useMemo(
        () => deliveryOptions.filter((option) => option.type === "pickup"),
        [deliveryOptions],
    );

    const [deliveryMethod, setDeliveryMethod] = useState(() => {
        const fallback = String(commerce.default_delivery || DISTANCE_DELIVERY_KEY).trim();
        return fallback || DISTANCE_DELIVERY_KEY;
    });

    useEffect(() => {
        const selected = deliveryOptions.find((option) => option.key === deliveryMethod);
        if (selected) return;
        const preferred = String(checkoutSettings?.default_delivery || "").trim();
        const preferredOption = deliveryOptions.find((option) => option.key === preferred);
        setDeliveryMethod(preferredOption?.key || deliveryOptions[0]?.key || DISTANCE_DELIVERY_KEY);
    }, [deliveryOptions, deliveryMethod, checkoutSettings]);

    const selectedDeliveryGroup = useMemo(() => {
        const selected = deliveryOptions.find((option) => option.key === deliveryMethod);
        return selected?.type === "pickup" ? "pickup" : "shipping";
    }, [deliveryMethod, deliveryOptions]);

    const handleDeliveryGroupChange = (nextGroup) => {
        if (nextGroup === "pickup") {
            const nextPickup = pickupDeliveryOptions[0];
            if (nextPickup) {
                setDeliveryMethod(nextPickup.key);
            }
            return;
        }
        const nextShipping =
            shippingDeliveryOptions.find((option) => option.key === DISTANCE_DELIVERY_KEY) ||
            shippingDeliveryOptions[0];
        if (nextShipping) {
            setDeliveryMethod(nextShipping.key);
        }
    };

    const distanceQuote = useMemo(() => {
        if (deliveryMethod !== DISTANCE_DELIVERY_KEY || !deliveryLocation) return null;
        return resolveDistanceQuote({
            shippingZones,
            branches: pickupBranches,
            location: deliveryLocation,
        });
    }, [deliveryLocation, deliveryMethod, pickupBranches, shippingZones]);

    const bankTransfer = checkoutSettings?.bank_transfer || commerce.bank_transfer || {};
    const whatsappNumber = String(checkoutSettings?.whatsapp_number || commerce.whatsapp_number || "").replace(/\D/g, "");
    const enabledMethods = useMemo(() => {
        const settingsMethods = uniquePaymentMethods(checkoutSettings?.enabled_methods);
        if (settingsMethods.length) return settingsMethods;
        const commerceMethods = uniquePaymentMethods(commerce?.payment_methods);
        if (commerceMethods.length) return commerceMethods;
        const mode = checkoutSettings?.mode || commerce.checkout_mode || commerce.mode || "both";
        if (mode === "transfer") return ["transfer"];
        if (mode === "cash_on_pickup") return ["cash_on_pickup"];
        return ["transfer", "cash_on_pickup"];
    }, [checkoutSettings, commerce]);

    const paymentOptions = useMemo(() => {
        const options = [];
        if (enabledMethods.includes("transfer")) {
            options.push({
                key: "transfer",
                label: "Transferencia bancaria",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                ),
            });
        }
        if (enabledMethods.includes("cash_on_pickup")) {
            options.push({
                key: "cash_on_pickup",
                label: "Pago al retirar",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v10H3z"></path><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"></path><path d="M12 11v2"></path></svg>
                ),
            });
        }
        return options;
    }, [enabledMethods]);

    const [paymentMethod, setPaymentMethod] = useState("transfer");
    const goToAuthForCheckout = (path = "/login") => {
        sessionStorage.setItem("teflon_post_login_redirect", "/checkout");
        navigate(path);
    };

    useEffect(() => {
        const firstEnabled = paymentOptions.find((opt) => !opt.disabled);
        const selected = paymentOptions.find((opt) => opt.key === paymentMethod && !opt.disabled);
        if (!selected) {
            setPaymentMethod(firstEnabled?.key || "transfer");
        }
    }, [paymentOptions, paymentMethod]);

    useEffect(() => {
        if (!user?.email) return;
        setCustomerInfo((prev) => ({
            ...prev,
            email: prev.email || user.email,
            fullName: prev.fullName || user.display_name || user.name || user.email.split("@")[0] || "",
            phone: prev.phone || user.phone || "",
        }));
        setShippingInfo((prev) => ({
            ...prev,
            fullAddress: prev.fullAddress || user.address || "",
            country: prev.country || user.country_label || "",
            countryCode: prev.countryCode || user.country_code || "",
            province: prev.province || user.province || "",
            city: prev.city || user.city || "",
            postalCode: prev.postalCode || user.postal_code || "",
        }));
        if (user.billing_info && typeof user.billing_info === 'object' && Object.keys(user.billing_info).length) {
            setBillingInfo((prev) => normalizeBillingInfo({ ...prev, ...user.billing_info }));
        }
    }, [user]);

    useEffect(() => {
        if (!whatsappNumber && orderChannel === "whatsapp") {
            setOrderChannel("email");
        }
    }, [orderChannel, whatsappNumber]);

    useEffect(() => {
        if (deliveryMethod !== DISTANCE_DELIVERY_KEY) {
            setDeliveryQuoteError(null);
            return;
        }
        if (!deliveryLocation) {
            setDeliveryQuoteError(null);
            return;
        }
        if (distanceQuote?.ok) {
            setDeliveryQuoteError(null);
            return;
        }
        setDeliveryQuoteError(mapDistanceQuoteError(distanceQuote?.error));
    }, [deliveryLocation, deliveryMethod, distanceQuote]);

    const [orderSuccess, setOrderSuccess] = useState(null);
    const [taxesAcknowledged, setTaxesAcknowledged] = useState(false);

    // Accordion open
    const [openStep, setOpenStep] = useState(1); // 1..3

    useEffect(() => {
        setItems(cartItems);
    }, [cartItems]);

    useEffect(() => {
        let active = true;
        const loadCheckoutSettings = async () => {
            try {
                const response = await fetch(`${getApiBase()}/api/settings/checkout`, {
                    headers: getTenantHeaders(),
                });
                if (!response.ok) {
                    throw new Error(`checkout_settings_${response.status}`);
                }
                const data = await response.json();
                if (!active) return;
                setCheckoutSettings({
                    mode: data.mode || "both",
                    enabled_methods: uniquePaymentMethods(data.enabled_methods || []),
                    whatsapp_number: data.whatsapp_number || "",
                    whatsapp_template: data.whatsapp_template || "",
                    bank_transfer: data.bank_transfer || {},
                    tax_rate: Number(data.tax_rate ?? commerce.tax_rate ?? 0),
                    shipping_zones: Array.isArray(data.shipping_zones) ? data.shipping_zones : [],
                    branches: Array.isArray(data.branches) ? data.branches : [],
                    default_delivery: data.default_delivery || commerce.default_delivery || "",
                });
            } catch (err) {
                if (!active) return;
                setCheckoutSettings((prev) => ({
                    ...prev,
                    mode: commerce.checkout_mode || commerce.mode || prev.mode || "both",
                    enabled_methods: uniquePaymentMethods(commerce.payment_methods || prev.enabled_methods || ["transfer", "cash_on_pickup"]),
                    whatsapp_number: commerce.whatsapp_number || prev.whatsapp_number || "",
                    bank_transfer: commerce.bank_transfer || prev.bank_transfer || {},
                    tax_rate: Number(commerce.tax_rate ?? prev.tax_rate ?? 0),
                    shipping_zones: Array.isArray(commerce.shipping_zones) ? commerce.shipping_zones : (prev.shipping_zones || []),
                    branches: Array.isArray(commerce.branches) ? commerce.branches : (prev.branches || []),
                    default_delivery: commerce.default_delivery || prev.default_delivery || "",
                }));
            }
        };
        loadCheckoutSettings();
        return () => {
            active = false;
        };
    }, [commerce]);

    useEffect(() => {
        if (!user || shippingAutofillRef.current) return;
        const key = `teflon_profile_address_${user.id || user.email}`;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const resolvedCountryLabel = parsed.country || getCountryLabelByCode(parsed.countryCode || "");
            const prefill = {
                fullAddress: parsed.line1 || parsed.fullAddress || "",
                country: resolvedCountryLabel || "",
                countryCode: parsed.countryCode || "",
                province: parsed.region || parsed.province || "",
                provinceId: parsed.provinceId || "",
                city: parsed.city || "",
                cityId: parsed.cityId || "",
                postalCode: parsed.postal || parsed.postalCode || "",
            };
            const prefillCustomer = {
                fullName: parsed.fullName || user?.email?.split("@")[0] || "",
                phone: parsed.phone || parsed.phoneNumber || "",
                email: user?.email || "",
            };
            const prefillBilling = normalizeBillingInfo({
                ...parsed,
                billingAddress: parsed.billingAddress || parsed.line1 || parsed.address || "",
                billingCity: parsed.billingCity || parsed.city || "",
            });
            setShippingInfo((prev) => ({
                fullAddress: prev.fullAddress || prefill.fullAddress,
                country: prev.country || prefill.country,
                countryCode: prev.countryCode || prefill.countryCode,
                province: prev.province || prefill.province,
                provinceId: prev.provinceId || prefill.provinceId,
                city: prev.city || prefill.city,
                cityId: prev.cityId || prefill.cityId,
                postalCode: prev.postalCode || prefill.postalCode,
            }));
            setCustomerInfo((prev) => ({
                fullName: prev.fullName || prefillCustomer.fullName,
                phone: prev.phone || prefillCustomer.phone,
                email: prev.email || prefillCustomer.email,
            }));
            setBillingInfo((prev) => ({
                businessName: prev.businessName || prefillBilling.businessName,
                address: prev.address || prefillBilling.address,
                city: prev.city || prefillBilling.city,
                vatType: prev.vatType || prefillBilling.vatType,
                documentType: prev.documentType || prefillBilling.documentType || "cuit",
                documentNumber: prev.documentNumber || prefillBilling.documentNumber,
            }));
            shippingAutofillRef.current = true;
        } catch (err) {
            console.warn("No se pudo cargar la direccion de perfil", err);
        }
    }, [user]);

    useEffect(() => {
        setBillingInfo((prev) => {
            const nextAddress = prev.address || shippingInfo.fullAddress || "";
            const nextCity = prev.city || shippingInfo.city || "";
            if (nextAddress === prev.address && nextCity === prev.city) {
                return prev;
            }
            return {
                ...prev,
                address: nextAddress,
                city: nextCity,
            };
        });
    }, [shippingInfo.fullAddress, shippingInfo.city]);

    useEffect(() => {
        let active = true;

        const validateCart = async () => {
            if (authLoading) {
                return;
            }
            if (!user) {
                setValidation(null);
                setValidationError(null);
                return;
            }
            if (!items.length) {
                setValidation(null);
                setValidationError(null);
                return;
            }

            try {
                const response = await fetch(`${getApiBase()}/checkout/validate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...getTenantHeaders(),
                        'Authorization': `Bearer ${localStorage.getItem('teflon_token')}`
                    },
                    body: JSON.stringify({
                        items: items.map((item) => ({
                            product_id: item.id,
                            qty: item.qty,
                        })),
                    }),
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error?.errors?.[0] || "No se pudo validar el carrito");
                }

                const data = await response.json();
                if (!active) return;

                setValidation(data);
                setValidationError(null);
            } catch (err) {
                console.error("Error al validar el carrito", err);
                if (active) {
                    setValidation(null);
                    setValidationError("No se pudo validar el carrito. Revisa los productos.");
                }
            }
        };

        validateCart();

        return () => {
            active = false;
        };
    }, [authLoading, items, user]);

    const subtotal = useMemo(() => {
        if (validation?.subtotal != null) {
            return Number(validation.subtotal);
        }
        return items.reduce((acc, it) => acc + it.price * it.qty, 0);
    }, [items, validation]);

    const selectedDeliveryOption = useMemo(() => {
        if (deliveryMethod === DISTANCE_DELIVERY_KEY) {
            if (distanceQuote?.ok) {
                return {
                    key: `zone:${distanceQuote.zone.id}`,
                    type: "shipping",
                    title: `Envio: ${distanceQuote.zone.name}`,
                    desc:
                        distanceQuote.zone.description ||
                        getDistanceQuoteDescription(distanceQuote),
                    price: Number(distanceQuote.final_price ?? distanceQuote.price ?? 0),
                    branch_id: distanceQuote.branch?.id || null,
                    shipping_zone_id: distanceQuote.zone.id,
                    distance_km: distanceQuote.distance_km,
                    pricing_mode: distanceQuote.pricing_mode || "fixed",
                    price_per_km: Number(distanceQuote.price_per_km || 0),
                    base_price: Number(distanceQuote.base_price || 0),
                    zone_amount: Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0),
                    freight_amount: Number(distanceQuote.freight_amount || 0),
                    final_price: Number(distanceQuote.final_price ?? distanceQuote.price ?? 0),
                    dynamic: true,
                };
            }

            return {
                key: DISTANCE_DELIVERY_KEY,
                type: "shipping",
                title: "Envio segun tu ubicacion",
                desc: "Comparte tu ubicacion para calcular el costo.",
                price: 0,
                branch_id: null,
                shipping_zone_id: null,
                distance_km: null,
                dynamic: true,
                pending_quote: true,
            };
        }

        return deliveryOptions.find((option) => option.key === deliveryMethod) || deliveryOptions[0] || null;
    }, [deliveryMethod, deliveryOptions, distanceQuote]);
    const isShippingDelivery = selectedDeliveryOption?.type !== "pickup";
    const displayCurrency = validation?.currency || currency;
    const taxRate = Number(checkoutSettings?.tax_rate ?? commerce.tax_rate ?? 0);
    const shipping = subtotal > 0 ? Number(selectedDeliveryOption?.price || 0) : 0;
    const iva = (subtotal + shipping) * taxRate;
    const total = subtotal + shipping + iva;

    const summaryItems = validation?.items?.length
        ? validation.items.map((item) => {
            const fallback = items.find((it) => it.id === item.product_id);
            return {
                id: item.product_id,
                sku: item.sku || fallback?.sku || item.product_id,
                name: item.name,
                qty: item.qty,
                price: item.unit_price,
                image: fallback?.image,
                alt: fallback?.alt || item.name,
            };
        })
        : items;
    const paymentSummary = useMemo(() => {
        if (paymentMethod === "transfer") {
            return "Te mostraremos los datos para transferir cuando confirmes tu compra.";
        }
        if (paymentMethod === "cash_on_pickup") {
            return "Confirmas ahora y pagas cuando retires tu pedido.";
        }
        return "Elige la forma de pago que prefieras para continuar.";
    }, [paymentMethod]);

    const paymentLabel = useMemo(
        () => paymentOptions.find((opt) => opt.key === paymentMethod)?.label || "",
        [paymentOptions, paymentMethod]
    );
    const normalizedBilling = useMemo(() => normalizeBillingInfo(billingInfo), [billingInfo]);
    const hasOrderBillingInfo = useMemo(() => hasBillingInfo(normalizedBilling), [normalizedBilling]);

    const getProfileAddress = () => {
        if (!user) return {};
        try {
            const keys = [];
            if (user.id) {
                keys.push(`teflon_profile_address_${user.id}`);
            }
            if (user.email) {
                keys.push(`teflon_profile_address_${String(user.email).trim().toLowerCase()}`);
            }
            let parsed = null;
            for (const key of keys) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    parsed = JSON.parse(raw);
                    break;
                }
            }
            if (!parsed) return {};
            const resolvedCountryLabel = parsed.country || getCountryLabelByCode(parsed.countryCode || "");
            return {
                fullName: parsed.fullName || "",
                phone: parsed.phone || parsed.phoneNumber || "",
                line1: parsed.line1 || "",
                country: resolvedCountryLabel || "",
                countryCode: parsed.countryCode || "",
                province: parsed.region || parsed.province || "",
                provinceId: parsed.provinceId || "",
                city: parsed.city || "",
                cityId: parsed.cityId || "",
                postal: parsed.postal || parsed.postalCode || "",
                billing: normalizeBillingInfo({
                    ...parsed,
                    billingAddress: parsed.billingAddress || parsed.line1 || parsed.address || "",
                    billingCity: parsed.billingCity || parsed.city || "",
                }),
            };
        } catch (err) {
            console.warn("No se pudo leer la direccion de perfil", err);
            return {};
        }
    };

    const buildWhatsappMessage = (note = "") => {
        const profile = getProfileAddress();
        const name =
            customerInfo.fullName.trim() ||
            profile.fullName ||
            (user?.email ? user.email.split("@")[0] : "Cliente");
        const phone = customerInfo.phone.trim() || profile.phone || "Sin telefono";
        const email = customerInfo.email.trim() || user?.email || "Sin email";
        const deliveryLabel = selectedDeliveryOption?.title || deliveryMethod;
        const paymentLine =
            paymentMethod === "transfer"
                ? "Pago: Transferencia bancaria"
                : paymentMethod === "cash_on_pickup"
                    ? "Pago: En local"
                    : "Pago";
        const addressParts = [
            shippingInfo.fullAddress || profile.line1,
            shippingInfo.province || profile.province,
            shippingInfo.city || profile.city,
            shippingInfo.postalCode || profile.postal,
            shippingInfo.country || profile.country,
        ]
            .filter(Boolean)
            .join(", ");
        const lines = [
            "Pedido nuevo",
            `Cliente: ${name}`,
            `Telefono: ${phone}`,
            `Email: ${email}`,
            `Direccion: ${addressParts || "Sin direccion"}`,
            `Entrega: ${deliveryLabel}`,
            paymentLine,
            "",
            "Productos:",
            ...summaryItems.map(
                (item) =>
                    `- ${item.name} (SKU: ${item.sku || item.id}) x${item.qty} | ${formatCurrency(Number(item.price || 0), displayCurrency, locale)} | ${formatCurrency(Number(item.price || 0) * Number(item.qty || 0), displayCurrency, locale)}`
            ),
            "",
            `Total: ${formatCurrency(total, displayCurrency, locale)}`,
        ];
        if (hasOrderBillingInfo) {
            lines.push(
                "",
                "Facturacion:",
                `Razon social: ${normalizedBilling.businessName || "-"}`,
                `Direccion: ${normalizedBilling.address || "-"}`,
                `Localidad: ${normalizedBilling.city || "-"}`,
                `IVA: ${getBillingVatLabel(normalizedBilling.vatType)}`,
                `${getBillingDocumentLabel(normalizedBilling.documentType)}: ${normalizedBilling.documentNumber || "-"}`
            );
        }
        if (note) {
            lines.push("", note);
        }
        return lines.join("\n");
    };

    const buildWhatsappUrl = (note = "") => {
        const message = buildWhatsappMessage(note);
        const number = whatsappNumber;
        if (!number) return null;
        return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    };

    const persistProfileCheckoutData = (customerPayload) => {
        if (!user || !customerPayload) return;
        const keys = [];
        if (user.id) {
            keys.push(`teflon_profile_address_${user.id}`);
        }
        if (user.email) {
            keys.push(`teflon_profile_address_${String(user.email).trim().toLowerCase()}`);
        }
        if (!keys.length) return;

        const billing = normalizeBillingInfo(customerPayload.billing || customerPayload);

        try {
            let previous = {};
            for (const key of keys) {
                const raw = localStorage.getItem(key);
                if (raw) {
                    previous = JSON.parse(raw);
                    break;
                }
            }

            const next = {
                ...previous,
                fullName: customerPayload.full_name || customerPayload.fullName || previous.fullName || "",
                line1: customerPayload.fullAddress || previous.line1 || "",
                address: customerPayload.fullAddress || previous.address || "",
                fullAddress: customerPayload.fullAddress || previous.fullAddress || "",
                country: customerPayload.country || previous.country || getCountryLabelByCode(customerPayload.countryCode || previous.countryCode || ""),
                countryCode: customerPayload.countryCode || previous.countryCode || "",
                province: customerPayload.province || previous.province || "",
                region: customerPayload.province || previous.region || "",
                provinceId: customerPayload.provinceId || previous.provinceId || "",
                city: customerPayload.city || previous.city || "",
                cityId: customerPayload.cityId || previous.cityId || "",
                locality: customerPayload.city || previous.locality || "",
                postal: customerPayload.postalCode || previous.postal || "",
                postalCode: customerPayload.postalCode || previous.postalCode || "",
                phone: customerPayload.phone || previous.phone || "",
                company: previous.company || "",
                cuit: previous.cuit || billing.documentNumber || "",
                billingBusinessName: billing.businessName,
                billingAddress: billing.address,
                billingCity: billing.city,
                billingVatType: billing.vatType,
                billingDocumentType: billing.documentType,
                billingDocumentNumber: billing.documentNumber,
                billing,
            };

            keys.forEach((key) => {
                localStorage.setItem(key, JSON.stringify(next));
            });
        } catch (err) {
            console.warn("No se pudo guardar la facturacion del perfil", err);
        }
    };

    const handleCompletePurchase = async () => {
        if (!items.length) return;
        if (!user) {
            setCheckoutError("Inicia sesion para continuar con el pago.");
            goToAuthForCheckout("/login");
            return;
        }
        const normalizedEmail = String(customerInfo.email || "").trim().toLowerCase();
        const normalizedName = String(customerInfo.fullName || "").trim();
        const normalizedPhone = String(customerInfo.phone || "").trim();

        if (!normalizedName) {
            setCheckoutError("Completa tu nombre para generar el pedido.");
            return;
        }
        if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
            setCheckoutError("Completa un email valido para recibir la confirmacion.");
            return;
        }
        if (orderChannel === "whatsapp" && !whatsappNumber) {
            setCheckoutError("El canal por WhatsApp no esta disponible para esta tienda.");
            return;
        }
        if (isShippingDelivery) {
            if (
                !shippingInfo.fullAddress.trim()
                || !shippingInfo.countryCode
                || !shippingInfo.province.trim()
                || !shippingInfo.city.trim()
                || !shippingInfo.postalCode.trim()
            ) {
                setCheckoutError("Completa direccion, pais, provincia, ciudad y codigo postal para la entrega a domicilio.");
                return;
            }
            if (shippingProvinceSuggestionsEnabled && !shippingInfo.provinceId) {
                setCheckoutError("Selecciona una provincia valida para continuar con el envio.");
                return;
            }
            if (shippingCitySuggestionsEnabled && !shippingInfo.cityId) {
                setCheckoutError("Selecciona una ciudad valida para continuar con el envio.");
                return;
            }
            if (deliveryMethod === DISTANCE_DELIVERY_KEY && !distanceQuote?.ok) {
                setCheckoutError(mapDistanceQuoteError(distanceQuote?.error || "shipping_location_required"));
                return;
            }
        }
        if (hasOrderBillingInfo) {
            if (
                !normalizedBilling.businessName ||
                !normalizedBilling.address ||
                !normalizedBilling.city ||
                !normalizedBilling.vatType ||
                !normalizedBilling.documentNumber
            ) {
                setCheckoutError("Completa razon social, direccion, localidad, tipo de IVA y numero de documento para la facturacion.");
                return;
            }
        }
        if (!taxesAcknowledged) {
            setCheckoutError("Debes aceptar y confirmar la informacion de impuestos antes de proceder con el pago.");
            return;
        }

        setCreating(true);
        setCheckoutError(null);

        try {
            const resolvedDeliveryMethod =
                deliveryMethod === DISTANCE_DELIVERY_KEY && distanceQuote?.ok
                    ? `zone:${distanceQuote.zone.id}`
                    : deliveryMethod;
            const customerPayload = {
                ...customerInfo,
                ...shippingInfo,
                full_name: normalizedName,
                phone: normalizedPhone,
                email: normalizedEmail,
                contact_channel: orderChannel,
                delivery_method: resolvedDeliveryMethod,
                delivery_label: selectedDeliveryOption?.title || deliveryMethod,
                delivery_type: selectedDeliveryOption?.type || "shipping",
                shipping_zone_id: resolvedDeliveryMethod.startsWith("zone:") ? resolvedDeliveryMethod.replace("zone:", "") : undefined,
                branch_id: resolvedDeliveryMethod.startsWith("branch:")
                    ? resolvedDeliveryMethod.replace("branch:", "")
                    : distanceQuote?.branch?.id || undefined,
                payment_method: paymentMethod,
                billing: normalizedBilling,
                shipping_location: deliveryLocation && distanceQuote?.ok
                    ? {
                        latitude: deliveryLocation.latitude,
                        longitude: deliveryLocation.longitude,
                        distance_km: distanceQuote.distance_km,
                        branch_id: distanceQuote.branch?.id || null,
                        shipping_zone_id: distanceQuote.zone?.id || null,
                        zone_amount: Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0),
                        freight_amount: Number(distanceQuote.freight_amount || 0),
                        final_price: Number(distanceQuote.final_price ?? distanceQuote.price ?? 0),
                        pricing_mode: distanceQuote.pricing_mode || "fixed",
                        source: "checkout_location_picker",
                    }
                    : undefined,
            };

            const response = await fetch(`${getApiBase()}/api/orders/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getTenantHeaders(),
                    'Authorization': `Bearer ${localStorage.getItem('teflon_token')}`
                },
                body: JSON.stringify({
                    items: items.map((item) => ({
                        product_id: item.id,
                        qty: item.qty,
                    })),
                    checkout_mode: paymentMethod,
                    payment_method: paymentMethod,
                    order_channel: orderChannel,
                    customer: customerPayload,
                }),
            });

            if (!response.ok) {
                let detail = "";
                try {
                    const error = await response.json();
                    detail = error?.errors?.[0] || error?.error || "";
                } catch (err) {
                    try {
                        detail = await response.text();
                    } catch (innerErr) {
                        detail = "";
                    }
                }
                const message = detail ? `No se pudo crear la orden: ${detail}` : "No se pudo crear la orden";
                throw new Error(message);
            }

            const data = await response.json();
            const checkoutModeResolved = data.checkout_mode || paymentMethod;
            const resolvedOrderChannel = normalizeOrderChannel(data.contact_channel) || orderChannel;
            const totals = data.totals || {};
            const emailDelivery = data.email_delivery || {
                sent: false,
                provider: "unknown",
                email: normalizedEmail,
            };
            const whatsappUrl = data.whatsapp_url || buildWhatsappUrl();
            const resolvedStatus =
                checkoutModeResolved === "transfer"
                    ? "Pendiente de pago"
                    : "En gestion";
            const orderInfo = {
                id: data.order?.id || data.order_id || data.id || `TMP-${Date.now()}`,
                method: checkoutModeResolved,
                paymentLabel,
                deliveryMethod: resolvedDeliveryMethod,
                deliveryLabel: selectedDeliveryOption?.title || deliveryMethod,
                status: resolvedStatus,
                total: Number(totals.total ?? total),
                currency: totals.currency || displayCurrency,
                locale,
                contactChannel: resolvedOrderChannel,
                customerName: normalizedName,
                customerEmail: normalizedEmail,
                customer: customerPayload,
                billing: normalizedBilling,
                emailDelivery,
                items: items.map((item) => ({
                    id: item.id,
                    sku: item.sku || item.id,
                    name: item.name,
                    qty: item.qty,
                })),
                whatsappUrl,
                whatsappReceiptUrl: whatsappUrl
                    ? buildWhatsappUrl(
                    "Pago realizado. Adjunto comprobante."
                )
                    : null,
                bankTransfer,
                createdAt: new Date().toISOString(),
            };

            try {
                persistProfileCheckoutData(customerPayload);
                localStorage.setItem("teflon_last_order", JSON.stringify(orderInfo));
                const historyKey = `teflon_orders_${user?.id || user?.email || "guest"}`;
                const existing = localStorage.getItem(historyKey);
                const parsed = existing ? JSON.parse(existing) : [];
                const list = Array.isArray(parsed) ? parsed : [];
                const next = [orderInfo, ...list].slice(0, 20);
                localStorage.setItem(historyKey, JSON.stringify(next));
            } catch (err) {
                console.warn("No se pudo guardar el pedido", err);
            }

            clearCart();
            setOrderSuccess(orderInfo);
            setOpenStep(3);
            navigate("/order-success");
        } catch (err) {
            console.error("Error al crear la orden", err);
            setCheckoutError(err?.message || "No se pudo iniciar el pago. Proba nuevamente.");
        } finally {
            setCreating(false);
        }
    };
    if (authLoading) {
        return (
            <StoreLayout>
                <main className="max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
                    <h1 className="text-3xl font-black mb-4">Cargando checkout</h1>
                    <p className="text-[#8a7560] mb-8">
                        Estamos verificando tu sesion.
                    </p>
                </main>
            </StoreLayout>
        );
    }

    if (!user) {
        return (
            <StoreLayout>
                <main className="max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
                    <h1 className="text-3xl font-black mb-4">Debes iniciar sesion para continuar</h1>
                    <p className="text-[#8a7560] mb-8">
                        Puedes usar el carrito sin problema, pero para finalizar la compra necesitas una cuenta activa.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => goToAuthForCheckout("/login")}
                            className="bg-primary text-white font-bold px-6 py-3 rounded-lg"
                        >
                            Iniciar sesion
                        </button>
                        <button
                            type="button"
                            onClick={() => goToAuthForCheckout("/signup")}
                            className="border border-[#d9d1ca] text-[#181411] font-bold px-6 py-3 rounded-lg"
                        >
                            Crear cuenta
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/cart")}
                            className="border border-[#d9d1ca] text-[#8a7560] font-bold px-6 py-3 rounded-lg"
                        >
                            Volver al carrito
                        </button>
                    </div>
                </main>
            </StoreLayout>
        );
    }

    if (!items.length) {
        return (
            <StoreLayout>
                <main className="max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
                    <h1 className="text-3xl font-black mb-4">No hay productos para pagar</h1>
                    <p className="text-[#8a7560] mb-8">
                        Suma productos al carrito para continuar.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate("/catalog")}
                        className="bg-primary text-white font-bold px-6 py-3 rounded-lg"
                    >
                        Ir al catalogo
                    </button>
                </main>
            </StoreLayout>
        );
    }

    return (
        <StoreLayout>
            <main className="mx-auto w-full max-w-[1400px] px-4 py-6 text-gray-900 md:px-8 md:py-10">
                {/* Breadcrumbs */}
                <div className="mb-6 flex items-center gap-2 text-xs text-gray-500">
                    <button
                        className="transition-colors hover:text-gray-700"
                        onClick={() => (window.location.hash = '#')}
                        type="button"
                    >
                        Inicio
                    </button>
                    <span className="text-gray-300">/</span>
                    <button
                        className="transition-colors hover:text-gray-700"
                        onClick={() => (window.location.hash = '#cart')}
                        type="button"
                    >
                        Carrito
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900">Finalizar compra</span>
                </div>

                {/* Heading */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight leading-tight text-gray-900">
                        Finalizar compra
                    </h1>
                </div>

                <div className="flex flex-col gap-8 xl:flex-row">
                    {/* Left column */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Step Progress */}
                        <StepProgress openStep={openStep} />

                        {/* Steps */}
                        <div className="flex flex-col gap-4">
                            {/* 1 Shipping */}
                            <Accordion
                                step={1}
                                title="Tus datos"
                                openStep={openStep}
                                onOpen={() => setOpenStep(1)}
                            >
                                <div className="pt-4 pb-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Nombre completo
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="Tu nombre"
                                                type="text"
                                                value={customerInfo.fullName}
                                                onChange={(e) =>
                                                    setCustomerInfo((prev) => ({
                                                        ...prev,
                                                        fullName: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Telefono
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="+54 11..."
                                                type="tel"
                                                value={customerInfo.phone}
                                                onChange={(e) =>
                                                    setCustomerInfo((prev) => ({
                                                        ...prev,
                                                        phone: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">
                                                Email
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="tucorreo@gmail.com"
                                                type="email"
                                                value={customerInfo.email}
                                                onChange={(e) =>
                                                    setCustomerInfo((prev) => ({
                                                        ...prev,
                                                        email: e.target.value,
                                                    }))
                                                }
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                Aca te enviamos la confirmacion del pedido.
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">
                                                Direccion completa
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="Calle Falsa 123"
                                                type="text"
                                                value={shippingInfo.fullAddress}
                                                onChange={(e) =>
                                                    setShippingInfo((s) => ({
                                                        ...s,
                                                        fullAddress: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Pais
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="Argentina"
                                                type="text"
                                                list="checkout-country-options"
                                                value={shippingCountryInput}
                                                onChange={(e) => handleShippingCountryInputChange(e.target.value)}
                                                autoComplete="country-name"
                                            />
                                            <datalist id="checkout-country-options">
                                                {shippingCountryOptions.map((country) => (
                                                    <option key={country.value} value={country.label} />
                                                ))}
                                            </datalist>
                                            <p className={checkoutNoteClass}>
                                                {shippingCountriesLoading ? "Cargando paises..." : "Escribe para buscar y selecciona un pais del listado."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Provincia
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder={isArgentinaShippingCountry ? "Buenos Aires" : "Provincia / estado / region"}
                                                type="text"
                                                list={shippingProvinceSuggestionsEnabled ? "checkout-province-options" : undefined}
                                                value={shippingInfo.province}
                                                onChange={(e) => handleShippingProvinceInputChange(e.target.value)}
                                                autoComplete="address-level1"
                                                disabled={!shippingInfo.countryCode}
                                            />
                                            {shippingProvinceSuggestionsEnabled ? (
                                                <datalist id="checkout-province-options">
                                                    {shippingProvinceOptions.map((province) => (
                                                        <option key={province.value} value={province.label} />
                                                    ))}
                                                </datalist>
                                            ) : null}
                                            <p className={checkoutNoteClass}>
                                                {!shippingInfo.countryCode
                                                    ? "Primero selecciona un pais."
                                                    : isArgentinaShippingCountry
                                                        ? shippingProvinceLoading
                                                            ? "Cargando provincias de Argentina..."
                                                            : shippingProvinceSuggestionsEnabled
                                                                ? "Selecciona una provincia valida para habilitar las ciudades."
                                                                : "No pudimos cargar provincias. Puedes escribirla manualmente."
                                                        : "Completa la provincia o estado manualmente."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Ciudad
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder={isArgentinaShippingCountry ? "Mar del Plata" : "Ciudad"}
                                                type="text"
                                                list={shippingCitySuggestionsEnabled ? "checkout-city-options" : undefined}
                                                value={shippingInfo.city}
                                                onChange={(e) => handleShippingCityInputChange(e.target.value)}
                                                autoComplete="address-level2"
                                                disabled={!shippingInfo.countryCode || (shippingProvinceSuggestionsEnabled && !shippingInfo.provinceId)}
                                            />
                                            {shippingCitySuggestionsEnabled ? (
                                                <datalist id="checkout-city-options">
                                                    {shippingCityOptions.map((city) => (
                                                        <option key={city.value} value={city.label} />
                                                    ))}
                                                </datalist>
                                            ) : null}
                                            <p className={checkoutNoteClass}>
                                                {!shippingInfo.countryCode
                                                    ? "Primero selecciona un pais."
                                                    : isArgentinaShippingCountry
                                                        ? !shippingInfo.provinceId
                                                            ? "Selecciona una provincia para ver las ciudades disponibles."
                                                            : shippingCitiesLoading
                                                                ? "Cargando ciudades de la provincia elegida..."
                                                                : shippingCitySuggestionsEnabled
                                                                    ? "Selecciona una ciudad del listado oficial."
                                                                    : "No pudimos cargar las ciudades. Puedes escribirla manualmente."
                                                        : "Completa tu ciudad manualmente."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Codigo postal
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="7600"
                                                type="text"
                                                value={shippingInfo.postalCode}
                                                onChange={(e) =>
                                                    setShippingInfo((s) => ({
                                                        ...s,
                                                        postalCode: e.target.value,
                                                    }))
                                                }
                                                autoComplete="postal-code"
                                            />
                                        </div>
                                        <div className="col-span-2 mt-2 border-t border-gray-200 pt-5">
                                            <div className="mb-4">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Datos de facturacion
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    Completa estos datos si necesitas factura.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium mb-1">
                                                        Razon social
                                                    </label>
                                                    <input
                                                        className={checkoutFieldClass}
                                                        placeholder="Ej: Mi Empresa SRL"
                                                        type="text"
                                                        value={billingInfo.businessName}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                businessName: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-sm font-medium mb-1">
                                                        Direccion de facturacion
                                                    </label>
                                                    <input
                                                        className={checkoutFieldClass}
                                                        placeholder="Calle y numero"
                                                        type="text"
                                                        value={billingInfo.address}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                address: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Localidad
                                                    </label>
                                                    <input
                                                        className={checkoutFieldClass}
                                                        placeholder="Mar del Plata"
                                                        type="text"
                                                        value={billingInfo.city}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                city: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Tipo de IVA
                                                    </label>
                                                    <select
                                                        className={checkoutFieldClass}
                                                        value={billingInfo.vatType}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                vatType: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {BILLING_VAT_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Tipo de documento
                                                    </label>
                                                    <select
                                                        className={checkoutFieldClass}
                                                        value={billingInfo.documentType}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                documentType: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        {BILLING_DOCUMENT_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">
                                                        Numero
                                                    </label>
                                                    <input
                                                        className={checkoutFieldClass}
                                                        placeholder="20-12345678-9 / 12345678"
                                                        type="text"
                                                        value={billingInfo.documentNumber}
                                                        onChange={(e) =>
                                                            setBillingInfo((prev) => ({
                                                                ...prev,
                                                                documentNumber: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button onClick={() => setOpenStep(2)} className={checkoutPrimaryButtonClass}>
                                            Continuar
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                        </button>
                                    </div>
                                </div>
                            </Accordion>

                            {/* 2 Delivery */}
                            <Accordion
                                step={2}
                                title="Entrega"
                                openStep={openStep}
                                onOpen={() => setOpenStep(2)}
                            >
                                <div className="pt-4 pb-2 space-y-3">
                                    <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
                                        <button
                                            type="button"
                                            onClick={() => handleDeliveryGroupChange("shipping")}
                                            disabled={!shippingDeliveryOptions.length}
                                            className={[
                                                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                                                selectedDeliveryGroup === "shipping"
                                                    ? "bg-primary text-white shadow-[0_2px_8px_-2px_var(--color-primary)]"
                                                    : "text-gray-500 hover:text-gray-900",
                                                !shippingDeliveryOptions.length ? "cursor-not-allowed opacity-40" : "",
                                            ].join(" ")}
                                        >
                                            Envio a domicilio
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeliveryGroupChange("pickup")}
                                            disabled={!pickupDeliveryOptions.length}
                                            className={[
                                                "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                                                selectedDeliveryGroup === "pickup"
                                                    ? "bg-primary text-white shadow-[0_2px_8px_-2px_var(--color-primary)]"
                                                    : "text-gray-500 hover:text-gray-900",
                                                !pickupDeliveryOptions.length ? "cursor-not-allowed opacity-40" : "",
                                            ].join(" ")}
                                        >
                                            Retiro en local
                                        </button>
                                    </div>

                                    {(selectedDeliveryGroup === "pickup" ? pickupDeliveryOptions : shippingDeliveryOptions).map((opt) => {
                                        const checked = deliveryMethod === opt.key;
                                        const isDistanceOption = opt.key === DISTANCE_DELIVERY_KEY;
                                        const optionDescription = isDistanceOption && distanceQuote?.ok
                                            ? distanceQuote.match_type === "polygon"
                                                ? `${distanceQuote.zone?.name || "Zona"} · zona fija detectada por tu ubicacion`
                                                : `${distanceQuote.zone?.name || "Zona"} · ${distanceQuote.distance_km} km desde ${distanceQuote.branch?.name || "la sucursal"}`
                                            : opt.desc;
                                        const optionPrice = isDistanceOption && distanceQuote?.ok
                                            ? Number(distanceQuote.final_price ?? distanceQuote.price ?? 0)
                                            : opt.price;
                                        return (
                                            <label
                                                key={opt.key}
                                                className={[
                                                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border",
                                                    checked
                                                        ? "border-primary/35 bg-primary/[0.08] ring-1 ring-primary/15"
                                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                                                ].join(" ")}
                                            >
                                                <div className={[
                                                    "flex items-center justify-center w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all",
                                                    checked ? "border-primary bg-primary" : "border-gray-300",
                                                ].join(" ")}>
                                                    {checked && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <input
                                                    className="sr-only"
                                                    name="delivery"
                                                    type="radio"
                                                    checked={checked}
                                                    onChange={() => setDeliveryMethod(opt.key)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-semibold ${checked ? "text-gray-900" : "text-gray-800"}`}>{opt.title}</p>
                                                    <p className="mt-0.5 truncate text-xs text-gray-500">{optionDescription}</p>
                                                </div>
                                                <span className={`text-sm font-bold flex-shrink-0 ${checked ? "text-gray-900" : "text-gray-500"}`}>
                                                    {optionPrice == null
                                                        ? "Calcular"
                                                        : optionPrice === 0
                                                        ? "Gratis"
                                                        : formatCurrency(optionPrice, displayCurrency, locale)}
                                                </span>
                                            </label>
                                        );
                                    })}

                                    {deliveryMethod === DISTANCE_DELIVERY_KEY ? (
                                        <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm shadow-slate-200/60">
                                            <div className="space-y-1 mb-4">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Calcula el envio con tu ubicacion
                                                </p>
                                                <p className="text-xs leading-relaxed text-gray-500">
                                                    Comparte tu ubicacion o busca tu direccion. Primero probamos zonas fijas y luego calculamos la distancia hasta la sucursal mas cercana.
                                                </p>
                                            </div>

                                            <div className="mt-4">
                                                <DeliveryLocationSelector
                                                    value={deliveryLocation}
                                                    onChange={(nextLocation) => {
                                                        setDeliveryLocation(nextLocation);
                                                        setDeliveryQuoteError(null);
                                                    }}
                                                    onAddressDetected={(address) => {
                                                        setShippingInfo((prev) => ({
                                                            ...prev,
                                                            fullAddress: prev.fullAddress || address,
                                                        }));
                                                    }}
                                                />
                                            </div>

                                            {distanceQuote?.ok ? (
                                                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                                    <p className="font-bold">
                                                        {distanceQuote.zone?.name}
                                                        {distanceQuote.distance_km != null ? ` · ${distanceQuote.distance_km} km` : ""}
                                                    </p>
                                                    <p className="mt-1">
                                                        {distanceQuote.match_type === "polygon"
                                                            ? "Zona fija detectada"
                                                            : `Sucursal mas cercana: ${distanceQuote.branch?.name || "Sucursal principal"}`}
                                                    </p>
                                                    <div className="mt-2 space-y-1 text-xs opacity-90">
                                                        <p>
                                                            Zona:{" "}
                                                            <span className="font-semibold">
                                                                {Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0) <= 0
                                                                    ? "Gratis"
                                                                    : formatCurrency(
                                                                        Number(distanceQuote.zone_amount ?? distanceQuote.base_price ?? 0),
                                                                        displayCurrency,
                                                                        locale,
                                                                    )}
                                                            </span>
                                                        </p>
                                                        <p>
                                                            Flete:{" "}
                                                            <span className="font-semibold">
                                                                {Number(distanceQuote.freight_amount || 0) <= 0
                                                                    ? "Gratis"
                                                                    : formatCurrency(
                                                                        Number(distanceQuote.freight_amount || 0),
                                                                        displayCurrency,
                                                                        locale,
                                                                    )}
                                                            </span>
                                                            {distanceQuote.match_type !== "polygon" && distanceQuote.pricing_mode === "per_km" ? (
                                                                <span className="opacity-80">
                                                                    {" "}
                                                                    ({formatCurrency(Number(distanceQuote.price_per_km || 0), displayCurrency, locale)}/km)
                                                                </span>
                                                            ) : null}
                                                        </p>
                                                        <p className="text-sm font-bold text-emerald-900">
                                                            Envio final:{" "}
                                                            {Number(distanceQuote.final_price ?? distanceQuote.price ?? 0) <= 0
                                                                ? "Gratis"
                                                                : formatCurrency(
                                                                    Number(distanceQuote.final_price ?? distanceQuote.price ?? 0),
                                                                    displayCurrency,
                                                                    locale,
                                                                )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {deliveryQuoteError ? (
                                                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                                    {deliveryQuoteError}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div className="flex justify-between pt-2">
                                        <button onClick={() => setOpenStep(1)} className={checkoutGhostButtonClass}>
                                            Volver
                                        </button>
                                        <button
                                            onClick={() => setOpenStep(3)}
                                            className={checkoutPrimaryButtonClass}
                                        >
                                            Continuar
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                        </button>
                                    </div>
                                </div>
                            </Accordion>

                            {/* 3 Payment */}
                            <Accordion
                                step={3}
                                title="Pago"
                                openStep={openStep}
                                onOpen={() => setOpenStep(3)}
                            >
                                <div className="pt-4 pb-2 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {paymentOptions.map((opt) => (
                                            <PayOption
                                                key={opt.key}
                                                active={paymentMethod === opt.key}
                                                onClick={() => {
                                                    if (!opt.disabled) {
                                                        setPaymentMethod(opt.key);
                                                    }
                                                }}
                                                icon={opt.icon}
                                                label={opt.label}
                                                description={opt.description}
                                                highlight={opt.highlight}
                                                disabled={opt.disabled}
                                            />
                                        ))}
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                                        {paymentSummary}
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Como quieres recibir la confirmacion
                                            </p>
                                            <p className="mt-0.5 text-xs text-gray-500">
                                                Puedes recibir la confirmacion por WhatsApp o por email.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {ORDER_CHANNEL_OPTIONS.map((option) => {
                                                const disabled = option.key === "whatsapp" && !whatsappNumber;
                                                return (
                                                    <PayOption
                                                        key={option.key}
                                                        active={orderChannel === option.key}
                                                        onClick={() => {
                                                            if (!disabled) {
                                                                setOrderChannel(option.key);
                                                            }
                                                        }}
                                                        icon={
                                                            option.key === "whatsapp" ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4A8.5 8.5 0 1 1 21 11.5Z"></path><path d="M8 12s1.5 3 4 3 4-3 4-3"></path></svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>
                                                            )
                                                        }
                                                        label={option.label}
                                                        description={disabled ? "Configura un numero de WhatsApp en la tienda." : option.description}
                                                        disabled={disabled}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                                            {orderChannel === "whatsapp"
                                                ? "El pedido queda registrado y tambien intentaremos enviarte una copia por email."
                                                : "El pedido queda registrado y la confirmacion principal llega a tu Gmail."}
                                        </div>
                                    </div>

                                    {paymentMethod === "transfer" ? (
                                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                                            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos para la transferencia</p>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {[
                                                    { label: "CBU", value: bankTransfer.cbu || "-" },
                                                    { label: "Alias", value: bankTransfer.alias || "-" },
                                                    { label: "Banco", value: bankTransfer.bank || "-" },
                                                    { label: "Titular", value: bankTransfer.holder || "-" },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                                                        <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
                                                        <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {orderSuccess ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm space-y-2">
                                            <p className="font-bold">Pedido confirmado</p>
                                            <p>Metodo: {orderSuccess.paymentLabel || paymentLabel}</p>
                                            <p>Canal: {orderSuccess.contactChannel === "email" ? "Gmail" : "WhatsApp"}</p>
                                            {orderSuccess.customerEmail ? (
                                                <p>Email: {orderSuccess.customerEmail}</p>
                                            ) : null}
                                            {orderSuccess.emailDelivery ? (
                                                <p className="text-xs font-semibold">
                                                    {orderSuccess.emailDelivery.sent
                                                        ? `Confirmacion enviada a ${orderSuccess.emailDelivery.email || orderSuccess.customerEmail}.`
                                                        : "No pudimos enviar la confirmacion por email en este intento."}
                                                </p>
                                            ) : null}
                                            {orderSuccess.id ? (
                                                <p>ID: {orderSuccess.id}</p>
                                            ) : null}
                                            {orderSuccess.method === "transfer" && (orderSuccess.whatsappReceiptUrl || orderSuccess.whatsappUrl) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(orderSuccess.whatsappReceiptUrl || orderSuccess.whatsappUrl, "_blank", "noopener,noreferrer")}
                                                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white font-bold"
                                                >
                                                    Enviar comprobante por WhatsApp
                                                </button>
                                            ) : orderSuccess.method === "cash_on_pickup" ? (
                                                <p className="text-xs font-semibold text-green-700">
                                                    Pago en local seleccionado. Presentate en la sucursal elegida.
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </Accordion>
                        </div>

                        {validationError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {validationError}
                            </div>
                        ) : null}
                        {checkoutError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {checkoutError}
                            </div>
                        ) : null}
                    </div>

                    {/* Right column */}
                    <div className="w-full lg:w-[380px]">
                        <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl shadow-slate-200/80">
                            {/* Panel header */}
                            <div className="border-b border-gray-200 px-6 pb-4 pt-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resumen</p>
                                <h3 className="mt-0.5 text-lg font-bold text-gray-900">Tu pedido</h3>
                            </div>

                            {/* Items */}
                            <div className="px-6 py-4 space-y-3 max-h-[260px] overflow-y-auto">
                                {summaryItems.map((it) => (
                                    <div key={it.id} className="flex items-center gap-3">
                                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                                            <div
                                                className="w-full h-full bg-center bg-no-repeat bg-cover"
                                                style={{
                                                    backgroundImage: it.image
                                                        ? `url("${it.image}")`
                                                        : "none",
                                                }}
                                                role="img"
                                                aria-label={it.alt || it.name}
                                                title={it.alt || it.name}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900">{it.name}</p>
                                            <p className="mt-0.5 text-xs text-gray-500">×{it.qty}</p>
                                        </div>
                                        <p className="flex-shrink-0 text-sm font-semibold text-gray-900">
                                            {formatCurrency(it.price * it.qty, displayCurrency, locale)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="space-y-2.5 border-t border-gray-200 px-6 py-4">
                                <Line label="Subtotal" value={formatCurrency(subtotal, displayCurrency, locale)} />
                                <Line
                                    label="Envio"
                                    value={
                                        deliveryMethod === DISTANCE_DELIVERY_KEY && !distanceQuote?.ok
                                            ? "A calcular"
                                            : selectedDeliveryOption?.type === "pickup"
                                                ? "Retiro en local"
                                                : formatCurrency(shipping, displayCurrency, locale)
                                    }
                                />
                                <Line label="Impuestos" value={formatCurrency(iva, displayCurrency, locale)} />
                            </div>

                            {/* Total row */}
                            <div className="flex items-center justify-between border-t border-gray-200 bg-primary/[0.06] px-6 py-4">
                                <span className="text-sm text-gray-500">Total a pagar</span>
                                <span className="text-2xl font-black text-gray-900">
                                    {formatCurrency(total, displayCurrency, locale)}
                                </span>
                            </div>

                            {/* Taxes Acknowledgement */}
                            <div className="px-6 pt-4 pb-2">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center pt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={taxesAcknowledged}
                                            onChange={(e) => setTaxesAcknowledged(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-primary transition-all group-hover:border-primary/50 flex flex-shrink-0 items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-[11px] text-gray-600 leading-relaxed font-medium">
                                        Entiendo que los precios mostrados no incluyen impuestos y seran liquidados <span className="font-bold">segun la categoria y/o ubicacion</span>, con factura electronica emitida automaticamente.
                                    </div>
                                </label>
                            </div>

                            {/* CTA */}
                            <div className="px-6 pb-6 pt-4">
                                <button
                                    onClick={handleCompletePurchase}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-[0_8px_32px_-8px_var(--color-primary)] hover:brightness-110 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                                    disabled={creating || !items.length || !!validationError}
                                >
                                    {creating ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            Confirmar compra
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </StoreLayout>
    );
}

/* ---------- UI components ---------- */

function StepProgress({ openStep }) {
    const steps = [
        { step: 1, title: "Datos", description: "Tu informacion" },
        { step: 2, title: "Entrega", description: "Envio o retiro" },
        { step: 3, title: "Pago", description: "Forma de pago" },
    ];

    return (
        <div className="flex items-start">
            {steps.map((item, idx) => {
                const isActive = openStep === item.step;
                const isDone = openStep > item.step;
                const isLast = idx === steps.length - 1;
                return (
                    <React.Fragment key={item.step}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={[
                                "flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all duration-300",
                                isActive
                                    ? "bg-primary text-white ring-4 ring-primary/20"
                                    : isDone
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "border border-gray-200 bg-white text-gray-500",
                            ].join(" ")}>
                                {isDone ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : item.step}
                            </div>
                            <div className="mt-2 text-center px-2">
                                <p className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : isDone ? "text-gray-700" : "text-gray-500"}`}>
                                    {item.title}
                                </p>
                                <p className="mt-0.5 hidden text-[10px] text-gray-400 sm:block">{item.description}</p>
                            </div>
                        </div>
                        {!isLast && (
                            <div className={[
                                "flex-1 h-px mt-[18px] mx-3 transition-all duration-300",
                                isDone ? "bg-primary/40" : "bg-gray-200",
                            ].join(" ")} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function Accordion({ step, title, openStep, onOpen, children }) {
    const isOpen = openStep === step;
    const isDone = openStep > step;

    return (
        <div className={[
            "rounded-2xl border transition-all duration-200",
            isOpen
                ? "border-primary/25 bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_20px_60px_-20px_rgba(148,163,184,0.28)]"
                : "border-gray-200 bg-white",
        ].join(" ")}>
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5"
            >
                <div className="flex items-center gap-3">
                    <div className={[
                        "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        isOpen
                            ? "bg-primary text-white"
                            : isDone
                                ? "bg-primary/15 text-primary"
                                : "bg-gray-100 text-gray-500",
                    ].join(" ")}>
                        {isDone ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : step}
                    </div>
                    <div className="text-left">
                        <p className={`text-sm font-semibold ${isOpen ? "text-gray-900" : "text-gray-700"}`}>{title}</p>
                        {isDone && !isOpen && (
                            <p className="mt-0.5 text-[11px] text-gray-500">Completado</p>
                        )}
                    </div>
                </div>
                <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-gray-200 px-6 pb-6">
                    {children}
                </div>
            )}
        </div>
    );
}

function PayOption({ active, onClick, icon, label, description, highlight, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "relative flex items-start gap-3 p-4 rounded-xl transition-all duration-200 border text-left w-full",
                active
                    ? "border-primary/40 bg-primary/[0.09] ring-1 ring-primary/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
        >
            {active && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            )}
            <div className={[
                "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 transition-colors",
                active || highlight ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-500",
            ].join(" ")}>
                {icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-800"}`}>{label}</p>
                {description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
                )}
            </div>
        </button>
    );
}

function Line({ label, value }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
    );
}
