// Checkout: guarda en la cuenta del cliente los datos que cargó, para la próxima compra.
import { getCountryLabelByCode } from '../../../utils/locations';
import { normalizeBillingInfo } from '../../../utils/billing';

/** Arma persistProfileCheckoutData con lo que necesita del componente. */
export function makePersistProfileCheckoutData({ user }) {
    return (customerPayload) => {
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
}
