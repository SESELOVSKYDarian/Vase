// Parte de CheckoutPage.jsx: CheckoutPage.
// partes: ./CheckoutSummary.jsx, ./CheckoutPaymentStep.jsx, ./CheckoutDeliveryStep.jsx, ./CheckoutShippingStep.jsx, ./complete-purchase.js, ./persist-profile-checkout.js, ./whatsapp-message.js, ./profile-address.js, ./delivery-group-change.js, ./CheckoutLayout.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import StoreLayout from "../../../components/layout/StoreLayout";
import DeliveryLocationSelector from "../../../components/store/DeliveryLocationSelector";
import { formatCurrency } from "../../../utils/format";
import { useStore } from "../../../context/StoreContext";
import { useTenant } from "../../../context/TenantContext";
import { useAuth } from "../../../context/AuthContext";
import { getApiBase, getTenantHeaders } from "../../../utils/api";
import { navigate } from "../../../utils/navigation";
import { BILLING_DOCUMENT_OPTIONS, BILLING_VAT_OPTIONS, EMPTY_BILLING_INFO, getBillingDocumentLabel, getBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from "../../../utils/billing";
import { DISTANCE_DELIVERY_KEY, normalizeBranches, normalizeShippingZones, resolveDistanceQuote } from "../../../utils/shipping";
import { getCountryLabelByCode } from "../../../utils/locations";
import { useAddressLocationFields } from "../../../hooks/useAddressLocationFields";
import { EMAIL_PATTERN, GENERIC_FLAT_DELIVERY_KEY, ORDER_CHANNEL_OPTIONS, checkoutFieldClass, checkoutGhostButtonClass, checkoutNoteClass, checkoutPrimaryButtonClass, getDistanceQuoteDescription, mapDistanceQuoteError, normalizeOrderChannel, uniquePaymentMethods } from "./map-distance-quote-error.js";
import { Accordion, Line, PayOption, StepProgress } from "./Accordion.jsx";

import CheckoutSummary from './CheckoutSummary.jsx';
import CheckoutPaymentStep from './CheckoutPaymentStep.jsx';
import CheckoutDeliveryStep from './CheckoutDeliveryStep.jsx';
import CheckoutShippingStep from './CheckoutShippingStep.jsx';
import { makeHandleCompletePurchase } from './complete-purchase.js';
import { makePersistProfileCheckoutData } from './persist-profile-checkout.js';
import { makeBuildWhatsappMessage } from './whatsapp-message.js';
import { makeGetProfileAddress } from './profile-address.js';
import { makeHandleDeliveryGroupChange } from './delivery-group-change.js';
import CheckoutLayout from './CheckoutLayout.jsx';
import { isWhatsappOnlyStore } from '../../../utils/orderChannels';
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

    const handleDeliveryGroupChange = makeHandleDeliveryGroupChange({ pickupDeliveryOptions, setDeliveryMethod, shippingDeliveryOptions });

    const distanceQuote = useMemo(() => {
        if (deliveryMethod !== DISTANCE_DELIVERY_KEY || !deliveryLocation) return null;
        return resolveDistanceQuote({
            shippingZones,
            branches: pickupBranches,
            location: deliveryLocation,
        });
    }, [deliveryLocation, deliveryMethod, pickupBranches, shippingZones]);

    const bankTransfer = checkoutSettings?.bank_transfer || commerce.bank_transfer || {};
    // Lo que la tienda eligió mostrar grande (alias o CBU), solo si está cargado.
    const highlightedTransfer = ['alias', 'cbu'].includes(bankTransfer.highlight) && String(bankTransfer[bankTransfer.highlight] || '').trim()
        ? { label: bankTransfer.highlight === 'cbu' ? 'CBU' : 'Alias', value: String(bankTransfer[bankTransfer.highlight]).trim() }
        : null;
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

    // Canales que habilitó el comercio (Ajustes › Pagos). Sin configurar: WhatsApp y correo.
    const allowedOrderChannels = useMemo(() => {
        const source = checkoutSettings?.order_channels || commerce.order_channels || [];
        const list = (Array.isArray(source) ? source : []).map(normalizeOrderChannel).filter(Boolean);
        return list.length ? [...new Set(list)] : ["whatsapp", "email"];
    }, [checkoutSettings, commerce]);
    const orderChannelOptions = ORDER_CHANNEL_OPTIONS.filter((option) => allowedOrderChannels.includes(option.key));

    useEffect(() => {
        if (!whatsappNumber && orderChannel === "whatsapp" && allowedOrderChannels.includes("email")) {
            setOrderChannel("email");
        } else if (!allowedOrderChannels.includes(orderChannel)) {
            setOrderChannel(allowedOrderChannels[0]);
        }
    }, [orderChannel, whatsappNumber, allowedOrderChannels]);

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
                    order_channels: Array.isArray(data.order_channels) ? data.order_channels : undefined,
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

    // Tienda "Solo por WhatsApp": no hace falta cuenta y el pago se coordina en el chat.
    const whatsappOnly = isWhatsappOnlyStore({ ...commerce, order_channels: checkoutSettings?.order_channels || commerce.order_channels, whatsapp_number: whatsappNumber });

    const getProfileAddress = makeGetProfileAddress({ user });

    const buildWhatsappMessage = makeBuildWhatsappMessage({ customerInfo, deliveryMethod, displayCurrency, getProfileAddress, hasOrderBillingInfo, locale, normalizedBilling, paymentMethod, selectedDeliveryOption, shippingInfo, summaryItems, total, user });

    const buildWhatsappUrl = (note = "") => {
        const message = buildWhatsappMessage(note);
        const number = whatsappNumber;
        if (!number) return null;
        return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    };

    const persistProfileCheckoutData = makePersistProfileCheckoutData({ user });

    const handleCompletePurchase = makeHandleCompletePurchase({ bankTransfer, buildWhatsappUrl, clearCart, customerInfo, deliveryLocation, deliveryMethod, displayCurrency, distanceQuote, goToAuthForCheckout, hasOrderBillingInfo, isShippingDelivery, items, locale, normalizedBilling, orderChannel, paymentLabel, paymentMethod, persistProfileCheckoutData, selectedDeliveryOption, setCheckoutError, setCreating, setOpenStep, setOrderSuccess, shippingCitySuggestionsEnabled, shippingInfo, shippingProvinceSuggestionsEnabled, taxesAcknowledged, total, user, whatsappNumber, whatsappOnly });
    if (authLoading) {
        return (
            <StoreLayout>
                <main className="store-checkout max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
                    <h1 className="text-3xl font-black mb-4">Cargando checkout</h1>
                    <p className="text-[#8a7560] mb-8">
                        Estamos verificando tu sesion.
                    </p>
                </main>
            </StoreLayout>
        );
    }

    if (!user && !whatsappOnly) {
        return (
            <StoreLayout>
                <main className="store-checkout max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
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
                <main className="store-checkout max-w-[960px] mx-auto w-full px-4 md:px-10 py-16 text-center">
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
        <CheckoutLayout bankTransfer={bankTransfer} billingInfo={billingInfo} checkoutError={checkoutError} creating={creating} customerInfo={customerInfo} deliveryLocation={deliveryLocation} deliveryMethod={deliveryMethod} deliveryQuoteError={deliveryQuoteError} displayCurrency={displayCurrency} distanceQuote={distanceQuote} handleCompletePurchase={handleCompletePurchase} handleDeliveryGroupChange={handleDeliveryGroupChange} handleShippingCityInputChange={handleShippingCityInputChange} handleShippingCountryInputChange={handleShippingCountryInputChange} handleShippingProvinceInputChange={handleShippingProvinceInputChange} highlightedTransfer={highlightedTransfer} isArgentinaShippingCountry={isArgentinaShippingCountry} items={items} iva={iva} locale={locale} openStep={openStep} orderChannel={orderChannel} orderChannelOptions={orderChannelOptions} orderSuccess={orderSuccess} paymentLabel={paymentLabel} paymentMethod={paymentMethod} paymentOptions={paymentOptions} paymentSummary={paymentSummary} pickupDeliveryOptions={pickupDeliveryOptions} selectedDeliveryGroup={selectedDeliveryGroup} selectedDeliveryOption={selectedDeliveryOption} setBillingInfo={setBillingInfo} setCustomerInfo={setCustomerInfo} setDeliveryLocation={setDeliveryLocation} setDeliveryMethod={setDeliveryMethod} setDeliveryQuoteError={setDeliveryQuoteError} setOpenStep={setOpenStep} setOrderChannel={setOrderChannel} setPaymentMethod={setPaymentMethod} setShippingInfo={setShippingInfo} setTaxesAcknowledged={setTaxesAcknowledged} shipping={shipping} shippingCitiesLoading={shippingCitiesLoading} shippingCityOptions={shippingCityOptions} shippingCitySuggestionsEnabled={shippingCitySuggestionsEnabled} shippingCountriesLoading={shippingCountriesLoading} shippingCountryInput={shippingCountryInput} shippingCountryOptions={shippingCountryOptions} shippingDeliveryOptions={shippingDeliveryOptions} shippingInfo={shippingInfo} shippingProvinceLoading={shippingProvinceLoading} shippingProvinceOptions={shippingProvinceOptions} shippingProvinceSuggestionsEnabled={shippingProvinceSuggestionsEnabled} subtotal={subtotal} summaryItems={summaryItems} taxesAcknowledged={taxesAcknowledged} total={total} validationError={validationError} whatsappNumber={whatsappNumber} whatsappOnly={whatsappOnly} />
    );
}

/* ---------- UI components ---------- */
