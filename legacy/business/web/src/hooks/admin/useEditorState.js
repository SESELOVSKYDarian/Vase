import { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiBase, getTenantHeaders } from '../../utils/api';
import { DEFAULT_ABOUT_SECTIONS, DEFAULT_HOME_SECTIONS } from '../../data/defaultSections';
import { useTenant } from '../../context/TenantContext';
import {
    DEFAULT_ADMIN_PANEL_BRANDING,
    DEFAULT_ADMIN_PANEL_THEME,
} from '../../utils/adminPanelTheme';
import { DEFAULT_STOREFRONT_LIGHT_THEME } from '../../utils/storefrontTheme';

const RESERVED_PLACEHOLDER_TERMS = new Set(['messi']);

const normalizePlaceholderValue = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const isReservedPlaceholder = (value) => RESERVED_PLACEHOLDER_TERMS.has(normalizePlaceholderValue(value));

const getNavbarLinkLabel = (link) => {
    if (typeof link === 'string') return link;
    return link?.label || link?.href || link?.path || '';
};

const getCategoryDepth = (category, byId, visited = new Set()) => {
    const categoryId = category?.id;
    const parentId = category?.parent_id;
    if (!categoryId || !parentId || visited.has(categoryId) || !byId.has(parentId)) return 0;
    visited.add(categoryId);
    return 1 + getCategoryDepth(byId.get(parentId), byId, visited);
};

const sortCategoriesForCleanup = (items) => {
    const byId = new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]));
    return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
        const depthDiff = getCategoryDepth(b, byId) - getCategoryDepth(a, byId);
        if (depthDiff !== 0) return depthDiff;
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' });
    });
};

