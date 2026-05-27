const DEFAULT_API_BASE = 'http://localhost:4000';

export function getApiBase() {
    return import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
}

export function getTenantHeaders() {
    const tenantId = import.meta.env.VITE_TENANT_ID;
    const headers = tenantId ? { 'X-Tenant-Id': tenantId } : {};

    if (typeof window !== 'undefined' && window.location?.hostname) {
        headers['X-Storefront-Host'] = window.location.hostname;
    }

    return headers;
}

export function getAuthHeaders() {
    const token = localStorage.getItem('teflon_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}
