// Parte de CheckoutPage.jsx: SUPPORTED_PAYMENT_METHODS, ORDER_CHANNEL_OPTIONS, EMAIL_PATTERN, GENERIC_FLAT_DELIVERY_KEY, checkoutFieldClass, checkoutNoteClass y más.
import { formatCurrency } from "../../../utils/format";

export const SUPPORTED_PAYMENT_METHODS = ["transfer", "cash_on_pickup"];
export const ORDER_CHANNEL_OPTIONS = [
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
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
export const GENERIC_FLAT_DELIVERY_KEY = "zone:arg-general";
export const checkoutFieldClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
export const checkoutNoteClass = "mt-1.5 text-xs leading-relaxed text-gray-500";
export const checkoutCardClass =
    "rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl shadow-slate-200/70";
export const checkoutSoftCardClass = "rounded-xl border border-gray-200 bg-gray-50 p-4";
export const checkoutGhostButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900";
export const checkoutPrimaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_var(--color-primary)] transition-all hover:brightness-110 hover:shadow-[0_8px_24px_-4px_var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed";

export const normalizePaymentMethod = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return null;
    if (["cash", "pickup", "local", "store"].includes(raw)) return "cash_on_pickup";
    return SUPPORTED_PAYMENT_METHODS.includes(raw) ? raw : null;
};

export const uniquePaymentMethods = (list = []) => {
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

export const normalizeOrderChannel = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return null;
    if (["gmail", "mail", "correo"].includes(raw)) return "email";
    if (raw === "wa") return "whatsapp";
    return ["whatsapp", "email"].includes(raw) ? raw : null;
};

export const mapDistanceQuoteError = (code) => {
    switch (String(code || "")) {
        case "shipping_location_required":
            return "Activa tu ubicacion para calcular el envio.";
        case "delivery_out_of_range":
            return "No llegamos con envio a esa direccion. Podes retirar tu pedido en una de nuestras sucursales.";
        case "shipping_origin_not_configured":
            return "La tienda todavia no configuro coordenadas para la sucursal de origen.";
        case "distance_shipping_not_configured":
        case "location_shipping_not_configured":
            return "La tienda no tiene zonas geograficas ni radios por distancia configurados.";
        default:
            return "No se pudo calcular el envio por ubicacion.";
    }
};

export const getDistanceQuoteDescription = (quote) => {
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
