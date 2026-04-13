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
const checkoutFieldClass =
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20";
const checkoutNoteClass = "text-xs text-zinc-400";
const checkoutCardClass =
    "rounded-[28px] border border-white/10 bg-[#0d131c]/95 p-5 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] backdrop-blur";
const checkoutSoftCardClass = "rounded-2xl border border-white/10 bg-white/5 p-4";
const checkoutGhostButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-primary/50 hover:bg-white/10";
const checkoutPrimaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_45px_-24px_var(--color-primary)] transition hover:bg-primary/90 disabled:opacity-60";

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
        city: "",
        postalCode: "",
    });
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [deliveryQuoteError, setDeliveryQuoteError] = useState(null);
    const [billingInfo, setBillingInfo] = useState(EMPTY_BILLING_INFO);
    const [orderChannel, setOrderChannel] = useState("whatsapp");
    const shippingAutofillRef = useRef(false);
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
        shippingZones
            .filter((zone) => zone.type !== "distance")
            .forEach((zone) => {
            options.push({
                key: `zone:${zone.id}`,
                type: "shipping",
                title: `Envio: ${zone.name}`,
                desc: zone.description || "Entrega a domicilio",
                price: Number(zone.price || 0),
            });
        });
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
                key: "zone:arg-general",
                type: "shipping",
                title: "Envio: Argentina",
                desc: "Cobertura nacional",
                price: Number(commerce.shipping_flat || 0),
            });
        }
        return options;
    }, [shippingZones, pickupBranches, commerce]);

    const [deliveryMethod, setDeliveryMethod] = useState(() => {
        const fallback = String(commerce.default_delivery || "zone:arg-general").trim();
        return fallback || "zone:arg-general";
    });

    useEffect(() => {
        const selected = deliveryOptions.find((option) => option.key === deliveryMethod);
        if (selected) return;
        const preferred = String(checkoutSettings?.default_delivery || "").trim();
        const preferredOption = deliveryOptions.find((option) => option.key === preferred);
        setDeliveryMethod(preferredOption?.key || deliveryOptions[0]?.key || "zone:arg-general");
    }, [deliveryOptions, deliveryMethod, checkoutSettings]);

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
                label: "Pago en local",
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
            fullName: prev.fullName || user.email.split("@")[0] || "",
        }));
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
            const prefill = {
                fullAddress: parsed.line1 || parsed.fullAddress || "",
                city: parsed.city || "",
                postalCode: parsed.postal || parsed.postalCode || "",
            };
            const prefillCustomer = {
                fullName: parsed.fullName || user?.email?.split("@")[0] || "",
                phone: parsed.phone || parsed.phoneNumber || "",
                email: user?.email || "",
            };
            const prefillBilling = normalizeBillingInfo(parsed);
            setShippingInfo((prev) => ({
                fullAddress: prev.fullAddress || prefill.fullAddress,
                city: prev.city || prefill.city,
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
                    price: Number(distanceQuote.price || 0),
                    branch_id: distanceQuote.branch?.id || null,
                    shipping_zone_id: distanceQuote.zone.id,
                    distance_km: distanceQuote.distance_km,
                    pricing_mode: distanceQuote.pricing_mode || "fixed",
                    price_per_km: Number(distanceQuote.price_per_km || 0),
                    base_price: Number(distanceQuote.base_price || 0),
                    dynamic: true,
                };
            }

            return {
                key: DISTANCE_DELIVERY_KEY,
                type: "shipping",
                title: "Envio segun tu ubicacion",
                desc: "Comparte tu ubicacion o marcala en el mapa para calcular el costo.",
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
            return "Transferencia: se genera el pedido en estado pendiente de pago.";
        }
        if (paymentMethod === "cash_on_pickup") {
            return "Pago en local: confirmas online y abonas cuando retiras.";
        }
        return "El pedido se registra y te mostramos los pasos siguientes.";
    }, [paymentMethod]);

    const paymentLabel = useMemo(
        () => paymentOptions.find((opt) => opt.key === paymentMethod)?.label || "",
        [paymentOptions, paymentMethod]
    );
    const deliveryHeadline = selectedDeliveryOption?.title || "Entrega a definir";
    const deliverySupportingText = deliveryMethod === DISTANCE_DELIVERY_KEY
        ? distanceQuote?.ok
            ? getDistanceQuoteDescription(distanceQuote)
            : "Comparte tu ubicacion para cotizar"
        : selectedDeliveryOption?.desc || "Configuracion de entrega";
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
            return {
                fullName: parsed.fullName || "",
                phone: parsed.phone || parsed.phoneNumber || "",
                line1: parsed.line1 || "",
                city: parsed.city || "",
                postal: parsed.postal || "",
                billing: normalizeBillingInfo(parsed),
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
            shippingInfo.city || profile.city,
            shippingInfo.postalCode || profile.postal,
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
                city: customerPayload.city || previous.city || "",
                postal: customerPayload.postalCode || previous.postal || "",
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
            if (!shippingInfo.fullAddress.trim() || !shippingInfo.city.trim()) {
                setCheckoutError("Completa direccion y ciudad para entrega a domicilio.");
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
            <main className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-6 md:py-10">
                {/* Breadcrumbs */}
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                    <button
                        className="transition-colors hover:text-primary"
                        onClick={() => (window.location.hash = '#')}
                        type="button"
                    >
                        Inicio
                    </button>
                    <span>
                        /
                    </span>
                    <button
                        className="transition-colors hover:text-primary"
                        onClick={() => (window.location.hash = '#cart')}
                        type="button"
                    >
                        Carrito
                    </button>
                    <span>
                        /
                    </span>
                    <span className="text-zinc-900">
                        Finalizar compra
                    </span>
                </div>

                {/* Heading */}
                <div className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[#0d131c] px-5 py-6 text-white shadow-[0_28px_70px_-45px_rgba(15,23,42,0.6)] md:px-8 md:py-8">
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-0"
                        aria-hidden="true"
                    />
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-300">
                                Checkout activo
                            </div>
                            <h1 className="text-4xl font-black leading-tight tracking-[-0.04em] text-white md:text-5xl">
                                Finalizar compra
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                                Confirma tus datos, define la entrega y cierra el pedido en un flujo mas limpio y preciso.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Entrega</p>
                                <p className="mt-1 text-lg font-bold text-white">{deliveryHeadline}</p>
                                <p className="mt-1 text-xs text-zinc-400">{deliverySupportingText}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Pago</p>
                                <p className="mt-1 text-lg font-bold text-white">{paymentLabel || 'A definir'}</p>
                                <p className="mt-1 text-xs text-zinc-400">{paymentSummary}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Total</p>
                                <p className="mt-1 text-lg font-bold text-white">{formatCurrency(total, displayCurrency, locale)}</p>
                                <p className="mt-1 text-xs text-zinc-400">{summaryItems.length} producto{summaryItems.length === 1 ? '' : 's'} en la orden</p>
                            </div>
                        </div>
                    </div>
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
                                title="Informacion de envio"
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
                                                Gmail o email
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
                                            <p className="mt-1 text-xs text-[#8a7560] dark:text-[#a59280]">
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
                                                Ciudad
                                            </label>
                                            <input
                                                className={checkoutFieldClass}
                                                placeholder="Mar del Plata"
                                                type="text"
                                                value={shippingInfo.city}
                                                onChange={(e) =>
                                                    setShippingInfo((s) => ({
                                                        ...s,
                                                        city: e.target.value,
                                                    }))
                                                }
                                            />
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
                                            />
                                        </div>
                                        <div className="col-span-2 mt-2 border-t border-white/10 pt-4">
                                            <div className="mb-3">
                                                <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                    Datos de facturacion
                                                </p>
                                                <p className="text-xs text-[#8a7560] dark:text-[#a59280]">
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
                                title="Metodo de entrega"
                                openStep={openStep}
                                onOpen={() => setOpenStep(2)}
                            >
                                <div className="pt-4 pb-2 space-y-3">
                                    {deliveryOptions.map((opt) => {
                                        const checked = deliveryMethod === opt.key;
                                        const isDistanceOption = opt.key === DISTANCE_DELIVERY_KEY;
                                        const optionDescription = isDistanceOption && distanceQuote?.ok
                                            ? distanceQuote.match_type === "polygon"
                                                ? `${distanceQuote.zone?.name || "Zona"} · zona fija detectada por tu ubicacion`
                                                : `${distanceQuote.zone?.name || "Zona"} · ${distanceQuote.distance_km} km desde ${distanceQuote.branch?.name || "la sucursal"}`
                                            : opt.desc;
                                        const optionPrice = isDistanceOption && distanceQuote?.ok
                                            ? Number(distanceQuote.price || 0)
                                            : opt.price;
                                        return (
                                            <label
                                                key={opt.key}
                                                className={[
                                                    "flex items-center p-4 rounded-lg cursor-pointer transition-colors border",
                                                    checked
                                                        ? "border-primary/40 bg-primary/10"
                                                        : "border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/10",
                                                ].join(" ")}
                                            >
                                                <input
                                                    className="text-primary focus:ring-primary h-4 w-4"
                                                    name="delivery"
                                                    type="radio"
                                                    checked={checked}
                                                    onChange={() => setDeliveryMethod(opt.key)}
                                                />
                                                <div className="ml-4">
                                                    <p className="font-bold">{opt.title}</p>
                                                    <p className="text-sm text-[#8a7560] dark:text-[#a59280]">
                                                        {optionDescription}
                                                    </p>
                                                </div>
                                                <span className="ml-auto font-bold">
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
                                        <div className="rounded-[28px] border border-white/10 bg-[#0d131c]/95 p-4 text-white">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white">
                                                    Cotizacion por ubicacion
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    Marca tu ubicacion en el mapa. Primero probamos zonas fijas como barrios o sectores. Si no coincide con ninguna, buscamos la sucursal mas cercana y calculamos el flete segun la distancia.
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
                                                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                                                    <p className="font-bold">
                                                        {distanceQuote.zone?.name}
                                                        {distanceQuote.distance_km != null ? ` · ${distanceQuote.distance_km} km` : ""}
                                                    </p>
                                                    <p className="mt-1">
                                                        {distanceQuote.match_type === "polygon"
                                                            ? "Zona fija detectada"
                                                            : `Sucursal mas cercana: ${distanceQuote.branch?.name || "Sucursal principal"}`}
                                                        {" · "}
                                                        Costo {distanceQuote.price === 0 ? "Gratis" : formatCurrency(distanceQuote.price, displayCurrency, locale)}
                                                    </p>
                                                    {distanceQuote.match_type !== "polygon" && distanceQuote.pricing_mode === "per_km" ? (
                                                        <p className="mt-1 text-xs opacity-80">
                                                            {formatCurrency(Number(distanceQuote.price_per_km || 0), displayCurrency, locale)}/km
                                                            {Number(distanceQuote.base_price || 0) > 0
                                                                ? ` + base ${formatCurrency(Number(distanceQuote.base_price || 0), displayCurrency, locale)}`
                                                                : ""}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            {deliveryQuoteError ? (
                                                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
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
                                title="Metodo de pago"
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

                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                                        {paymentSummary}
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-bold text-[#181411] dark:text-white">
                                                Metodo de pedido
                                            </p>
                                            <p className="text-xs text-[#8a7560] dark:text-[#a59280]">
                                                Elige si quieres continuar por WhatsApp o recibir la confirmacion en Gmail.
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
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                                            {orderChannel === "whatsapp"
                                                ? "El pedido queda registrado y tambien intentaremos enviarte una copia por email."
                                                : "El pedido queda registrado y la confirmacion principal llega a tu Gmail."}
                                        </div>
                                    </div>

                                    {paymentMethod === "transfer" ? (
                                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-2 text-zinc-300">
                                            <p className="font-bold text-white">Datos bancarios</p>
                                            <p>
                                                CBU: <span className="font-semibold text-white">{bankTransfer.cbu || "-"}</span>
                                            </p>
                                            <p>
                                                Alias: <span className="font-semibold text-white">{bankTransfer.alias || "-"}</span>
                                            </p>
                                            <p>
                                                Banco: <span className="font-semibold text-white">{bankTransfer.bank || "-"}</span>
                                            </p>
                                            <p>
                                                Titular: <span className="font-semibold text-white">{bankTransfer.holder || "-"}</span>
                                            </p>
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
                            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                {validationError}
                            </div>
                        ) : null}
                        {checkoutError ? (
                            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                                {checkoutError}
                            </div>
                        ) : null}
                    </div>

                    {/* Right column */}
                    <div className="w-full lg:w-[400px]">
                        <div className="sticky top-24 rounded-[28px] border border-white/10 bg-[#0d131c]/95 p-6 text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)] backdrop-blur">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">Resumen vivo</p>
                            <h3 className="mt-1 text-2xl font-bold">Resumen del pedido</h3>

                            {/* Items */}
                            <div className="space-y-4 mb-6">
                                {summaryItems.map((it) => (
                                    <div key={it.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                                        <div className="size-16 rounded-2xl border border-white/10 bg-black/20 overflow-hidden flex-shrink-0">
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
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold line-clamp-1 text-white">{it.name}</p>
                                            <p className="text-xs text-zinc-400">
                                                Cant.: {it.qty}
                                            </p>
                                            <p className="text-sm font-bold mt-2 text-white">
                                                {formatCurrency(it.price * it.qty, displayCurrency, locale)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <Line label="Subtotal" value={formatCurrency(subtotal, displayCurrency, locale)} />
                                <Line
                                    label="Envio"
                                    value={
                                        deliveryMethod === DISTANCE_DELIVERY_KEY && !distanceQuote?.ok
                                            ? "A calcular"
                                            : formatCurrency(shipping, displayCurrency, locale)
                                    }
                                />
                                <Line label="Impuestos" value={formatCurrency(iva, displayCurrency, locale)} />
                            </div>

                            <div className="mt-6 rounded-[24px] border border-primary/20 bg-primary/10 p-4 flex justify-between items-center">
                                <span className="font-medium text-zinc-200">Total</span>
                                <span className="text-3xl font-black text-white">
                                    {formatCurrency(total, displayCurrency, locale)}
                                </span>
                            </div>

                            <button
                                onClick={handleCompletePurchase}
                                className="w-full mt-6 py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-[0_18px_48px_-28px_var(--color-primary)] hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                                disabled={creating || !items.length || !!validationError}
                            >
                                <span>{creating ? "Procesando..." : "Confirmar compra"}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </button>

                            <p className="text-[10px] text-center mt-4 text-zinc-500 uppercase tracking-[0.22em]">
                                Pedido seguro y validado por stock
                            </p>
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
        { step: 1, title: "Identidad", description: "Contacto y facturacion" },
        { step: 2, title: "Entrega", description: "Ubicacion y modalidad" },
        { step: 3, title: "Pago", description: "Cobro y confirmacion" },
    ];

    return (
        <div className="grid gap-3 md:grid-cols-3">
            {steps.map((item) => {
                const isActive = openStep === item.step;
                const isUnlocked = openStep >= item.step;
                return (
                    <div
                        key={item.step}
                        className={[
                            "rounded-2xl border p-4 transition-all",
                            isActive ? "border-primary/40 bg-primary/10" : "border-white/10 bg-[#0d131c]/95",
                            !isUnlocked ? "opacity-70" : "",
                        ].join(" ")}
                    >
                        <div className="flex items-start gap-4">
                            <span
                                className={[
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                                    isActive || isUnlocked
                                        ? "border-primary/30 bg-primary text-white"
                                        : "border-white/10 bg-white/5 text-zinc-400",
                                ].join(" ")}
                            >
                                {item.step}
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Accordion({ step, title, openStep, onOpen, children }) {
    const isOpen = openStep === step;

    return (
        <div
            className={[
                "flex flex-col rounded-[28px] border px-6 py-5 group transition-all",
                isOpen
                    ? "border-primary/30 bg-[#0d131c] text-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.8)]"
                    : "border-white/10 bg-[#0d131c]/95 text-white shadow-[0_18px_48px_-38px_rgba(15,23,42,0.55)]",
            ].join(" ")}
        >
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center justify-between gap-6 py-2"
            >
                <div className="flex items-center gap-3">
                    <span className={[
                        "flex items-center justify-center size-8 rounded-2xl border text-xs font-bold",
                        isOpen
                            ? "border-primary/30 bg-primary text-white"
                            : "border-white/10 bg-white/5 text-zinc-300",
                    ].join(" ")}>
                        {step}
                    </span>
                    <p className="text-white text-lg font-bold">{title}</p>
                </div>

                <div className={`text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </button>

            {isOpen ? children : null}
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
                "flex flex-col items-start justify-between gap-3 p-4 rounded-2xl transition-all border text-left",
                active
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/10",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
        >
            <div
                className={[
                    active || highlight ? "text-primary" : "text-zinc-300",
                ].join(" ")}
            >
                {icon}
            </div>
            <p className="text-sm font-semibold text-white">{label}</p>
            {description ? (
                <p className="text-xs text-zinc-400 mt-1">{description}</p>
            ) : null}
        </button>
    );
}

function Line({ label, value }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className="font-semibold text-white">{value}</span>
        </div>
    );
}




