// Parte de TenantContext.jsx: mergeTenantSettings, TenantProvider, useTenant.
import { useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { getAdminTenantHeaders, getApiBase, getTenantHeaders, isEditorContext } from '../../utils/api';
import { normalizePriceTierLabels } from '../../utils/priceTierLabels';
import { isPiquimTenantIdentity, resolveTenantBrandName, resolveTenantDesignPreset } from '../../utils/tenantBranding';
import StoreSkeleton from '../../components/StoreSkeleton';
import { normalizeSeoSettings } from '../../utils/seo';
import { DEFAULT_SETTINGS, DEFAULT_TENANT, TenantContext, buildDefaultSettings } from './build-default-settings.js';

export function mergeTenantSettings(rawSettings = {}, tenant = DEFAULT_TENANT) {
    const defaults = buildDefaultSettings(tenant, rawSettings);
    const piquim = isPiquimTenantIdentity({ tenant, settings: rawSettings });
    const rawBranding = rawSettings.branding || {};
    const rawFooter = rawBranding.footer || {};
    const rawSeo = rawSettings.seo || {};

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
        seo: normalizeSeoSettings(rawSeo),
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
        // En la tienda: pantalla en blanco del color del tema (el esqueleto gris parecia otra pagina).
        return isEditorContext() ? <StoreSkeleton variant="page" /> : <div className="tenant-loading" aria-busy="true" />;
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
