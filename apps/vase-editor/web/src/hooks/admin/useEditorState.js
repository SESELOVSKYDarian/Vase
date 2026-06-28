import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAdminTenantHeaders, getApiBase, getTenantHeaders } from '../../utils/api';
import {
    DEFAULT_ABOUT_SECTIONS,
    DEFAULT_HOME_SECTIONS,
    PIQUIM_ABOUT_SECTIONS,
    PIQUIM_HOME_SECTIONS,
    mergeSectionsWithDefaults,
} from '../../data/defaultSections';
import { useTenant } from '../../context/TenantContext';
import {
    DEFAULT_ADMIN_PANEL_BRANDING,
    DEFAULT_ADMIN_PANEL_THEME,
} from '../../utils/adminPanelTheme';
import { DEFAULT_STOREFRONT_LIGHT_THEME } from '../../utils/storefrontTheme';
import { PIQUIM_CATALOG_CARDS, PIQUIM_FOOTER_DEFAULTS } from '../../data/piquimBranding';
import { normalizePriceTierLabels } from '../../utils/priceTierLabels';
import { isPiquimTenantIdentity, resolveTenantDesignPreset } from '../../utils/tenantBranding';

const RESERVED_PLACEHOLDER_TERMS = new Set(['messi']);

const normalizePlaceholderValue = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const isReservedPlaceholder = (value) => RESERVED_PLACEHOLDER_TERMS.has(normalizePlaceholderValue(value));

const PIQUIM_SECTION_TYPES = new Set(PIQUIM_HOME_SECTIONS.map((section) => section.type));
const PIQUIM_ABOUT_SECTION_TYPES = new Set(PIQUIM_ABOUT_SECTIONS.map((section) => section.type));
const GENERIC_FOOTER_DEFAULTS = {
    description: 'Catalogo, pedidos y atencion comercial desde una tienda online personalizada.',
    shopLinks: [
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Nosotros', href: '/about' },
    ],
    helpLinks: [{ label: 'Terminos', href: '/terms' }],
    legalLinks: [{ label: 'Terminos y condiciones', href: '/terms' }],
    newsletter: { enabled: false },
    legalText: '(c) 2026 Vase Business. Todos los derechos reservados.',
};

const normalizeHomeSectionsForBrand = (settings = {}, tenant = null, sections = []) => {
    const source = Array.isArray(sections) ? sections : [];
    if (!isPiquimTenantIdentity({ tenant, settings })) {
        const nonPiquimSections = source.filter((section) => !PIQUIM_SECTION_TYPES.has(section?.type));
        return nonPiquimSections.length ? mergeSectionsWithDefaults('home', nonPiquimSections) : DEFAULT_HOME_SECTIONS;
    }

    const hasPiquimBlocks = source.some((section) => PIQUIM_SECTION_TYPES.has(section?.type));
    if (!source.length || !hasPiquimBlocks) {
        return PIQUIM_HOME_SECTIONS;
    }
    return mergeSectionsWithDefaults('piquim-home', source);
};

const STANDARD_ABOUT_SECTION_TYPES = new Set([
    'AboutHero',
    'AboutMission',
    'AboutStats',
    'AboutValues',
    'AboutTeam',
    'AboutCTA',
]);

const LEGACY_PIQUIM_ABOUT_SECTION_TYPES = new Set([
    'PiquimHero',
    'PiquimAnnounceBar',
    'PiquimTresMundos',
    'PiquimCatalog3Panel',
    'PiquimCTABanner',
]);

