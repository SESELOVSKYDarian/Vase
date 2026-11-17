// Parte de ProfilePage: saveAddress.
import { normalizeProfileAddress } from './profile-helpers.jsx';

/** Arma saveAddress con lo que necesita del componente. */
export function makeSaveAddress({ addressDraft, addressStorageKeys, defaultAddress, setAddress, setIsEditingAddress, updateProfile, user }) {
    return async () => {
        if (!user) return;
        const next = normalizeProfileAddress(addressDraft, defaultAddress);
        setAddress(next);
        try {
            addressStorageKeys.forEach((key) => {
                localStorage.setItem(key, JSON.stringify(next));
            });
        } catch (err) {
            console.warn('No se pudo guardar la direccion en cache', err);
        }
        try {
            const billingInfo = {
                document_type: next.document_type,
                document_number: next.document_number,
                vat_condition: next.vat_condition,
                business_name: next.business_name,
                cuit: next.cuit,
                company: next.company,
            };
            await updateProfile({
                name: next.fullName,
                phone: next.phoneNumber || next.phone,
                address: next.line1,
                country_code: next.countryCode,
                country_label: next.country,
                province: next.region,
                city: next.city,
                postal_code: next.postal,
                billing_info: billingInfo,
            });
        } catch (err) {
            console.error('No se pudo guardar el perfil en el servidor', err);
            window.alert('No se pudo guardar el perfil. Intenta nuevamente.');
            return;
        }
        setIsEditingAddress(false);
    };
}
