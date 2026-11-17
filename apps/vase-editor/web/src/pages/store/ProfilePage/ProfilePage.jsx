// Íconos y ayudantes de ProfilePage.jsx: ProfilePage.
// partes: ./ProfileSecurity.jsx, ./ProfileFavorites.jsx, ./ProfileAddresses.jsx, ./ProfileOrders.jsx, ./ProfileHeader.jsx, ./ProfileSidebar.jsx
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

    const saveAddress = async () => {
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

    const handleProfilePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        event.target.value = '';

        let previewUrl = '';
        try {
            previewUrl = URL.createObjectURL(file);
            setProfilePhoto(previewUrl);
            const photoUrl = await uploadProfilePhoto(file);
            if (photoUrl) {
                const finalUrl = photoUrl.startsWith('http')
                    ? photoUrl
                    : `${getApiBase()}${photoUrl}`;
                setProfilePhoto(finalUrl);
                try {
                    const key = `teflon_profile_photo_${user.id || user.email}`;
                    localStorage.removeItem(key);
                } catch {}
            }
        } catch (err) {
            console.error('Photo upload failed', err);
            const message = typeof err?.message === 'string' ? err.message : 'No se pudo subir la foto';
            window.alert(message);
            if (user.photo_url) {
                setProfilePhoto(user.photo_url.startsWith('http')
                    ? user.photo_url
                    : `${getApiBase()}${user.photo_url}`);
            } else {
                setProfilePhoto('');
            }
        } finally {
            if (previewUrl) {
                setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
            }
        }
    };

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
        <StoreLayout>
            <div className="mx-auto w-full max-w-[1400px] px-4 md:px-10 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <ProfileSidebar activeSection={activeSection} favorites={favorites} handleLogout={handleLogout} profileName={profileName} profilePhoto={profilePhoto} roleLabel={roleLabel} setActiveSection={setActiveSection} />

                    <main className="flex-1 bg-[#f8f7f5] dark:bg-[#1a140d] rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-2 text-xs text-[#8a7560] mb-6 uppercase tracking-wider font-semibold">
                            <button className="hover:text-primary transition-colors" onClick={() => navigate('/')}>
                                Inicio
                            </button>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-primary">{sectionLabels[activeSection]}</span>
                        </div>

                        {activeSection === 'account' ? (
                            <ProfileHeader handleProfilePhotoChange={handleProfilePhotoChange} handleRemovePhoto={handleRemovePhoto} profileName={profileName} profilePhoto={profilePhoto} roleLabel={roleLabel} />
                        ) : null}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {showOrders ? (
                                <ProfileOrders currency={currency} formatOrderDate={formatOrderDate} handleViewOrder={handleViewOrder} locale={locale} ordersSpanClass={ordersSpanClass} setActiveSection={setActiveSection} updateOrderStatus={updateOrderStatus} visibleOrders={visibleOrders} />
                            ) : null}

                            {showAddresses ? (
                                <ProfileAddresses address={address} addressDraft={addressDraft} addressesSpanClass={addressesSpanClass} billingDetails={billingDetails} citiesLoading={citiesLoading} cityOptions={cityOptions} citySuggestionsEnabled={citySuggestionsEnabled} countriesLoading={countriesLoading} countryInput={countryInput} countryOptions={countryOptions} handleCityInputChange={handleCityInputChange} handleCountryInputChange={handleCountryInputChange} handleProvinceInputChange={handleProvinceInputChange} handleWholesaleQuote={handleWholesaleQuote} hasProfileBillingInfo={hasProfileBillingInfo} isArgentinaCountry={isArgentinaCountry} isEditingAddress={isEditingAddress} isWholesaleUser={isWholesaleUser} profileName={profileName} provinceLoading={provinceLoading} provinceOptions={provinceOptions} provinceSuggestionsEnabled={provinceSuggestionsEnabled} resetAddress={resetAddress} roleLabel={roleLabel} saveAddress={saveAddress} setAddressDraft={setAddressDraft} setIsEditingAddress={setIsEditingAddress} wholesaleQuoteUrl={wholesaleQuoteUrl} />
                            ) : null}

                            {activeSection === 'favorites' ? (
                                <ProfileFavorites addToCart={addToCart} currency={currency} favorites={favorites} locale={locale} removeFavorite={removeFavorite} showPrices={showPrices} />
                            ) : null}

                            {activeSection === 'security' ? (
                                <ProfileSecurity />
                            ) : null}
                        </div>
                    </main>
                </div>
            </div>
        </StoreLayout>
    );
}
