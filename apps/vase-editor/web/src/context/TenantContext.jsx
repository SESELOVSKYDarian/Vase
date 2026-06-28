import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getAdminTenantHeaders, getApiBase, getTenantHeaders, isEditorContext } from '../utils/api';
import { DEFAULT_STOREFRONT_LIGHT_THEME } from '../utils/storefrontTheme';
import { normalizePriceTierLabels } from '../utils/priceTierLabels';
import { PIQUIM_CATALOG_CARDS, PIQUIM_FOOTER_DEFAULTS } from '../data/piquimBranding';
import { isPiquimTenantIdentity, resolveTenantBrandName, resolveTenantDesignPreset } from '../utils/tenantBranding';
import StoreSkeleton from '../components/StoreSkeleton';

const DEFAULT_TENANT = {
    id: '',
    name: 'Vase Business',
};

const GENERIC_FOOTER_DEFAULTS = {
    description: 'Catalogo, pedidos y atencion comercial desde una tienda online personalizada.',
    shopLinks: [
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Nosotros', href: '/about' },
        { label: 'Mi cuenta', href: '/profile' },
    ],
    helpLinks: [
        { label: 'Carrito', href: '/cart' },
        { label: 'Terminos', href: '/terms' },
    ],
    legalLinks: [{ label: 'Terminos y condiciones', href: '/terms' }],
    newsletter: {
        enabled: false,
        title: 'Novedades',
        description: '',
        placeholder: 'tu@email.com',
        buttonLabel: 'Enviar',
    },
    legalText: '(c) 2026 Vase Business. Todos los derechos reservados.',
};

const GENERIC_STOREFRONT_THEME = {
    ...DEFAULT_STOREFRONT_LIGHT_THEME,
    primary: '#f97316',
    accent: '#111827',
    background: '#f8f7f4',
    text: '#111827',
    secondary: '#64748b',
    catalog: {
        ...(DEFAULT_STOREFRONT_LIGHT_THEME.catalog || {}),
        panel_bg: '#f1f5f9',
        surface_bg: '#ffffff',
        card_bg: '#ffffff',
        border: '#dbe2ea',
        muted_text: '#64748b',
    },
};

const buildDefaultSettings = (tenant = DEFAULT_TENANT, rawSettings = {}) => {
    const piquim = isPiquimTenantIdentity({ tenant, settings: rawSettings });
    const footerDefaults = piquim ? PIQUIM_FOOTER_DEFAULTS : GENERIC_FOOTER_DEFAULTS;
    const brandName = resolveTenantBrandName({ tenant, settings: rawSettings });

    return {
    branding: {
        name: brandName,
        logo_url: '',
        design_preset: resolveTenantDesignPreset({ tenant, settings: rawSettings }),
        catalog_cards: piquim ? PIQUIM_CATALOG_CARDS : [],
        navbar: {
            links: [
                { label: 'Inicio', href: '/' },
                { label: 'Catalogo', href: '/catalog' },
                { label: 'Nosotros', href: '/about' },
            ],
            show_search: true,
            show_wishlist: true,
            show_cart: true,
            show_account: true,
            register_label: 'Registrarse',
            register_href: '/register',
        },
        footer: {
            ...footerDefaults,
            whatsapp_enabled: true,
            socialLinks: footerDefaults.socials || [],
            socials: {
                facebook: '',
                instagram: '',
                youtube: '',
                tiktok: '',
                whatsapp: '',
            },
            contact: {
                address: 'Mar del Plata, Argentina',
                phone: '',
                email: '',
            },
            quickLinks: footerDefaults.shopLinks,
        },
    },
    theme: {
        ...(piquim ? DEFAULT_STOREFRONT_LIGHT_THEME : GENERIC_STOREFRONT_THEME),
    },
    commerce: {
        currency: 'ARS',
        locale: 'es-AR',
        price_visibility: 'authenticated',
        show_prices: true,
        show_stock: true,
        reviews_enabled: true,
        low_stock_threshold: 3,
        mode: 'hybrid',
        whatsapp_number: '',
        address: 'Mar del Plata, Argentina',
        email: '',
        order_notification_email: '',
        admin_order_confirmation_label: 'En confirmacion',
        customer_order_processing_label: 'En proceso',
        admin_order_confirmation_text: 'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.',
        customer_order_processing_text: 'Tu pedido fue recibido y se encuentra en proceso.',
        tax_rate: 0.21,
        shipping_flat: 1500,
        free_shipping_threshold: 999,
        payment_methods: ['transfer', 'cash_on_pickup'],
        price_tier_labels: normalizePriceTierLabels(),
        default_delivery: 'distance:auto',
        shipping_zones: [
            {
                id: 'mdp-free',
                name: 'Entrega sin cargo',
                description: 'Hasta 5 km de la sucursal principal',
                price: 0,
                type: 'distance',
                branch_id: 'branch-mdq',
                min_distance_km: 0,
                max_distance_km: 5,
                enabled: true,
            },
            {
                id: 'mdp-mid',
                name: 'Zona media',
                description: 'De 5 a 10 km desde la sucursal',
                price: 3500,
                type: 'distance',
                branch_id: 'branch-mdq',
                min_distance_km: 5,
                max_distance_km: 10,
                enabled: true,
            },
            {
                id: 'mdp-extended',
                name: 'Zona extendida',
                description: 'De 10 a 20 km desde la sucursal',
                price: 6500,
                type: 'distance',
                branch_id: 'branch-mdq',
                min_distance_km: 10,
                max_distance_km: 20,
                enabled: true,
            },
            {
                id: 'arg-general',
                name: 'Envio nacional',
                description: 'Cobertura general fuera del radio local',
                price: 1500,
                type: 'flat',
                enabled: true,
            },
        ],
        branches: [
            {
                id: 'branch-mdq',
                name: 'Sucursal Mar del Plata',
                address: 'Av. Independencia 1234, Mar del Plata',
                hours: 'Lun a Sab 9:00-18:00',
                phone: '',
                pickup_fee: 0,
                latitude: -38.00548,
                longitude: -57.54261,
                enabled: true,
            },
        ],
        bank_transfer: {
            cbu: '',
            alias: '',
            bank: '',
            holder: '',
        },
    },
    };
};

