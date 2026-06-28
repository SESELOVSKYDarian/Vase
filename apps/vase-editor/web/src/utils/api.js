const DEFAULT_API_BASE = '';

function getViteEnv() {
    return import.meta.env || {};
}

function getCurrentHostname() {
    if (typeof window === 'undefined') return '';
    return String(window.location.hostname || '').trim().toLowerCase();
}

function getCurrentPathname() {
    if (typeof window === 'undefined') return '';
    return String(window.location.pathname || '').trim().toLowerCase();
}

function getCurrentHost() {
    if (typeof window === 'undefined') return '';
    return String(window.location.host || window.location.hostname || '').trim().toLowerCase();
}

function isLocalHost(hostname = getCurrentHostname()) {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.localhost');
}

export function isEditorContext() {
    const hostname = getCurrentHostname();
    const pathname = getCurrentPathname();
    return hostname.startsWith('editor.') || pathname.startsWith('/admin');
}

function normalizeTenantId(value) {
    const normalized = String(value || '').trim();
    return (normalized === 'undefined' || normalized === 'null') ? '' : normalized;
}

function getStoredUser() {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const rawUser = localStorage.getItem('teflon_user');
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
        return null;
    }
}

function getStoredTenantId() {
    if (typeof window === 'undefined') {
        return '';
    }

    try {
        const storedUser = getStoredUser();
        const userTenantId = normalizeTenantId(storedUser?.tenant_id || storedUser?.tenantId);
        const activeTenant = normalizeTenantId(localStorage.getItem('teflon_active_tenant'));

        if (isEditorContext() && storedUser?.role !== 'master_admin' && userTenantId) {
            return userTenantId;
        }

        return activeTenant || userTenantId;
    } catch (err) {
        return '';
    }
}

function setStoredTenantId(tenantId) {
    if (typeof window === 'undefined') return;
    const normalized = normalizeTenantId(tenantId);
    if (!normalized) return;

    try {
        localStorage.setItem('teflon_active_tenant', normalized);
    } catch (err) {
        // Ignore storage errors; callers will keep working without the persisted tenant.
    }
}

export function getApiBase() {
    const env = getViteEnv();

    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = isLocalHost(hostname);
        const isLocalVite =
            ['localhost', '127.0.0.1'].includes(hostname) &&
            ['5173', '5174', '5175'].includes(window.location.port);
        const isEditor = isEditorContext();

        // On storefront custom domains (not editor, not localhost), always use own origin
        // so that piquim.ar calls piquim.ar, not a hardcoded VITE_API_URL like editor.vase.ar
        if (!isLocal && !isEditor) {
            return window.location.origin.replace(/\/+$/, '');
        }

        if (isLocalVite) {
            return 'http://localhost:4000';
        }
    }

    const configuredBase = String(env.VITE_API_URL || DEFAULT_API_BASE).trim();
    if (!configuredBase) {
        if (typeof window !== 'undefined') {
            return window.location.origin.replace(/\/+$/, '');
        }
        return '';
    }
    return configuredBase.replace(/\/+$/, '');
}

export function getTenantHeaders() {
    const env = getViteEnv();
    const rawEnvId = String(env.VITE_TENANT_ID || '').trim();
    const envId = (rawEnvId === 'undefined' || rawEnvId === 'null') ? '' : rawEnvId;
    const forceEnvTenant = String(env.VITE_FORCE_TENANT_ID || '').trim().toLowerCase() === 'true';
    const allowEnvTenant = Boolean(env.DEV) || isLocalHost() || forceEnvTenant;
    const allowStoredTenant = Boolean(env.DEV) || isLocalHost() || isEditorContext();
    const tenantId = (allowEnvTenant ? envId : '') || (allowStoredTenant ? getStoredTenantId() : '');
    const storefrontHost = !isEditorContext() ? getCurrentHost() : '';
    return {
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
        ...(storefrontHost ? { 'X-Storefront-Host': storefrontHost } : {}),
    };
}

export async function ensureAdminTenantSelection(user = null) {
    if (!isEditorContext()) return '';

    const userTenantId = normalizeTenantId(user?.tenant_id || user?.tenantId);
    if (user?.role !== 'master_admin' && userTenantId) {
        setStoredTenantId(userTenantId);
        return userTenantId;
    }

    const currentTenantId = normalizeTenantId(getTenantHeaders()['X-Tenant-Id']);
    if (currentTenantId) return currentTenantId;

    if (user?.role !== 'master_admin') return '';

    try {
        const token = localStorage.getItem('teflon_token');
        if (!token) return '';

        const res = await fetch(`${getApiBase()}/api/platform/admin/tenants`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) return '';

        const data = await res.json();
        const tenants = Array.isArray(data?.items) ? data.items : [];
        const selectedTenant = tenants.find((tenant) => tenant?.status === 'active') || tenants[0];
        if (!selectedTenant?.id) return '';

        setStoredTenantId(selectedTenant.id);
        return normalizeTenantId(selectedTenant.id);
    } catch (err) {
        return '';
    }
}

export async function getAdminTenantHeaders(user = null) {
    await ensureAdminTenantSelection(user);
    return getTenantHeaders();
}

export function getAuthHeaders() {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}
