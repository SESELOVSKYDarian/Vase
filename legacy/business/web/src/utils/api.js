const DEFAULT_API_BASE = 'http://localhost:4000';

export function getApiBase() {
    return import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
}

export function getTenantHeaders() {
    const tenantId = import.meta.env.VITE_TENANT_ID;
    return tenantId ? { 'X-Tenant-Id': tenantId } : {};
}

export function getAuthHeaders() {
    const token = localStorage.getItem('teflon_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}
