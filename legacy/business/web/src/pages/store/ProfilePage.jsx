import React, { useEffect, useMemo, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import { useAuth } from '../../context/AuthContext';
const User = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const Package = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
const MapPin = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
const Heart = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
const Shield = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-.5 6-3 1.5 2.5 4 3 6 3 1.07 0 2.14-.1 3-.29V13Z" /></svg>;
const LogOut = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>;
const ChevronRight = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>;
const Edit2 = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>;
const Trash2 = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>;
const Camera = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>;
const Home = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const Phone = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const CreditCard = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>;
const ExternalLink = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
const CheckCircle = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>;
const Clock = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const Headset = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" /></svg>;
import { useStore } from '../../context/StoreContext';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency } from '../../utils/format';
import { navigate } from '../../utils/navigation';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { getPriceAccessState } from '../../utils/priceVisibility';
import { createPlaceholderImage } from '../../utils/productImage';
import {
    BILLING_DOCUMENT_OPTIONS,
    BILLING_VAT_OPTIONS,
    EMPTY_BILLING_INFO,
    getBillingDocumentLabel,
    getBillingVatLabel,
    hasBillingInfo,
    normalizeBillingInfo,
} from '../../utils/billing';

const STATUS_STYLES = {
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

const ORDER_STATUS_LABELS = {
    draft: 'Borrador',
    pending: 'Pendiente',
    pending_payment: 'Pendiente de pago',
    processing: 'En proceso',
    paid: 'Pagado',
    unpaid: 'Impaga',
    submitted: 'Recibido',
    cancelled: 'Cancelado',
};

const PHONE_COUNTRIES = [
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

const getCountryByCode = (code) =>
    PHONE_COUNTRIES.find((country) => country.code === code) || PHONE_COUNTRIES[0];

const getCountryByDial = (dial) =>
    PHONE_COUNTRIES.find((country) => country.dial === dial);

const buildPhone = (countryCode, number) => {
    const country = getCountryByCode(countryCode);
    const trimmed = (number || '').trim();
    return trimmed ? `${country.dial} ${trimmed}` : '';
};

const STATUS_ICONS = {
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

const normalizeEmailKey = (value = '') => String(value || '').trim().toLowerCase();

const getProfileAddressKeys = (user) => {
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

const formatOrderStatusLabel = (status = '') => {
    const raw = String(status || '').trim();
    const normalized = raw.toLowerCase();
    return ORDER_STATUS_LABELS[normalized] || raw || 'Pendiente';
};

const normalizePhoneFields = (value = {}, fallbackCountry = 'AR') => {
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

const normalizeProfileAddress = (value = {}, fallback = {}) => {
    const merged = {
        fullName: '',
        line1: '',
        city: '',
        postal: '',
        region: '',
        country: 'Argentina',
        company: '',
        cuit: '',
        ...fallback,
        ...value,
    };
    const billing = normalizeBillingInfo(merged);

    return {
        ...merged,
        fullName: String(merged.fullName || merged.name || '').trim(),
        line1: String(merged.line1 || merged.address || '').trim(),
        city: String(merged.city || '').trim(),
        postal: String(merged.postal || '').trim(),
        region: String(merged.region || '').trim(),
        country: String(merged.country || 'Argentina').trim() || 'Argentina',
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

const buildWholesaleQuoteMessage = ({
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

const ProfileIcon = ({ name, className = "h-5 w-5" }) => {
    return null; // Deprecated
};

export default function ProfilePage() {
    const { user, logout, loading, isAdmin } = useAuth();
    const { favorites, removeFavorite, addToCart } = useStore();
    const { settings } = useTenant();
    const currency = settings?.commerce?.currency || 'ARS';
    const locale = settings?.commerce?.locale || 'es-AR';
    const { canViewPrices: showPrices } = getPriceAccessState(settings, user);
    const defaultAddress = useMemo(() => ({
        fullName: '',
        line1: '',
        city: '',
        postal: '',
        region: '',
        country: 'Argentina',
        phone: '',
        phoneCountry: 'AR',
        phoneNumber: '',
        company: '',
        cuit: '',
        ...EMPTY_BILLING_INFO,
    }), []);
    const [address, setAddress] = useState(defaultAddress);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressDraft, setAddressDraft] = useState(defaultAddress);
    const [profilePhoto, setProfilePhoto] = useState('');
    const [activeSection, setActiveSection] = useState('account');
    const [orders, setOrders] = useState([]);
    const displayName = useMemo(() => {
        if (!user?.email) return 'Cliente';
        const [name] = user.email.split('@');
        return name || 'Cliente';
    }, [user]);
    const profileName = useMemo(
        () => address?.fullName?.trim() || displayName,
        [address?.fullName, displayName]
    );
    const billingDetails = useMemo(() => normalizeBillingInfo(address), [address]);
    const hasProfileBillingInfo = useMemo(() => hasBillingInfo(address), [address]);
    const addressStorageKeys = useMemo(() => getProfileAddressKeys(user), [user]);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [loading, user]);

    useEffect(() => {
        const fallback = normalizeProfileAddress(
            {
                ...defaultAddress,
                fullName: displayName,
            },
            defaultAddress
        );

        if (!user) {
            setAddress(fallback);
            setAddressDraft(fallback);
            return;
        }

        try {
            let storedKey = '';
            let raw = '';

            for (const key of addressStorageKeys) {
                const candidate = localStorage.getItem(key);
                if (candidate) {
                    storedKey = key;
                    raw = candidate;
                    break;
                }
            }

            if (raw) {
                const parsed = JSON.parse(raw);
                const merged = normalizeProfileAddress(parsed, fallback);
                setAddress(merged);
                setAddressDraft(merged);

                if (addressStorageKeys.length && storedKey !== addressStorageKeys[0]) {
                    localStorage.setItem(addressStorageKeys[0], JSON.stringify(merged));
                }
                return;
            }
        } catch (err) {
            console.warn('No se pudo cargar la direccion guardada', err);
        }

        setAddress(fallback);
        setAddressDraft(fallback);
    }, [user, defaultAddress, displayName, addressStorageKeys]);

    useEffect(() => {
        if (!user) return;
        const key = `teflon_profile_photo_${user.id || user.email}`;
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                setProfilePhoto(raw);
                return;
            }
        } catch (err) {
            console.warn('No se pudo cargar la foto de perfil', err);
        }
        setProfilePhoto('');
    }, [user]);

    useEffect(() => {
        if (!user) {
            setOrders([]);
            return;
        }

        const token = localStorage.getItem('teflon_token');
        const headers = {
            ...getTenantHeaders(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const loadOrders = async () => {
            try {
                const res = await fetch(`${getApiBase()}/api/orders/mine`, { headers });
                if (!res.ok) {
                    throw new Error('no_orders');
                }
                const data = await res.json();
                const items = Array.isArray(data.items) ? data.items : [];
                const mapped = items.map((order) => ({
                    id: order.id,
                    status: formatOrderStatusLabel(order.status),
                    total: order.total,
                    currency: order.currency || currency,
                    locale,
                    createdAt: order.created_at,
                    customer: order.customer || {},
                    checkout_mode: order.checkout_mode || '',
                    items: Array.isArray(order.items)
                        ? order.items.map((item) => ({
                            id: item.product_id || item.id,
                            sku: item.sku || item.product_id,
                            name: item.name,
                            qty: item.qty,
                        }))
                        : [],
                    method: order.checkout_mode === 'whatsapp' ? 'whatsapp' : 'transfer',
                }));
                setOrders(mapped);
                return;
            } catch (err) {
                console.warn('No se pudieron cargar los pedidos desde la API', err);
            }

            const key = `teflon_orders_${user.id || user.email || "guest"}`;
            try {
                const raw = localStorage.getItem(key);
                const parsed = raw ? JSON.parse(raw) : [];
                setOrders(Array.isArray(parsed) ? parsed : []);
            } catch (err) {
                console.warn('No se pudieron cargar los pedidos locales', err);
                setOrders([]);
            }
        };

        loadOrders();
    }, [user, currency, locale]);

    const roleLabel = useMemo(() => {
        if (isAdmin) return 'Administrador';
        if (user?.role === 'wholesale') return 'Mayorista';
        return 'Minorista';
    }, [user, isAdmin]);
    const isWholesaleUser = user?.role === 'wholesale';
    const ordersWhatsappNumber = useMemo(
        () => String(settings?.commerce?.whatsapp_number || '').replace(/\D/g, ''),
        [settings?.commerce?.whatsapp_number]
    );
    const wholesaleBusinessName = address?.company?.trim() || profileName;
    const wholesaleAddressLine = [
        address?.line1,
        [address?.city, address?.postal].filter(Boolean).join(', '),
        [address?.region, address?.country].filter(Boolean).join(', '),
    ]
        .filter(Boolean)
        .join(' | ');
    const wholesaleQuoteUrl = useMemo(() => {
        if (!ordersWhatsappNumber) return '';
        const message = buildWholesaleQuoteMessage({
            companyName: settings?.branding?.name || '',
            customerName: profileName,
            customerEmail: user?.email || '',
            customerPhone: buildPhone(address?.phoneCountry, address?.phoneNumber),
            businessName: wholesaleBusinessName,
            cuit: address?.cuit || '',
            addressLine: wholesaleAddressLine,
        });
        return `https://wa.me/${ordersWhatsappNumber}?text=${encodeURIComponent(message)}`;
    }, [
        ordersWhatsappNumber,
        settings?.branding?.name,
        profileName,
        user?.email,
        address?.phoneCountry,
        address?.phoneNumber,
        address?.cuit,
        wholesaleBusinessName,
        wholesaleAddressLine,
    ]);

    const sectionLabels = {
        account: 'Mi cuenta',
        orders: 'Historial de pedidos',
        addresses: 'Direcciones',
        favorites: 'Favoritos',
        security: 'Seguridad',
    };
    const isAccountSection = activeSection === 'account';
    const showOrders = activeSection === 'orders' || isAccountSection;
    const showAddresses = activeSection === 'addresses' || isAccountSection;
    const ordersSpanClass = isAccountSection ? 'lg:col-span-2' : 'lg:col-span-3';
    const addressesSpanClass = isAccountSection ? 'lg:col-span-1' : 'lg:col-span-3';

    const visibleOrders = useMemo(() => {
        if (!orders.length) return [];
        return activeSection === 'orders' ? orders : orders.slice(0, 4);
    }, [orders, activeSection]);

    const formatOrderDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString(locale || 'es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <StoreLayout>
                <div className="min-h-[60vh] flex items-center justify-center text-sm text-[#8a7560]">
                    Cargando perfil...
                </div>
            </StoreLayout>
        );
    }

    if (!user) {
        return null;
    }

    const handleViewOrder = (order) => {
        try {
            localStorage.setItem("teflon_last_order", JSON.stringify(order));
            localStorage.setItem("teflon_selected_order", JSON.stringify(order));
        } catch (err) {
            console.warn('No se pudo guardar el pedido seleccionado', err);
        }
        navigate(`/order-details?id=${order.id}`);
    };

    const updateOrderStatus = (orderId, nextStatus) => {
        if (!orderId) return;
        const historyKey = `teflon_orders_${user?.id || user?.email || "guest"}`;
        setOrders((prev) => {
            const next = prev.map((order) =>
                order.id === orderId ? { ...order, status: nextStatus } : order
            );
            try {
                localStorage.setItem(historyKey, JSON.stringify(next));
            } catch (err) {
                console.warn('No se pudo actualizar el pedido', err);
            }
            try {
                const raw = localStorage.getItem("teflon_last_order");
                if (raw) {
                    const last = JSON.parse(raw);
                    if (last?.id === orderId) {
                        localStorage.setItem("teflon_last_order", JSON.stringify({ ...last, status: nextStatus }));
                    }
                }
            } catch (err) {
                console.warn('No se pudo actualizar el pedido reciente', err);
            }
            return next;
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleWholesaleQuote = () => {
        if (!wholesaleQuoteUrl) return;
        window.open(wholesaleQuoteUrl, '_blank', 'noopener,noreferrer');
    };

    const saveAddress = () => {
        if (!user) return;
        const next = normalizeProfileAddress(addressDraft, defaultAddress);
        setAddress(next);
        try {
            addressStorageKeys.forEach((key) => {
                localStorage.setItem(key, JSON.stringify(next));
            });
        } catch (err) {
            console.warn('No se pudo guardar la direccion', err);
        }
        setIsEditingAddress(false);
    };

    const resetAddress = () => {
        if (!user) return;
        const fallback = normalizeProfileAddress(
            {
                ...defaultAddress,
                fullName: displayName,
            },
            defaultAddress
        );
        setAddress(fallback);
        setAddressDraft(fallback);
        try {
            addressStorageKeys.forEach((key) => {
                localStorage.removeItem(key);
            });
        } catch (err) {
            console.warn('No se pudo limpiar la direccion', err);
        }
        setIsEditingAddress(false);
    };

    const handleProfilePhotoChange = (event) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            setProfilePhoto(result);
            const key = `teflon_profile_photo_${user.id || user.email}`;
            try {
                if (result) {
                    localStorage.setItem(key, result);
                }
            } catch (err) {
                console.warn('No se pudo guardar la foto de perfil', err);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleRemovePhoto = () => {
        if (!user) return;
        setProfilePhoto('');
        const key = `teflon_profile_photo_${user.id || user.email}`;
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.warn('No se pudo eliminar la foto de perfil', err);
        }
    };

    return (
        <StoreLayout>
            <div className="mx-auto w-full max-w-[1400px] px-4 md:px-10 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="w-full lg:w-64 border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] rounded-2xl p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-8 px-2">
                                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border border-primary/20">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-6 w-6" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold dark:text-white">{profileName}</span>
                                    <span className="text-xs text-[#8a7560]">{roleLabel}</span>
                                </div>
                            </div>

                            <nav className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 lg:pb-0 lg:flex-col lg:space-y-1 hide-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 mt-4 lg:mt-0">
                                <button
                                    className={`shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg transition-all ${activeSection === 'account' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                                    onClick={() => setActiveSection('account')}
                                >
                                    <User className="h-5 w-5 shrink-0" />
                                    <span className="text-sm">Mi cuenta</span>
                                </button>
                                <button
                                    className={`shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg transition-all ${activeSection === 'orders' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                                    onClick={() => setActiveSection('orders')}
                                >
                                    <Package className="h-5 w-5 shrink-0" />
                                    <span className="text-sm">Historial de pedidos</span>
                                </button>
                                <button
                                    className={`shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg transition-all ${activeSection === 'addresses' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                                    onClick={() => setActiveSection('addresses')}
                                >
                                    <MapPin className="h-5 w-5 shrink-0" />
                                    <span className="text-sm">Direcciones</span>
                                </button>
                                <button
                                    className={`shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg transition-all ${activeSection === 'favorites' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                                    onClick={() => setActiveSection('favorites')}
                                >
                                    <Heart className="h-5 w-5 shrink-0" />
                                    <span className="text-sm">Favoritos</span>
                                    {favorites?.length ? (
                                        <span className="ml-auto size-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#2c2116]" />
                                    ) : null}
                                </button>
                                <button
                                    className={`shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg transition-all ${activeSection === 'security' ? 'bg-primary/10 text-primary font-semibold' : 'text-[#181411] dark:text-gray-300 hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116]'}`}
                                    onClick={() => setActiveSection('security')}
                                >
                                    <Shield className="h-5 w-5 shrink-0" />
                                    <span className="text-sm">Seguridad</span>
                                </button>
                            </nav>
                        </div>

                        <div className="pt-6 border-t border-[#e5e1de] dark:border-[#3d2f21]">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-medium"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-sm">Cerrar sesion</span>
                            </button>
                        </div>
                    </aside>

                    <main className="flex-1 bg-[#f8f7f5] dark:bg-[#1a140d] rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-2 text-xs text-[#8a7560] mb-6 uppercase tracking-wider font-semibold">
                            <button className="hover:text-primary transition-colors" onClick={() => navigate('/')}>
                                Inicio
                            </button>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-primary">{sectionLabels[activeSection]}</span>
                        </div>

                        {activeSection === 'account' ? (
                            <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-6 md:p-8 mb-8 flex flex-col lg:flex-row justify-between gap-6 shadow-sm">
                                <div className="flex items-center gap-5">
                                    <div className="size-16 rounded-full border-4 border-primary/10 overflow-hidden flex items-center justify-center bg-primary/5 text-primary">
                                        {profilePhoto ? (
                                            <img src={profilePhoto} alt="Foto de perfil" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="h-8 w-8" />
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black text-[#181411] dark:text-white leading-tight">
                                            Hola, {profileName}!
                                        </h1>
                                        <p className="text-[#8a7560] mt-1 text-sm">
                                            Administra tu cuenta, revisa tus pedidos y actualiza tus datos.
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                Cuenta activa
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="px-5 py-2.5 bg-white border border-[#e5e1de] text-[#181411] font-bold text-sm rounded-lg hover:bg-[#f5f2f0] transition-all shadow-sm flex items-center gap-2 cursor-pointer">
                                        <Camera className="w-4 h-4" />
                                        Subir foto
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleProfilePhotoChange}
                                            className="hidden"
                                        />
                                    </label>
                                    {profilePhoto ? (
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="px-5 py-2.5 bg-white border border-[#e5e1de] text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Quitar foto
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {showOrders ? (
                                <div className={`${ordersSpanClass} space-y-8`}>
                                    <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] shadow-sm overflow-hidden">
                                        <div className="px-6 py-5 border-b border-[#e5e1de] dark:border-[#3d2f21] flex flex-wrap gap-3 justify-between items-center">
                                            <h3 className="font-bold text-lg">Pedidos recientes</h3>
                                            <button
                                                type="button"
                                                onClick={() => setActiveSection('orders')}
                                                className="text-sm text-primary font-semibold hover:underline"
                                            >
                                                Ver todo
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 p-4 lg:hidden">
                                            {visibleOrders.length ? (
                                                visibleOrders.map((order) => {
                                                    const statusLabel = order.status || 'Pendiente';
                                                    return (
                                                        <div key={order.id} className="border border-[#e5e1de] dark:border-[#3d2f21] rounded-xl p-4 flex flex-col gap-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-sm text-[#181411] dark:text-white">#{order.id}</span>
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLES[statusLabel] || STATUS_STYLES.Pendiente}`}>
                                                                    {statusLabel}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-end">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-[#8a7560]">{formatOrderDate(order.createdAt)}</span>
                                                                    <span className="font-black text-primary mt-1">
                                                                        {order.total != null ? formatCurrency(order.total, order.currency || currency, order.locale || locale) : '-'}
                                                                    </span>
                                                                </div>
                                                                <button type="button" onClick={() => handleViewOrder(order)} className="text-xs font-bold text-[#181411] dark:text-white underline decoration-2">Ver detalle</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center text-[#8a7560] text-sm py-4">No hay pedidos recientes.</div>
                                            )}
                                        </div>
                                        <div className="hidden lg:block overflow-x-auto">
                                            <table className="w-full text-left min-w-[760px]">
                                                <thead>
                                                    <tr className="bg-[#f5f2f0]/60 dark:bg-[#2d241c] text-xs font-bold text-[#8a7560] uppercase tracking-wider">
                                                        <th className="px-6 py-4">Pedido</th>
                                                        <th className="px-6 py-4">Fecha</th>
                                                        <th className="px-6 py-4">Estado</th>
                                                        <th className="px-6 py-4">Total</th>
                                                        <th className="px-6 py-4">Accion</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#e5e1de] dark:divide-[#3d2e21] text-sm">
                                                    {visibleOrders.length ? (
                                                        visibleOrders.map((order) => {
                                                            const statusLabel = order.status || 'Pendiente';
                                                            const isPending = statusLabel === 'Pendiente' || statusLabel === 'Pendiente de pago';
                                                            return (
                                                                <tr key={order.id} className="hover:bg-[#f5f2f0]/40 transition-colors">
                                                                    <td className="px-6 py-5 font-mono font-medium break-all">#{order.id}</td>
                                                                    <td className="px-6 py-5">{formatOrderDate(order.createdAt)}</td>
                                                                    <td className="px-6 py-5">
                                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[statusLabel] || STATUS_STYLES.Pendiente} flex items-center gap-1 w-fit`}>
                                                                            {(() => {
                                                                                const Icon = STATUS_ICONS[statusLabel] || STATUS_ICONS.Pendiente;
                                                                                return <Icon className="w-3 h-3" />;
                                                                            })()}
                                                                            {statusLabel}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-5 font-bold">
                                                                        {order.total != null
                                                                            ? formatCurrency(order.total, order.currency || currency, order.locale || locale)
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="px-6 py-5">
                                                                        <div className="flex flex-col items-start gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleViewOrder(order)}
                                                                                className="text-primary hover:text-primary/70 font-semibold underline decoration-2 flex items-center gap-1"
                                                                            >
                                                                                Detalles
                                                                                <ExternalLink className="w-3 h-3" />
                                                                            </button>
                                                                            {isPending ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateOrderStatus(order.id, 'Pagado')}
                                                                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-600"
                                                                                >
                                                                                    Marcar como pagado
                                                                                </button>
                                                                            ) : null}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-8 text-center text-[#8a7560]">
                                                                Todavia no hay pedidos recientes.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {showAddresses ? (
                                <div className={`${addressesSpanClass} space-y-6`}>
                                    <div className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-[#e5e1de] dark:border-[#3d2f21] flex justify-between items-center">
                                            <h3 className="font-bold text-lg">Direccion principal</h3>
                                            <MapPin className="h-5 w-5 shrink-0 text-[#8a7560]" />
                                        </div>
                                        <div className="p-6">
                                            {!isEditingAddress ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <User className="text-primary w-5 h-5 mt-1" />
                                                        <div>
                                                            <p className="font-bold text-sm">{profileName}</p>
                                                            <p className="text-xs text-[#8a7560]">Cuenta {roleLabel}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <Home className="text-primary w-5 h-5 mt-1" />
                                                        <div>
                                                            {address.line1 ? (
                                                                <>
                                                                    <p className="text-sm">{address.line1}</p>
                                                                    {address.city || address.postal ? (
                                                                        <p className="text-sm">
                                                                            {address.city}
                                                                            {address.postal ? `${address.city ? ', ' : ''}${address.postal}` : ''}
                                                                        </p>
                                                                    ) : null}
                                                                    <p className="text-sm font-semibold">{[address.region, address.country].filter(Boolean).join(', ')}</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-sm text-[#8a7560]">
                                                                    Aca vas a ver la direccion que cargaste en el registro o la que edites despues.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <Phone className="text-primary w-5 h-5 mt-1" />
                                                        <p className="text-sm">
                                                            {buildPhone(address.phoneCountry, address.phoneNumber) || 'Sin telefono cargado'}
                                                        </p>
                                                    </div>
                                                    <div className="border-t border-[#e5e1de] pt-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a7560] mb-2">
                                                            Facturacion
                                                        </p>
                                                        {hasProfileBillingInfo ? (
                                                            <div className="space-y-1 text-sm">
                                                                <p className="font-semibold text-[#181411] dark:text-white">
                                                                    {billingDetails.businessName}
                                                                </p>
                                                                <p className="text-[#181411] dark:text-white">
                                                                    {billingDetails.address || '-'}
                                                                </p>
                                                                <p className="text-[#181411] dark:text-white">
                                                                    {billingDetails.city || '-'}
                                                                </p>
                                                                <p className="text-[#181411] dark:text-white">
                                                                    IVA: {getBillingVatLabel(billingDetails.vatType)}
                                                                </p>
                                                                <p className="text-[#181411] dark:text-white">
                                                                    {getBillingDocumentLabel(billingDetails.documentType)}: {billingDetails.documentNumber || '-'}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-[#8a7560]">
                                                                Agrega tus datos de facturacion para reutilizarlos al hacer pedidos.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Nombre</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.fullName}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, fullName: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Direccion</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.line1}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, line1: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Ciudad</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.city}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, city: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Codigo postal</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.postal}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, postal: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Provincia</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.region}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, region: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Pais</label>
                                                        <input
                                                            type="text"
                                                            value={addressDraft.country}
                                                            onChange={(e) => setAddressDraft({ ...addressDraft, country: e.target.value })}
                                                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="text-[10px] font-bold uppercase text-[#8a7560]">Telefono</label>
                                                        <div className="flex flex-col md:flex-row gap-2">
                                                            <select
                                                                value={addressDraft.phoneCountry}
                                                                onChange={(e) =>
                                                                    setAddressDraft({
                                                                        ...addressDraft,
                                                                        phoneCountry: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full md:w-48 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                            >
                                                                {PHONE_COUNTRIES.map((country) => (
                                                                    <option key={country.code} value={country.code}>
                                                                        {country.dial} {country.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                value={addressDraft.phoneNumber}
                                                                onChange={(e) =>
                                                                    setAddressDraft({
                                                                        ...addressDraft,
                                                                        phoneNumber: e.target.value,
                                                                    })
                                                                }
                                                                placeholder="Numero de telefono"
                                                                className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-[#e5e1de] pt-3 mt-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a7560] mb-3">
                                                            Facturacion
                                                        </p>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Razon social</label>
                                                                <input
                                                                    type="text"
                                                                    value={addressDraft.billingBusinessName || ''}
                                                                    onChange={(e) => setAddressDraft({ ...addressDraft, billingBusinessName: e.target.value })}
                                                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Direccion de facturacion</label>
                                                                <input
                                                                    type="text"
                                                                    value={addressDraft.billingAddress || ''}
                                                                    onChange={(e) => setAddressDraft({ ...addressDraft, billingAddress: e.target.value })}
                                                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Localidad</label>
                                                                <input
                                                                    type="text"
                                                                    value={addressDraft.billingCity || ''}
                                                                    onChange={(e) => setAddressDraft({ ...addressDraft, billingCity: e.target.value })}
                                                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <label className="text-[10px] font-bold uppercase text-[#8a7560]">Tipo de IVA</label>
                                                                <select
                                                                    value={addressDraft.billingVatType || ''}
                                                                    onChange={(e) => setAddressDraft({ ...addressDraft, billingVatType: e.target.value })}
                                                                    className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                >
                                                                    <option value="">Seleccionar</option>
                                                                    {BILLING_VAT_OPTIONS.map((option) => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <label className="text-[10px] font-bold uppercase text-[#8a7560]">Documento</label>
                                                                    <select
                                                                        value={addressDraft.billingDocumentType || 'cuit'}
                                                                        onChange={(e) => setAddressDraft({ ...addressDraft, billingDocumentType: e.target.value })}
                                                                        className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                    >
                                                                        {BILLING_DOCUMENT_OPTIONS.map((option) => (
                                                                            <option key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <label className="text-[10px] font-bold uppercase text-[#8a7560]">Numero</label>
                                                                    <input
                                                                        type="text"
                                                                        value={addressDraft.billingDocumentNumber || ''}
                                                                        onChange={(e) => setAddressDraft({ ...addressDraft, billingDocumentNumber: e.target.value })}
                                                                        className="w-full px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-white dark:bg-[#1a130c] text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-6 flex gap-3">
                                                {isEditingAddress ? (
                                                    <>
                                                        <button
                                                            className="flex-1 px-3 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-all"
                                                            onClick={saveAddress}
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button
                                                            className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all"
                                                            onClick={() => {
                                                                setAddressDraft(address);
                                                                setIsEditingAddress(false);
                                                            }}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all"
                                                            onClick={() => setIsEditingAddress(true)}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            className="flex-1 px-3 py-2 bg-[#f5f2f0] border border-[#e5e1de] text-xs font-bold rounded hover:bg-white transition-all text-red-600"
                                                            onClick={resetAddress}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {isWholesaleUser ? (
                                        <div className="bg-primary rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <h4 className="font-bold text-lg mb-2">Necesitas cotizacion mayorista?</h4>
                                                <p className="text-white/80 text-sm mb-2">
                                                    Contacta a nuestro equipo por el mismo WhatsApp configurado para los pedidos.
                                                </p>
                                                <p className="text-white/70 text-xs mb-4">
                                                    El mensaje sale armado con tus datos para pedir precios mayoristas.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleWholesaleQuote}
                                                    disabled={!wholesaleQuoteUrl}
                                                    className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm hover:bg-[#f8f7f5] transition-all disabled:cursor-not-allowed disabled:bg-white/80 disabled:text-primary/60"
                                                >
                                                    {wholesaleQuoteUrl ? 'Contactar asesor' : 'Configura el WhatsApp de pedidos'}
                                                </button>
                                            </div>
                                            <Headset
                                                className="h-[100px] w-[100px] text-white/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {activeSection === 'favorites' ? (
                                <>
                                    {favorites.length ? (
                                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {favorites.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] overflow-hidden hover:shadow-lg transition-all"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/product/${item.id}`)}
                                                        className="w-full aspect-square bg-[#f5f2f0] dark:bg-[#2c2116] overflow-hidden"
                                                    >
                                                        <img
                                                            src={item.image || createPlaceholderImage({ label: 'Producto', width: 300, height: 300 })}
                                                            alt={item.alt || item.name}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </button>
                                                    <div className="p-4 flex flex-col gap-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3 className="text-sm font-bold text-[#181411] dark:text-white leading-snug">
                                                                {item.name}
                                                            </h3>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFavorite(item.id)}
                                                                className="text-[#8a7560] hover:text-red-500 transition-colors"
                                                                aria-label="Quitar de favoritos"
                                                            >
                                                                <Heart className="h-4 w-4 fill-current" />
                                                            </button>
                                                        </div>
                                                        {showPrices ? (
                                                            <span className="text-primary font-black text-sm">
                                                                {formatCurrency(item.price || 0, currency, locale)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#8a7560] text-xs">Consultar precio</span>
                                                        )}
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/product/${item.id}`)}
                                                                className="flex-1 h-9 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] text-xs font-bold text-[#181411] dark:text-white hover:border-primary/60"
                                                            >
                                                                Ver producto
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => addToCart(item, 1)}
                                                                className="flex-1 h-9 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                                            >
                                                                Agregar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="lg:col-span-3 bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-8 text-center text-[#8a7560]">
                                            <div className="flex items-center justify-center gap-2 text-[#181411] dark:text-white font-bold mb-3">
                                                <Heart className="h-6 w-6 text-primary fill-current" />
                                                Favoritos
                                            </div>
                                            Todavia no agregaste favoritos.
                                        </div>
                                    )}
                                </>
                            ) : null}

                            {activeSection === 'security' ? (
                                <div className="lg:col-span-3 bg-white dark:bg-[#1a130c] rounded-2xl border border-[#e5e1de] dark:border-[#3d2f21] p-8 space-y-4">
                                    <div className="flex items-center gap-2 text-[#181411] dark:text-white font-bold">
                                        <Shield className="h-6 w-6 text-primary fill-current" />
                                        Seguridad
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-[#8a7560]">Nueva contrasena</label>
                                        <input
                                            type="password"
                                            className="w-full mt-2 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent"
                                            placeholder="********"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-[#8a7560]">Confirmar contrasena</label>
                                        <input
                                            type="password"
                                            className="w-full mt-2 px-3 py-2 rounded-lg border border-[#e5e1de] dark:border-[#3d2f21] bg-transparent"
                                            placeholder="********"
                                        />
                                    </div>
                                    <button className="w-full bg-primary text-white font-bold py-2 rounded-lg hover:bg-primary/90 transition-all">
                                        Guardar cambios
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </main>
                </div>
            </div>
        </StoreLayout>
    );
}