export function useEditorState(user) {
    const { refreshTenantSettings } = useTenant();

    // Core State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [settings, setSettings] = useState({
        branding: {
            name: '',
            logo_url: '',
            admin_panel: DEFAULT_ADMIN_PANEL_BRANDING,
            navbar: { links: [] },
            footer: { description: '', socials: {}, contact: {}, quickLinks: [] }
        },
        theme: {
            ...DEFAULT_STOREFRONT_LIGHT_THEME,
            admin_panel: DEFAULT_ADMIN_PANEL_THEME,
        },
        commerce: {
            price_visibility: 'authenticated',
            whatsapp_number: '',
            email: '',
            address: '',
            order_notification_email: '',
            admin_order_confirmation_label: 'En confirmacion',
            customer_order_processing_label: 'En proceso',
            admin_order_confirmation_text: 'Tienes un pedido en confirmacion. Revisa el panel de usuarios y confirma la compra.',
            customer_order_processing_text: 'Tu pedido fue recibido y se encuentra en proceso.',
            payment_methods: ['transfer', 'cash_on_pickup'],
            shipping_zones: [],
            branches: [],
            price_adjustments: {
                retail_percent: 0,
                wholesale_percent: 0,
                promo_enabled: false,
                promo_percent: 0,
                promo_scope: 'both',
                promo_label: 'Oferta',
            },
        }
    });

    const [pageSections, setPageSections] = useState({
        home: DEFAULT_HOME_SECTIONS,
        about: DEFAULT_ABOUT_SECTIONS,
    });

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [offers, setOffers] = useState([]);

    const cleanupReservedCatalogEntries = useCallback(async ({ headers, settingsData, categoriesData, brandsData }) => {
        let changed = false;

        const nextSettings = settingsData?.settings ? {
            ...settingsData.settings,
            branding: {
                ...(settingsData.settings.branding || {}),
                navbar: {
                    ...((settingsData.settings.branding || {}).navbar || {}),
                    links: Array.isArray(settingsData.settings?.branding?.navbar?.links)
                        ? settingsData.settings.branding.navbar.links.filter((link) => !isReservedPlaceholder(getNavbarLinkLabel(link)))
                        : [],
                },
            },
        } : null;

        const currentNavbarLinks = Array.isArray(settingsData?.settings?.branding?.navbar?.links)
            ? settingsData.settings.branding.navbar.links
            : [];
        const cleanedNavbarLinks = Array.isArray(nextSettings?.branding?.navbar?.links)
            ? nextSettings.branding.navbar.links
            : [];

        if (nextSettings && currentNavbarLinks.length !== cleanedNavbarLinks.length) {
            const updateSettingsRes = await fetch(`${getApiBase()}/tenant/settings`, {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(nextSettings),
            });
            if (updateSettingsRes.ok) {
                changed = true;
            } else {
                console.error('Failed to remove reserved navbar links from tenant settings');
            }
        }

        const categoriesToDelete = sortCategoriesForCleanup(
            (Array.isArray(categoriesData) ? categoriesData : []).filter((item) => isReservedPlaceholder(item?.name))
        );
        for (const category of categoriesToDelete) {
            if (!category?.id) continue;
            const deleteRes = await fetch(`${getApiBase()}/tenant/categories/${category.id}`, {
                method: 'DELETE',
                headers,
            });
            if (deleteRes.ok || deleteRes.status === 404) {
                changed = true;
                continue;
            }
            console.error(`Failed to remove reserved category "${category.name}"`);
        }

        const brandsToDelete = (Array.isArray(brandsData) ? brandsData : []).filter((item) => isReservedPlaceholder(item));
        for (const brandName of brandsToDelete) {
            const deleteRes = await fetch(`${getApiBase()}/tenant/brands/${encodeURIComponent(brandName)}`, {
                method: 'DELETE',
                headers,
            });
            if (deleteRes.ok || deleteRes.status === 404) {
                changed = true;
                continue;
            }
            console.error(`Failed to remove reserved brand "${brandName}"`);
        }

        if (!changed) {
            return {
                changed: false,
                settingsPayload: settingsData,
                categoriesPayload: categoriesData,
                brandsPayload: brandsData,
            };
        }

        const [freshSettingsRes, freshCategoriesRes, freshBrandsRes] = await Promise.all([
            fetch(`${getApiBase()}/tenant/settings`, { headers }),
            fetch(`${getApiBase()}/tenant/categories`, { headers }),
            fetch(`${getApiBase()}/tenant/brands`, { headers }),
        ]);

        const [freshSettingsPayload, freshCategoriesPayload, freshBrandsPayload] = await Promise.all([
            freshSettingsRes.ok ? freshSettingsRes.json() : Promise.resolve(settingsData),
            freshCategoriesRes.ok ? freshCategoriesRes.json() : Promise.resolve(categoriesData),
            freshBrandsRes.ok ? freshBrandsRes.json() : Promise.resolve(brandsData),
        ]);

        return {
            changed: true,
            settingsPayload: freshSettingsPayload,
            categoriesPayload: freshCategoriesPayload,
            brandsPayload: freshBrandsPayload,
        };
    }, []);

    // Logic for loading all data (extracted from EditorPage.jsx)
    const loadAllData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = { ...getTenantHeaders(), 'Authorization': `Bearer ${token}` };

            const [settingsRes, homeRes, aboutRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
                fetch(`${getApiBase()}/tenant/settings`, { headers }),
                fetch(`${getApiBase()}/tenant/pages/home`, { headers }),
                fetch(`${getApiBase()}/tenant/pages/about`, { headers }),
                fetch(`${getApiBase()}/tenant/products`, { headers }),
                fetch(`${getApiBase()}/tenant/categories`, { headers }),
                fetch(`${getApiBase()}/tenant/brands`, { headers })
            ]);

            let settingsPayload = null;
            let categoriesPayload = [];
            let brandsPayload = [];

            if (settingsRes.ok) {
                settingsPayload = await settingsRes.json();
            }

            if (categoriesRes.ok) {
                const data = await categoriesRes.json();
                categoriesPayload = Array.isArray(data) ? data : [];
            }

            if (brandsRes.ok) {
                const data = await brandsRes.json();
                brandsPayload = Array.isArray(data) ? data : [];
            }

            const cleanupResult = await cleanupReservedCatalogEntries({
                headers,
                settingsData: settingsPayload,
                categoriesData: categoriesPayload,
                brandsData: brandsPayload,
            });

            settingsPayload = cleanupResult.settingsPayload;
            categoriesPayload = Array.isArray(cleanupResult.categoriesPayload) ? cleanupResult.categoriesPayload : [];
            brandsPayload = Array.isArray(cleanupResult.brandsPayload) ? cleanupResult.brandsPayload : [];

            if (cleanupResult.changed) {
                await refreshTenantSettings();
            }

            if (settingsPayload) {
                const data = settingsPayload;
                setSettings(prev => ({
                    ...prev,
                    ...data.settings,
                    branding: {
                        ...prev.branding,
                        ...(data.settings?.branding || {}),
                        admin_panel: {
                            ...DEFAULT_ADMIN_PANEL_BRANDING,
                            ...(prev.branding?.admin_panel || {}),
                            ...(data.settings?.branding?.admin_panel || {}),
                        },
                    },
                    theme: {
                        ...prev.theme,
                        ...(data.settings?.theme || {}),
                        admin_panel: {
                            ...DEFAULT_ADMIN_PANEL_THEME,
                            ...(prev.theme?.admin_panel || {}),
                            ...(data.settings?.theme?.admin_panel || {}),
                        },
                    },
                    commerce: { ...prev.commerce, ...(data.settings?.commerce || {}) }
                }));
            }

            if (homeRes.ok) {
                const data = await homeRes.json();
                if (Array.isArray(data.sections)) setPageSections(prev => ({ ...prev, home: data.sections }));
            }

            if (aboutRes.ok) {
                const data = await aboutRes.json();
                if (Array.isArray(data.sections)) setPageSections(prev => ({ ...prev, about: data.sections }));
            }

            if (productsRes.ok) {
                const data = await productsRes.json();
                setProducts(data.items || []);
            }

            setCategories(categoriesPayload || []);
            setBrands(brandsPayload);

        } catch (err) {
            console.error("Failed to load editor data", err);
        } finally {
            setLoading(false);
        }
    }, [cleanupReservedCatalogEntries, refreshTenantSettings]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Save All Logic (extracted from EditorPage.jsx)
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const settingsRes = await fetch(`${getApiBase()}/tenant/settings`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(settings)
            });

            const savePage = async (slug, sectionsData) => {
                const saveRes = await fetch(`${getApiBase()}/tenant/pages/${slug}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ sections: sectionsData || [] })
                });
                if (!saveRes.ok) return { ok: false };
                const publishRes = await fetch(`${getApiBase()}/tenant/pages/${slug}/publish`, {
                    method: 'POST',
                    headers
                });
                return { ok: true, published: publishRes.ok };
            };

            const [homeRes, aboutRes] = await Promise.all([
                savePage('home', pageSections.home),
                savePage('about', pageSections.about),
            ]);

            if (settingsRes.ok) await refreshTenantSettings();

            return {
                success: settingsRes.ok && homeRes.ok && aboutRes.ok,
                published: homeRes.published && aboutRes.published
            };
        } catch (err) {
            console.error('Save all failed', err);
            return { success: false, error: err };
        } finally {
            setSaving(false);
        }
    };

    const saveCheckoutSettings = useCallback(async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const headers = {
                ...getTenantHeaders(),
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const response = await fetch(`${getApiBase()}/api/admin/settings/checkout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(settings?.commerce || {})
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                return { success: false, error: payload?.error || `checkout_save_${response.status}` };
            }

            await refreshTenantSettings();
            await loadAllData();

            return { success: true, published: false };
        } catch (err) {
            console.error('Checkout save failed', err);
            return { success: false, error: err };
        } finally {
            setSaving(false);
        }
    }, [loadAllData, refreshTenantSettings, settings]);

    const saveShippingSettings = saveCheckoutSettings;

    // Derived State
    const categoryHierarchy = useMemo(() => {
        if (!Array.isArray(categories) || !categories.length) return [];
        const byId = new Map();
        categories.forEach((item) => {
            if (!item?.id || !item?.name) return;
            byId.set(item.id, { ...item, children: [] });
        });
        const roots = [];
        byId.forEach((node) => {
            if (node.parent_id && byId.has(node.parent_id)) {
                byId.get(node.parent_id).children.push(node);
            } else {
                roots.push(node);
            }
        });
        return roots;
    }, [categories]);

    return {
        loading,
        saving,
        activeTab,
        setActiveTab,
        settings,
        setSettings,
        pageSections,
        setPageSections,
        products,
        setProducts,
        categories,
        categoryHierarchy,
        setCategories,
        brands,
        setBrands,
        handleSaveAll,
        saveCheckoutSettings,
        saveShippingSettings,
        refresh: loadAllData
    };
}
