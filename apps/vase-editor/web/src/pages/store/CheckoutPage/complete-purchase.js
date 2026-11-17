// Checkout: lo que pasa al tocar Finalizar compra (valida, crea el pedido y redirige).
import { DISTANCE_DELIVERY_KEY } from '../../../utils/shipping';
import { EMAIL_PATTERN } from './map-distance-quote-error.js';
import { getApiBase } from '../../../utils/api';
import { getTenantHeaders } from '../../../utils/api';
import { mapDistanceQuoteError } from './map-distance-quote-error.js';
import { navigate } from '../../../utils/navigation';
import { normalizeOrderChannel } from './map-distance-quote-error.js';

/** Arma handleCompletePurchase con lo que necesita del componente. */
export function makeHandleCompletePurchase({ bankTransfer, buildWhatsappUrl, clearCart, customerInfo, deliveryLocation, deliveryMethod, displayCurrency, distanceQuote, goToAuthForCheckout, hasOrderBillingInfo, isShippingDelivery, items, locale, normalizedBilling, orderChannel, paymentLabel, paymentMethod, persistProfileCheckoutData, selectedDeliveryOption, setCheckoutError, setCreating, setOpenStep, setOrderSuccess, shippingCitySuggestionsEnabled, shippingInfo, shippingProvinceSuggestionsEnabled, taxesAcknowledged, total, user, whatsappNumber, whatsappOnly }) {
    return async () => {
        if (!items.length) return;
        // En una tienda "Solo por WhatsApp" se puede pedir sin cuenta.
        if (!user && !whatsappOnly) {
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
        // Por WhatsApp el correo es opcional; si lo escribe, tiene que ser válido.
        if ((!whatsappOnly && !normalizedEmail) || (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail))) {
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
            // Solo por WhatsApp: se abre el chat con el pedido ya escrito.
            if (whatsappOnly && whatsappUrl) window.location.assign(whatsappUrl);
        } catch (err) {
            console.error("Error al crear la orden", err);
            setCheckoutError(err?.message || "No se pudo iniciar el pago. Proba nuevamente.");
        } finally {
            setCreating(false);
        }
    };
}
