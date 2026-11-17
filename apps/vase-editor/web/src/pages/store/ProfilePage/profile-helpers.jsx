// Íconos y ayudantes de ProfilePage.jsx: User, Package, MapPin, Heart, Shield, LogOut y más.
import { getCountryLabelByCode } from '../../../utils/locations';
import { normalizeBillingInfo } from '../../../utils/billing';

// Íconos de la página (dibujos simples, sin librería).
export const User = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
export const Package = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
export const MapPin = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
export const Heart = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
export const Shield = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-.5 6-3 1.5 2.5 4 3 6 3 1.07 0 2.14-.1 3-.29V13Z" /></svg>;
export const LogOut = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>;
export const ChevronRight = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>;
export const Edit2 = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>;
export const Trash2 = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>;
export const Camera = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
export const Home = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
export const Phone = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
export const CreditCard = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>;
export const ExternalLink = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
export const CheckCircle = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>;
export const Clock = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
export const Headset = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" /></svg>;

export const STATUS_STYLES = {
    Enviado: 'bg-primary/20 text-primary',
    Entregado: 'bg-green-100 text-green-700',
    Pendiente: 'bg-zinc-100 text-zinc-600',
    'Pendiente de pago': 'bg-amber-100 text-amber-700',
    'En gestion': 'bg-blue-100 text-blue-700',
    Confirmado: 'bg-emerald-100 text-emerald-700',
    Pagado: 'bg-emerald-100 text-emerald-700',
    'En proceso': 'bg-amber-100 text-amber-700',
    Impaga: 'bg-rose-100 text-rose-700',
    Cancelado: 'bg-zinc-200 text-zinc-600',
    Borrador: 'bg-zinc-100 text-zinc-600',
    Recibido: 'bg-blue-100 text-blue-700',
};

export const ORDER_STATUS_LABELS = {
    draft: 'Borrador',
    pending: 'Pendiente',
    pending_payment: 'Pendiente de pago',
    processing: 'En proceso',
    paid: 'Pagado',
    unpaid: 'Impaga',
    submitted: 'Recibido',
    cancelled: 'Cancelado',
};

export const PHONE_COUNTRIES = [
    { code: 'AR', name: 'Argentina', dial: '+54' },
    { code: 'US', name: 'Estados Unidos', dial: '+1' },
    { code: 'BR', name: 'Brasil', dial: '+55' },
    { code: 'CL', name: 'Chile', dial: '+56' },
    { code: 'UY', name: 'Uruguay', dial: '+598' },
    { code: 'PY', name: 'Paraguay', dial: '+595' },
    { code: 'BO', name: 'Bolivia', dial: '+591' },
    { code: 'PE', name: 'Peru', dial: '+51' },
    { code: 'CO', name: 'Colombia', dial: '+57' },
    { code: 'VE', name: 'Venezuela', dial: '+58' },
    { code: 'EC', name: 'Ecuador', dial: '+593' },
    { code: 'MX', name: 'Mexico', dial: '+52' },
    { code: 'ES', name: 'Espana', dial: '+34' },
    { code: 'IT', name: 'Italia', dial: '+39' },
    { code: 'FR', name: 'Francia', dial: '+33' },
];

export const getCountryByCode = (code) =>
    PHONE_COUNTRIES.find((country) => country.code === code) || PHONE_COUNTRIES[0];

export const getCountryByDial = (dial) =>
    PHONE_COUNTRIES.find((country) => country.dial === dial);

export const buildPhone = (countryCode, number) => {
    const country = getCountryByCode(countryCode);
    const trimmed = (number || '').trim();
    return trimmed ? `${country.dial} ${trimmed}` : '';
};

export const STATUS_ICONS = {
    Enviado: Package,
    Entregado: CheckCircle,
    Pendiente: Clock,
    'Pendiente de pago': CreditCard,
    'En gestion': Clock,
    Confirmado: CheckCircle,
    Pagado: CheckCircle,
    'En proceso': Clock,
    Impaga: Clock,
    Cancelado: Clock,
    Borrador: Clock,
    Recibido: Package,
};

export const normalizeEmailKey = (value = '') => String(value || '').trim().toLowerCase();

export const getProfileAddressKeys = (user) => {
    const keys = [];
    if (user?.id) {
        keys.push(`teflon_profile_address_${user.id}`);
    }
    const email = normalizeEmailKey(user?.email);
    if (email) {
        keys.push(`teflon_profile_address_${email}`);
    }
    return [...new Set(keys)];
};

export const formatOrderStatusLabel = (status = '') => {
    const raw = String(status || '').trim();
    const normalized = raw.toLowerCase();
    return ORDER_STATUS_LABELS[normalized] || raw || 'Pendiente';
};

