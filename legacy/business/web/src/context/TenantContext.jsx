import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBase, getTenantHeaders } from '../utils/api';
import { DEFAULT_STOREFRONT_LIGHT_THEME } from '../utils/storefrontTheme';
import StoreSkeleton from '../components/StoreSkeleton';

const DEFAULT_TENANT = {
    id: 'demo-tenant-id',
    name: 'Sanitarios El Teflon',
};

const DEFAULT_SETTINGS = {
    branding: {
        name: 'Sanitarios El Teflon',
        logo_url: '',
        navbar: {
            links: [
                { label: 'Inicio', href: '/' },
                { label: 'Catálogo', href: '/catalog' },
            ],
        },
        footer: {
            description: '',
            whatsapp_enabled: true,
            socials: {
                facebook: '',
                instagram: '',
                whatsapp: '',
            },
            contact: {
                address: '',
                phone: '',
                email: '',
            },
            quickLinks: [
                { label: 'Productos', href: '/catalog' },
                { label: 'Sobre nosotros', href: '/about' },
            ],
        },
    },
    theme: {
        ...DEFAULT_STOREFRONT_LIGHT_THEME,
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
        order_notification_email: '',
        admin_order_confirmation_label: 'En confirmacion',
        customer_order_processing_label: 'En proceso',
        admin_order_confirmation_text: 'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.',
        customer_order_processing_text: 'Tu pedido fue recibido y se encuentra en proceso.',
        tax_rate: 0.21,
        shipping_flat: 1500,
        free_shipping_threshold: 999,
        payment_methods: ['transfer', 'cash_on_pickup'],
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

const TenantContext = createContext(null);

function mergeTenantSettings(rawSettings = {}) {
    const rawBranding = rawSettings.branding || {};
    const rawFooter = rawBranding.footer || {};

    return {
        branding: {
            ...DEFAULT_SETTINGS.branding,
            ...rawBranding,
            navbar: {
                ...DEFAULT_SETTINGS.branding.navbar,
                ...(rawBranding.navbar || {}),
            },
            footer: {
                ...DEFAULT_SETTINGS.branding.footer,
                ...rawFooter,
                socials: {
                    ...DEFAULT_SETTINGS.branding.footer.socials,
                    ...(rawFooter.socials || {}),
                },
                contact: {
                    ...DEFAULT_SETTINGS.branding.footer.contact,
                    ...(rawFooter.contact || {}),
                },
                quickLinks: Array.isArray(rawFooter.quickLinks)
                    ? rawFooter.quickLinks
                    : DEFAULT_SETTINGS.branding.footer.quickLinks,
            },
        },
        theme: {
            ...DEFAULT_SETTINGS.theme,
            ...(rawSettings.theme || {}),
        },
        commerce: {
            ...DEFAULT_SETTINGS.commerce,
            ...(rawSettings.commerce || {}),
        },
    };
}

export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState(DEFAULT_TENANT);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const refreshTenantSettings = useCallback(async ({ withLoader = false } = {}) => {
        if (withLoader) {
            setLoading(true);
        }
        try {
            const response = await fetch(`${getApiBase()}/public/tenant`, {
                headers: getTenantHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Tenant request failed: ${response.status}`);
            }

            const data = await response.json();
            setTenant(data.tenant || DEFAULT_TENANT);
            setSettings(mergeTenantSettings(data.settings || {}));
        } catch (err) {
            console.error('Failed to load tenant settings', err);
            setTenant(DEFAULT_TENANT);
            setSettings(DEFAULT_SETTINGS);
        } finally {
            if (withLoader) {
                setLoading(false);
            }
        }
    }, []);

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

        fetchTenant();

        const handleRefresh = () => {
            refreshTenantSettings();
        };
        window.addEventListener('tenant-settings-updated', handleRefresh);

        return () => {
            active = false;
            window.removeEventListener('tenant-settings-updated', handleRefresh);
        };
    }, [refreshTenantSettings]);

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