const normalizeAboutSectionsForBrand = (settings = {}, tenant = null, sections = []) => {
    const source = Array.isArray(sections) ? sections : [];
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
    const pageKey = isPiquim ? 'piquim-about' : 'about';

    if (pageKey === 'about') {
        const nonPiquimSections = source.filter((section) => !LEGACY_PIQUIM_ABOUT_SECTION_TYPES.has(section?.type));
        return nonPiquimSections.length ? mergeSectionsWithDefaults('about', nonPiquimSections) : DEFAULT_ABOUT_SECTIONS;
    }

    const standardSections = source.filter((section) => STANDARD_ABOUT_SECTION_TYPES.has(section?.type));
    if (!standardSections.length) {
        return PIQUIM_ABOUT_SECTIONS;
    }
    return mergeSectionsWithDefaults('piquim-about', standardSections);
};

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
    const { tenant, refreshTenantSettings } = useTenant();
    const HISTORY_LIMIT = 80;

    // Core State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [settings, rawSetSettings] = useState({
        branding: {
            name: '',
            logo_url: '',
            design_preset: 'generic',
            catalog_cards: [],
            admin_panel: DEFAULT_ADMIN_PANEL_BRANDING,
            navbar: { links: [] },
            footer: {
                ...GENERIC_FOOTER_DEFAULTS,
                socialLinks: [],
                socials: {},
                contact: {},
                quickLinks: GENERIC_FOOTER_DEFAULTS.shopLinks,
            }
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
                price_tier_labels: normalizePriceTierLabels(),
            }
        });

    const [pageSections, rawSetPageSections] = useState({
        home: DEFAULT_HOME_SECTIONS,
        about: DEFAULT_ABOUT_SECTIONS,
    });

    const [products, rawSetProducts] = useState([]);
    const [categories, rawSetCategories] = useState([]);
    const [brands, rawSetBrands] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [offers, setOffers] = useState([]);
    const [historyPast, setHistoryPast] = useState([]);
    const [historyFuture, setHistoryFuture] = useState([]);
    const isApplyingHistoryRef = useRef(false);
    const settingsRef = useRef(settings);
    const pageSectionsRef = useRef(pageSections);
    const productsRef = useRef(products);
    const categoriesRef = useRef(categories);
    const brandsRef = useRef(brands);

    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { pageSectionsRef.current = pageSections; }, [pageSections]);
    useEffect(() => { productsRef.current = products; }, [products]);
    useEffect(() => { categoriesRef.current = categories; }, [categories]);
    useEffect(() => { brandsRef.current = brands; }, [brands]);

    const deepClone = useCallback((value) => {
        if (typeof structuredClone === 'function') return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
    }, []);

    const snapshotState = useCallback(() => ({
        settings: deepClone(settingsRef.current),
        pageSections: deepClone(pageSectionsRef.current),
        products: deepClone(productsRef.current),
        categories: deepClone(categoriesRef.current),
        brands: deepClone(brandsRef.current),
    }), [deepClone]);

    const applySnapshot = useCallback((snapshot) => {
        if (!snapshot) return;
        isApplyingHistoryRef.current = true;
        rawSetSettings(snapshot.settings);
        rawSetPageSections(snapshot.pageSections);
        rawSetProducts(snapshot.products);
        rawSetCategories(snapshot.categories);
        rawSetBrands(snapshot.brands);
        setTimeout(() => {
            isApplyingHistoryRef.current = false;
        }, 0);
    }, []);

    const pushHistorySnapshot = useCallback(() => {
        if (isApplyingHistoryRef.current) return;
        const snapshot = snapshotState();
        setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), snapshot]);
        setHistoryFuture([]);
    }, [snapshotState]);

    const setSettings = useCallback((updater) => {
        pushHistorySnapshot();
        rawSetSettings((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    }, [pushHistorySnapshot]);

    const setPageSections = useCallback((updater) => {
        pushHistorySnapshot();
        rawSetPageSections((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    }, [pushHistorySnapshot]);

    const setProducts = useCallback((updater) => {
        pushHistorySnapshot();
        rawSetProducts((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    }, [pushHistorySnapshot]);

    const setCategories = useCallback((updater) => {
        pushHistorySnapshot();
        rawSetCategories((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    }, [pushHistorySnapshot]);

    const setBrands = useCallback((updater) => {
        pushHistorySnapshot();
        rawSetBrands((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    }, [pushHistorySnapshot]);

    const undo = useCallback(() => {
        if (!historyPast.length) return false;
        const previous = historyPast[historyPast.length - 1];
        const current = snapshotState();
        setHistoryPast((prev) => prev.slice(0, -1));
        setHistoryFuture((prev) => [current, ...prev].slice(0, HISTORY_LIMIT));
        applySnapshot(previous);
        return true;
    }, [applySnapshot, historyPast, snapshotState]);

    const redo = useCallback(() => {
        if (!historyFuture.length) return false;
        const next = historyFuture[0];
        const current = snapshotState();
        setHistoryFuture((prev) => prev.slice(1));
        setHistoryPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), current]);
        applySnapshot(next);
        return true;
    }, [applySnapshot, historyFuture, snapshotState]);

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
            const tenantHeaders = await getAdminTenantHeaders(user);
            if (!tenantHeaders['X-Tenant-Id']) {
                console.warn('No active tenant selected for editor data load.');
                return;
            }
            const headers = { ...tenantHeaders, 'Authorization': `Bearer ${token}` };

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

            const loadedSettings = settingsPayload?.settings || settingsRef.current;

            if (settingsPayload) {
                const data = settingsPayload;
                const piquimTenant = isPiquimTenantIdentity({ tenant, settings: data.settings });
                const footerDefaults = piquimTenant ? PIQUIM_FOOTER_DEFAULTS : GENERIC_FOOTER_DEFAULTS;
                rawSetSettings(prev => ({
                    ...prev,
                    ...data.settings,
                    branding: {
                        ...prev.branding,
                        ...(data.settings?.branding || {}),
                        design_preset: resolveTenantDesignPreset({ tenant, settings: data.settings }),
                        catalog_cards: Array.isArray(data.settings?.branding?.catalog_cards)
                            ? data.settings.branding.catalog_cards
                            : (piquimTenant ? PIQUIM_CATALOG_CARDS : []),
                        footer: {
                            ...footerDefaults,
                            ...(data.settings?.branding?.footer || {}),
                            newsletter: {
                                ...(footerDefaults.newsletter || {}),
                                ...((data.settings?.branding?.footer || {}).newsletter || {}),
                            },
                        },
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
                    commerce: {
                        ...prev.commerce,
                        ...(data.settings?.commerce || {}),
                        price_tier_labels: normalizePriceTierLabels(data.settings?.commerce?.price_tier_labels),
                    }
                }));
            }

            if (homeRes.ok) {
                const data = await homeRes.json();
                if (Array.isArray(data.sections)) {
                    rawSetPageSections(prev => ({
                        ...prev,
                        home: normalizeHomeSectionsForBrand(loadedSettings, tenant, data.sections),
                    }));
                }
            } else {
                rawSetPageSections(prev => ({
                    ...prev,
                    home: normalizeHomeSectionsForBrand(loadedSettings, tenant, []),
                }));
            }

            if (aboutRes.ok) {
                const data = await aboutRes.json();
                if (Array.isArray(data.sections)) {
                    rawSetPageSections(prev => ({
                        ...prev,
                        about: normalizeAboutSectionsForBrand(loadedSettings, tenant, data.sections),
                    }));
                }
            } else {
                rawSetPageSections(prev => ({
                    ...prev,
                    about: normalizeAboutSectionsForBrand(loadedSettings, tenant, []),
                }));
            }

            if (productsRes.ok) {
                const data = await productsRes.json();
                rawSetProducts(data.items || []);
            }

            rawSetCategories(categoriesPayload || []);
            rawSetBrands(brandsPayload);
            setHistoryPast([]);
            setHistoryFuture([]);

        } catch (err) {
            console.error("Failed to load editor data", err);
        } finally {
            setLoading(false);
        }
    }, [cleanupReservedCatalogEntries, refreshTenantSettings, tenant, user]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Save All Logic (extracted from EditorPage.jsx)
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('teflon_token');
            const tenantHeaders = await getAdminTenantHeaders(user);
            if (!tenantHeaders['X-Tenant-Id']) {
                return { success: false, code: 'tenant_required', error: 'tenant_required' };
            }
            const headers = {
                ...tenantHeaders,
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
            const tenantHeaders = await getAdminTenantHeaders(user);
            if (!tenantHeaders['X-Tenant-Id']) {
                return { success: false, code: 'tenant_required', error: 'tenant_required' };
            }
            const headers = {
                ...tenantHeaders,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const currentTenantId = tenantHeaders['X-Tenant-Id'];
            const response = await fetch(`${getApiBase()}/api/admin/settings/checkout`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    ...(settings?.commerce || {}),
                    tenant_id: currentTenantId
                })
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const code = payload?.code || payload?.error;

                if (code === 'tenant_not_found' || response.status === 404) {
                    try {
                        localStorage.removeItem('teflon_active_tenant');
                    } catch (storageErr) {
                        console.warn('No se pudo limpiar teflon_active_tenant', storageErr);
                    }
                    return {
                        success: false,
                        code: 'tenant_not_found',
                        error: 'tenant_not_found',
                        details:
                            payload?.details ||
                            'El sitio seleccionado ya no existe. Volve a Empresas y elegi un sitio valido.',
                    };
                }

                return {
                    success: false,
                    code,
                    error: payload?.error || `checkout_save_${response.status}`,
                    details: payload?.details,
                };
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
    }, [loadAllData, refreshTenantSettings, settings, user]);

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
        undo,
        redo,
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
        handleSaveAll,
        saveCheckoutSettings,
        saveShippingSettings,
        refresh: loadAllData
    };
}