export const normalizePhoneFields = (value = {}, fallbackCountry = 'AR') => {
    let phoneCountry = String(value.phoneCountry || fallbackCountry || 'AR').trim().toUpperCase() || 'AR';
    let phoneNumber = String(value.phoneNumber || '').trim();
    const rawPhone = String(value.phone || '').trim();
    const phoneMatch = rawPhone.match(/^(\+\d{1,3})\s*(.*)$/);

    if (!value.phoneCountry && phoneMatch) {
        const countryByDial = getCountryByDial(phoneMatch[1]);
        if (countryByDial) {
            phoneCountry = countryByDial.code;
        }
    }

    if (!phoneNumber) {
        phoneNumber = phoneMatch ? phoneMatch[2].trim() : rawPhone;
    }

    const country = getCountryByCode(phoneCountry);
    const plainDial = country.dial.replace('+', '');

    if (phoneNumber.startsWith(country.dial)) {
        phoneNumber = phoneNumber.slice(country.dial.length).trim();
    } else if (plainDial && phoneNumber.startsWith(plainDial)) {
        phoneNumber = phoneNumber.slice(plainDial.length).trim();
    }

    phoneNumber = phoneNumber.replace(/^\+/, '').trim();

    return {
        phoneCountry: country.code,
        phoneNumber,
        phone: buildPhone(country.code, phoneNumber),
    };
};

export const normalizeProfileAddress = (value = {}, fallback = {}) => {
    const merged = {
        fullName: '',
        line1: '',
        city: '',
        postal: '',
        region: '',
        country: 'Argentina',
        countryCode: 'AR',
        provinceId: '',
        cityId: '',
        company: '',
        cuit: '',
        ...fallback,
        ...value,
    };
    const rawCountry = String(merged.country || merged.countryLabel || '').trim();
    const countryCodeFromValue = String(merged.countryCode || merged.country_code || '').trim().toUpperCase();
    const inferredCountryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : '';
    const countryCode = countryCodeFromValue || inferredCountryCode;
    const fallbackCountryCode = String(fallback.countryCode || '').trim().toUpperCase();
    const countryLabel = countryCode
        ? getCountryLabelByCode(countryCode)
        : rawCountry || 'Argentina';
    const normalizedCountryCode =
        countryCode
        || ((!rawCountry || countryLabel === 'Argentina') ? (fallbackCountryCode || 'AR') : '');
    const billing = normalizeBillingInfo(merged);

    return {
        ...merged,
        fullName: String(merged.fullName || merged.name || '').trim(),
        line1: String(merged.line1 || merged.address || '').trim(),
        address: String(merged.line1 || merged.address || '').trim(),
        fullAddress: String(merged.line1 || merged.address || '').trim(),
        city: String(merged.city || merged.locality || '').trim(),
        cityId: String(merged.cityId || merged.city_id || '').trim(),
        locality: String(merged.city || merged.locality || '').trim(),
        postal: String(merged.postal || merged.postalCode || '').trim(),
        postalCode: String(merged.postal || merged.postalCode || '').trim(),
        region: String(merged.region || merged.province || '').trim(),
        province: String(merged.region || merged.province || '').trim(),
        provinceId: String(merged.provinceId || merged.province_id || '').trim(),
        country: String(countryLabel || 'Argentina').trim() || 'Argentina',
        countryCode: normalizedCountryCode,
        company: String(merged.company || '').trim(),
        cuit: String(merged.cuit || '').trim(),
        billingBusinessName: billing.businessName,
        billingAddress: billing.address,
        billingCity: billing.city,
        billingVatType: billing.vatType,
        billingDocumentType: billing.documentType,
        billingDocumentNumber: billing.documentNumber,
        billing,
        ...normalizePhoneFields(merged, fallback.phoneCountry || 'AR'),
    };
};

export const buildWholesaleQuoteMessage = ({
    companyName = '',
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    businessName = '',
    cuit = '',
    addressLine = '',
}) => {
    return [
        `Hola, quiero solicitar una cotizacion mayorista para ${companyName || 'su empresa'}.`,
        '',
        `Nombre: ${customerName || '-'}`,
        `Email: ${customerEmail || '-'}`,
        `Telefono: ${customerPhone || '-'}`,
        `Empresa: ${businessName || '-'}`,
        `CUIT: ${cuit || '-'}`,
        `Direccion: ${addressLine || '-'}`,
    ].join('\n');
};

export const ProfileIcon = ({ name, className = "h-5 w-5" }) => {
    return null; // Deprecated
};
