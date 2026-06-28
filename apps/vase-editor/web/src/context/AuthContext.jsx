import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBase, getTenantHeaders } from '../utils/api';
import { isExternalAuthEnabled } from '../utils/vaseAuth';

const AuthContext = createContext(null);

async function readJsonResponse(response, fallbackError = 'request_failed') {
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

function getRequestTenantId() {
    const tenantHeaders = getTenantHeaders();
    return String(tenantHeaders['X-Tenant-Id'] || '').trim();
}

function buildTenantJsonHeaders() {
    const tenantId = getRequestTenantId();
    return {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    };
}

function withTenantId(payload = {}) {
    const tenantId = getRequestTenantId();
    return tenantId ? { ...payload, tenant_id: tenantId } : payload;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = () => {
        setUser(null);
        localStorage.removeItem('teflon_token');
        localStorage.removeItem('teflon_user');
        localStorage.removeItem('teflon_active_tenant');
    };

    const persistSession = (token, nextUser) => {
        setUser(nextUser || null);
        localStorage.setItem('teflon_token', token);
        localStorage.setItem('teflon_user', JSON.stringify(nextUser || null));

        const tenantId = String(nextUser?.tenant_id || nextUser?.tenantId || '').trim();
        if (tenantId && tenantId !== 'undefined' && tenantId !== 'null' && nextUser?.role !== 'master_admin') {
            localStorage.setItem('teflon_active_tenant', tenantId);
        }
    };

    const replaceBrowserUrl = (nextUrl) => {
        if (typeof window === 'undefined') return;
        window.history.replaceState({}, document.title, nextUrl);
    };

    const removeLaunchTokenFromUrl = () => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (!url.searchParams.has('vase_token')) return;
        url.searchParams.delete('vase_token');
        replaceBrowserUrl(`${url.pathname}${url.search}${url.hash}`);
    };

    const dispatchTenantRefresh = () => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event('tenant-settings-updated'));
    };

    const exchangeVaseSession = async (launchToken) => {
        const response = await fetch(`${getApiBase()}/auth/exchange-vase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: launchToken }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error || `exchange_vase_${response.status}`);
        }

        return response.json();
    };

    const isTokenExpired = (token) => {
        try {
            const payloadPart = token.split('.')[1];
            if (!payloadPart) return false;
            const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
            const payload = JSON.parse(atob(padded));
            if (!payload?.exp) return false;
            const now = Math.floor(Date.now() / 1000);
            return payload.exp <= now;
        } catch (err) {
            return false;
        }
    };

    useEffect(() => {
        let active = true;

        const bootstrapSession = async () => {
            const launchToken =
                typeof window !== 'undefined'
                    ? new URL(window.location.href).searchParams.get('vase_token')
                    : null;

            if (launchToken && isExternalAuthEnabled()) {
                try {
                    const data = await exchangeVaseSession(launchToken);
                    if (!active) return;
                    persistSession(data.token, data.user || null);
                    removeLaunchTokenFromUrl();
                    dispatchTenantRefresh();
                    setLoading(false);
                    return;
                } catch (err) {
                    if (!active) return;
                    clearSession();
                    removeLaunchTokenFromUrl();
                    sessionStorage.setItem(
                        'teflon_auth_notice',
                        'No pudimos validar el acceso desde Vase. Intenta nuevamente.'
                    );
                    setLoading(false);
                    return;
                }
            }

            if (launchToken) {
                removeLaunchTokenFromUrl();
            }

            const storedUser = localStorage.getItem('teflon_user');
            const token = localStorage.getItem('teflon_token');
            if (!storedUser || !token || token === 'null' || token === 'undefined') {
                if (active) setLoading(false);
                return;
            }

            if (isTokenExpired(token)) {
                clearSession();
                if (active) setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${getApiBase()}/api/me`, {
                    headers: {
                        ...getTenantHeaders(),
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`me_${response.status}`);
                }

                const data = await response.json();
                const nextUser = data?.user || JSON.parse(storedUser);
                if (!active) return;
                persistSession(token, nextUser);
            } catch (err) {
                if (!active) return;
                clearSession();
            } finally {
                if (active) setLoading(false);
            }
        };

        bootstrapSession();

        return () => {
            active = false;
        };
    }, []);

    const login = async (email, password) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }

        const rawEmail = String(email || '').trim();
        const normalizedEmail = rawEmail;

        const response = await fetch(`${getApiBase()}/auth/login`, {
            method: 'POST',
            headers: buildTenantJsonHeaders(),
            body: JSON.stringify(withTenantId({
                email: normalizedEmail,
                password,
            })),
        });

        const data = await readJsonResponse(response, 'login_failed');

        if (!response.ok) {
            throw new Error(data?.error || `login_failed_${response.status}`);
        }

        if (!data?.token || !data?.user) {
            throw new Error(`login_empty_response_${response.status}`);
        }

        persistSession(data.token, data.user);
        return data;
    };

    const requestLoginCode = async (email) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }
        const rawEmail = String(email || '').trim();
        const normalizedEmail = rawEmail.toLowerCase() === 'admin'
            ? rawEmail
            : rawEmail.toLowerCase();

        const response = await fetch(`${getApiBase()}/auth/request-login-code`, {
            method: 'POST',
            headers: buildTenantJsonHeaders(),
            body: JSON.stringify(withTenantId({
                email: normalizedEmail,
            })),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'request_login_code_failed');
        }
        return response.json();
    };

    const loginWithCode = async (email, code) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }
        const rawEmail = String(email || '').trim();
        const normalizedEmail = rawEmail.toLowerCase() === 'admin'
            ? rawEmail
            : rawEmail.toLowerCase();
        const response = await fetch(`${getApiBase()}/auth/login-with-code`, {
            method: 'POST',
            headers: buildTenantJsonHeaders(),
            body: JSON.stringify(withTenantId({
                email: normalizedEmail,
                code: String(code || '').trim(),
            })),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'login_with_code_failed');
        }
        const data = await response.json();
        persistSession(data.token, data.user);
        return data;
    };

    const signup = async (input = {}) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }

        const tenantId = getRequestTenantId();

        const payload = {
            email: input.email,
            password: input.password,
            role: input.role,
            name: input.name,
            phone: input.phone,
            address: input.address,
            address_extra: input.address_extra,
            country_code: input.country_code,
            country_label: input.country_label,
            province: input.province,
            city: input.city,
            postal_code: input.postal_code,
            business_name: input.business_name,
            business_activity: input.business_activity,
            cuil: input.cuil,
            ...(tenantId ? { tenant_id: tenantId } : {}),
        };

        const response = await fetch(`${getApiBase()}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            const signupError = new Error(error.error || 'Signup failed');
            signupError.payload = error;
            throw signupError;
        }

        const data = await response.json();
        const requiresApproval = data?.requires_approval || data?.user?.status === 'pending';
        if (!requiresApproval && data?.token && data?.user) {
            persistSession(data.token, data.user);
        }
        return data;
    };

    const refreshUser = async () => {
        const token = localStorage.getItem('teflon_token');
        if (!token) return null;
        try {
            const response = await fetch(`${getApiBase()}/api/me`, {
                headers: {
                    ...getTenantHeaders(),
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (data?.user) {
                setUser(data.user);
                localStorage.setItem('teflon_user', JSON.stringify(data.user));
            }
            return data?.user || null;
        } catch (err) {
            console.error('refreshUser failed', err);
            return null;
        }
    };

    const updateProfile = async (profileFields) => {
        const token = localStorage.getItem('teflon_token');
        if (!token) throw new Error('not_authenticated');

        const response = await fetch(`${getApiBase()}/api/me/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(profileFields || {}),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.error || `profile_update_${response.status}`);
        }

        const data = await response.json();
        if (data?.user) {
            setUser(data.user);
            localStorage.setItem('teflon_user', JSON.stringify(data.user));
        }
        return data?.user || null;
    };

    const uploadProfilePhoto = async (file) => {
        const token = localStorage.getItem('teflon_token');
        if (!token) throw new Error('not_authenticated');
        if (!file) throw new Error('photo_required');

        const formData = new FormData();
        formData.append('photo', file);

        const response = await fetch(`${getApiBase()}/api/me/photo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            throw new Error(err?.details || err?.error || `photo_upload_${response.status}`);
        }

        const data = await response.json();
        if (data?.photo_url) {
            setUser((prev) => {
                const nextUser = { ...(prev || {}), photo_url: data.photo_url };
                localStorage.setItem('teflon_user', JSON.stringify(nextUser));
                return nextUser;
            });
        }
        return data?.photo_url || null;
    };

    const verifyEmailCode = async (email, code) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }

        const response = await fetch(`${getApiBase()}/auth/verify-email`, {
            method: 'POST',
            headers: buildTenantJsonHeaders(),
            body: JSON.stringify(withTenantId({
                email,
                code,
            })),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'verify_email_failed');
        }
        return response.json();
    };

    const resendVerificationCode = async (email) => {
        if (isExternalAuthEnabled()) {
            throw new Error('external_auth_enabled');
        }

        const response = await fetch(`${getApiBase()}/auth/resend-verification`, {
            method: 'POST',
            headers: buildTenantJsonHeaders(),
            body: JSON.stringify(withTenantId({
                email,
            })),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'resend_verification_failed');
        }
        return response.json();
    };

    const logout = () => {
        clearSession();
    };

    const isWholesale = user?.role === 'wholesale' && user?.status === 'active';
    const isWholesalePending = user?.role === 'wholesale' && user?.status === 'pending';
    const isAdmin = user?.role === 'tenant_admin' || user?.role === 'master_admin';

    return (
        <AuthContext.Provider value={{ user, login, signup, verifyEmailCode, resendVerificationCode, requestLoginCode, loginWithCode, logout, isWholesale, isWholesalePending, isAdmin, loading, refreshUser, updateProfile, uploadProfilePhoto }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
