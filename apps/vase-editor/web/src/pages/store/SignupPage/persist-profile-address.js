// Parte de SignupPage: persistProfileAddress.
import { getCountryLabelByCode } from '../../../utils/locations';

/** Arma persistProfileAddress con lo que necesita del componente. */
export function makePersistProfileAddress({ countryOptions, formData }) {
    return (email) => {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail) return;
    
        const countryLabel = getCountryLabelByCode(formData.country, countryOptions);
        const addressLine = formData.address.trim();
        const city = formData.city.trim();
        const postalCode = formData.postalCode.trim();
        const province = formData.province.trim();
    
        const payload = {
            fullName: formData.name.trim(),
            line1: addressLine,
            fullAddress: addressLine,
            address: addressLine,
            city,
            locality: city,
            postal: postalCode,
            postalCode,
            province,
            provinceId: formData.provinceId,
            region: province,
            country: countryLabel,
            countryCode: formData.country,
            cityId: formData.cityId,
            phone: formData.phone.trim(),
            phoneCountry: formData.country || 'AR',
            phoneNumber: formData.phone.trim(),
            company: formData.company.trim(),
            cuit: formData.cuit.trim(),
        };
    
        try {
            localStorage.setItem(`teflon_profile_address_${normalizedEmail}`, JSON.stringify(payload));
        } catch (err) {
            console.warn('No se pudo guardar la direccion inicial del perfil', err);
        }
    };
}
