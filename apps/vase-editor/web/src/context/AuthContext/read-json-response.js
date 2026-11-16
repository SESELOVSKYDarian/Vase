// Parte de AuthContext.jsx: AuthContext, readJsonResponse, getRequestTenantId, buildTenantJsonHeaders, withTenantId.
import { createContext } from 'react';
import { getTenantHeaders } from '../../utils/api';

export const AuthContext = createContext(null);

export async function readJsonResponse(response, fallbackError = 'request_failed') {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`${fallbackError}_${response.status}_invalid_json`);
    }
}

export function getRequestTenantId() {
    const tenantHeaders = getTenantHeaders();
    return String(tenantHeaders['X-Tenant-Id'] || '').trim();
}

export function buildTenantJsonHeaders() {
    const tenantId = getRequestTenantId();
    return {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    };
}

export function withTenantId(payload = {}) {
    const tenantId = getRequestTenantId();
    return tenantId ? { ...payload, tenant_id: tenantId } : payload;
}
