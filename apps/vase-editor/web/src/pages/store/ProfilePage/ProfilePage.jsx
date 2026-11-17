// Íconos y ayudantes de ProfilePage.jsx: ProfilePage.
// partes: ./ProfileSecurity.jsx, ./ProfileFavorites.jsx, ./ProfileAddresses.jsx, ./ProfileOrders.jsx, ./ProfileHeader.jsx, ./ProfileSidebar.jsx, ./save-address.js, ./profile-photo-change.js, ./update-order-status.js, ./ProfileLayout.jsx
import { useEffect, useMemo, useState } from 'react';
import StoreLayout from '../../../components/layout/StoreLayout';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { useTenant } from '../../../context/TenantContext';
import { formatCurrency } from '../../../utils/format';
import { navigate } from '../../../utils/navigation';
import { getApiBase, getTenantHeaders } from '../../../utils/api';
import { getPriceAccessState } from '../../../utils/priceVisibility';
import { createPlaceholderImage } from '../../../utils/productImage';
import { BILLING_DOCUMENT_OPTIONS, BILLING_VAT_OPTIONS, EMPTY_BILLING_INFO, getBillingDocumentLabel, getBillingVatLabel, hasBillingInfo, normalizeBillingInfo } from '../../../utils/billing';
import { useAddressLocationFields } from '../../../hooks/useAddressLocationFields';
import { Camera, ChevronRight, ExternalLink, Headset, Heart, Home, LogOut, MapPin, PHONE_COUNTRIES, Package, Phone, STATUS_ICONS, STATUS_STYLES, Shield, Trash2, User, buildPhone, buildWholesaleQuoteMessage, formatOrderStatusLabel, getProfileAddressKeys, normalizeProfileAddress } from './profile-helpers.jsx';

import ProfileSecurity from './ProfileSecurity.jsx';
import ProfileFavorites from './ProfileFavorites.jsx';
import ProfileAddresses from './ProfileAddresses.jsx';
import ProfileOrders from './ProfileOrders.jsx';
import ProfileHeader from './ProfileHeader.jsx';
import ProfileSidebar from './ProfileSidebar.jsx';
import { makeSaveAddress } from './save-address.js';
import { makeHandleProfilePhotoChange } from './profile-photo-change.js';
import { makeUpdateOrderStatus } from './update-order-status.js';
import ProfileLayout from './ProfileLayout.jsx';
export default function ProfilePage() {
    const { user, logout, loading, isAdmin, uploadProfilePhoto, updateProfile } = useAuth();
    const { favorites, removeFavorite, addToCart } = useStore();
    const { settings } = useTenant();
    const currency = settings?.commerce?.currency || 'ARS';
    const locale = settings?.commerce?.locale || 'es-AR';
    const { canViewPrices: showPrices } = getPriceAccessState(settings, user);
    const defaultAddress = useMemo(() => ({
        fullName: '',
        line1: '',
        city: '',
        cityId: '',
        postal: '',
        region: '',
        provinceId: '',
        country: 'Argentina',
        countryCode: 'AR',
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
    const {
        countryInput,
        countryOptions,
        countriesLoading,
        provinceOptions,
        provinceLoading,
        cityOptions,
        citiesLoading,
        isArgentinaCountry,
        provinceSuggestionsEnabled,
        citySuggestionsEnabled,
        handleCountryInputChange,
        handleProvinceInputChange,
        handleCityInputChange,
    } = useAddressLocationFields({
        value: addressDraft,
        setValue: setAddressDraft,
        fields: {
            countryCode: 'countryCode',
            countryLabel: 'country',
            province: 'region',
            provinceId: 'provinceId',
            city: 'city',
            cityId: 'cityId',
        },
    });
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
        if (!user) {
            setProfilePhoto('');
            return;
        }
        if (user.photo_url) {
            const next = user.photo_url.startsWith('http')
                ? user.photo_url
                : `${getApiBase()}${user.photo_url}`;
            setProfilePhoto(next);
            return;
        }
        // Legacy fallback: read from localStorage if user has no server photo yet
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

    const updateOrderStatus = makeUpdateOrderStatus({ setOrders, user });

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleWholesaleQuote = () => {
        if (!wholesaleQuoteUrl) return;
        window.open(wholesaleQuoteUrl, '_blank', 'noopener,noreferrer');
    };

    const saveAddress = makeSaveAddress({ addressDraft, addressStorageKeys, defaultAddress, setAddress, setIsEditingAddress, updateProfile, user });

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

    const handleProfilePhotoChange = makeHandleProfilePhotoChange({ setProfilePhoto, uploadProfilePhoto, user });

    const handleRemovePhoto = async () => {
        if (!user) return;
        try {
            await uploadProfilePhoto(null).catch(() => null);
        } catch {}
        setProfilePhoto('');
        const key = `teflon_profile_photo_${user.id || user.email}`;
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.warn('No se pudo eliminar la foto de perfil', err);
        }
    };

    return (
        <ProfileLayout activeSection={activeSection} addToCart={addToCart} address={address} addressDraft={addressDraft} addressesSpanClass={addressesSpanClass} billingDetails={billingDetails} citiesLoading={citiesLoading} cityOptions={cityOptions} citySuggestionsEnabled={citySuggestionsEnabled} countriesLoading={countriesLoading} countryInput={countryInput} countryOptions={countryOptions} currency={currency} favorites={favorites} formatOrderDate={formatOrderDate} handleCityInputChange={handleCityInputChange} handleCountryInputChange={handleCountryInputChange} handleLogout={handleLogout} handleProfilePhotoChange={handleProfilePhotoChange} handleProvinceInputChange={handleProvinceInputChange} handleRemovePhoto={handleRemovePhoto} handleViewOrder={handleViewOrder} handleWholesaleQuote={handleWholesaleQuote} hasProfileBillingInfo={hasProfileBillingInfo} isArgentinaCountry={isArgentinaCountry} isEditingAddress={isEditingAddress} isWholesaleUser={isWholesaleUser} locale={locale} ordersSpanClass={ordersSpanClass} profileName={profileName} profilePhoto={profilePhoto} provinceLoading={provinceLoading} provinceOptions={provinceOptions} provinceSuggestionsEnabled={provinceSuggestionsEnabled} removeFavorite={removeFavorite} resetAddress={resetAddress} roleLabel={roleLabel} saveAddress={saveAddress} sectionLabels={sectionLabels} setActiveSection={setActiveSection} setAddressDraft={setAddressDraft} setIsEditingAddress={setIsEditingAddress} showAddresses={showAddresses} showOrders={showOrders} showPrices={showPrices} updateOrderStatus={updateOrderStatus} visibleOrders={visibleOrders} wholesaleQuoteUrl={wholesaleQuoteUrl} />
    );
}
