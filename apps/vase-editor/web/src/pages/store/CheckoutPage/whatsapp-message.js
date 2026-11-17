// Checkout: arma el mensaje de WhatsApp con el pedido.
import { formatCurrency } from '../../../utils/format';
import { getBillingDocumentLabel } from '../../../utils/billing';
import { getBillingVatLabel } from '../../../utils/billing';

/** Arma buildWhatsappMessage con lo que necesita del componente. */
export function makeBuildWhatsappMessage({ customerInfo, deliveryMethod, displayCurrency, getProfileAddress, hasOrderBillingInfo, locale, normalizedBilling, paymentMethod, selectedDeliveryOption, shippingInfo, summaryItems, total, user }) {
    return (note = "") => {
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
}