const DEFAULT_SETTINGS = buildDefaultSettings(DEFAULT_TENANT);

export const TenantContext = createContext(null);

function mergeTenantSettings(rawSettings = {}, tenant = DEFAULT_TENANT) {
    const defaults = buildDefaultSettings(tenant, rawSettings);
    const piquim = isPiquimTenantIdentity({ tenant, settings: rawSettings });
    const rawBranding = rawSettings.branding || {};
    const rawFooter = rawBranding.footer || {};

    return {
        branding: {
            ...defaults.branding,
            ...rawBranding,
            name: resolveTenantBrandName({ tenant, settings: rawSettings }),
            design_preset: resolveTenantDesignPreset({ tenant, settings: rawSettings }),
            navbar: {
                ...defaults.branding.navbar,
                ...(rawBranding.navbar || {}),
            },
            footer: {
                ...defaults.branding.footer,
                ...rawFooter,
                socials: {
                    ...defaults.branding.footer.socials,
                    ...(rawFooter.socials || {}),
                },
                contact: {
                    ...defaults.branding.footer.contact,
                    ...(rawFooter.contact || {}),
                },
                quickLinks: Array.isArray(rawFooter.quickLinks)
                    ? rawFooter.quickLinks
                    : defaults.branding.footer.quickLinks,
                shopLinks: Array.isArray(rawFooter.shopLinks)
                    ? rawFooter.shopLinks
                    : defaults.branding.footer.shopLinks,
                helpLinks: Array.isArray(rawFooter.helpLinks)
                    ? rawFooter.helpLinks
                    : defaults.branding.footer.helpLinks,
                legalLinks: Array.isArray(rawFooter.legalLinks)
                    ? rawFooter.legalLinks
                    : defaults.branding.footer.legalLinks,
                socialLinks: Array.isArray(rawFooter.socialLinks)
                    ? rawFooter.socialLinks
                    : defaults.branding.footer.socialLinks,
                newsletter: {
                    ...(defaults.branding.footer.newsletter || {}),
                    ...(rawFooter.newsletter || {}),
                },
            },
            catalog_cards: piquim && Array.isArray(rawBranding.catalog_cards)
                ? rawBranding.catalog_cards
                : defaults.branding.catalog_cards,
        },
        theme: {
            ...defaults.theme,
            ...(rawSettings.theme || {}),
            catalog: {
                ...(defaults.theme.catalog || {}),
                ...(rawSettings.theme?.catalog || {}),
            },
        },
        commerce: {
            ...defaults.commerce,
            ...(rawSettings.commerce || {}),
            price_tier_labels: normalizePriceTierLabels(rawSettings.commerce?.price_tier_labels),
        },
    };
}

export const TenantProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [tenant, setTenant] = useState(DEFAULT_TENANT);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const refreshTenantSettings = useCallback(async ({ withLoader = false } = {}) => {
        if (withLoader) {
            setLoading(true);
        }
        try {
            const editorContext = isEditorContext();
            const headers = editorContext ? await getAdminTenantHeaders(user) : getTenantHeaders();
            const token = editorContext ? localStorage.getItem('teflon_token') : '';
            if (editorContext && !headers['X-Tenant-Id']) {
                setTenant(DEFAULT_TENANT);
                setSettings(DEFAULT_SETTINGS);
                return;
            }

            const response = await fetch(`${getApiBase()}/public/tenant`, {
                headers: {
                    ...headers,
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!response.ok) {
                throw new Error(`Tenant request failed: ${response.status}`);
            }

            const data = await response.json();
            const nextTenant = data.tenant || DEFAULT_TENANT;
            setTenant(nextTenant);
            setSettings(mergeTenantSettings(data.settings || {}, nextTenant));
        } catch (err) {
            console.error('Failed to load tenant settings', err);
            setTenant(DEFAULT_TENANT);
            setSettings(DEFAULT_SETTINGS);
        } finally {
            if (withLoader) {
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        let active = true;

        const fetchTenant = async () => {
            try {
                await refreshTenantSettings({ withLoader: true });
            } catch (err) {
                if (!active) return;
                console.error('Failed to bootstrap tenant settings', err);
            }
        };

        if (!isEditorContext() || !authLoading) {
            fetchTenant();
        }

        const handleRefresh = () => {
            refreshTenantSettings();
        };
        window.addEventListener('tenant-settings-updated', handleRefresh);

        return () => {
            active = false;
            window.removeEventListener('tenant-settings-updated', handleRefresh);
        };
    }, [authLoading, refreshTenantSettings]);

    if (loading) {
        return <StoreSkeleton variant="page" />;
    }

    return (
        <TenantContext.Provider value={{ tenant, settings, refreshTenantSettings }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
