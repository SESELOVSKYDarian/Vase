// Checkout: la dirección guardada en la cuenta del cliente.
import { getCountryLabelByCode } from '../../../utils/locations';
import { normalizeBillingInfo } from '../../../utils/billing';

/** Arma getProfileAddress con lo que necesita del componente. */
export function makeGetProfileAddress({ user }) {
    return () => {
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
}
