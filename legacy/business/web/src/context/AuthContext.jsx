import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBase, getTenantHeaders } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = () => {
        setUser(null);
        localStorage.removeItem('teflon_token');
        localStorage.removeItem('teflon_user');
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
                setUser(nextUser);
                localStorage.setItem('teflon_user', JSON.stringify(nextUser));
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
        const rawEmail = String(email || '').trim();
        const normalizedEmail = rawEmail.toLowerCase() === 'admin'
            ? 'admin@teflon.local'
            : rawEmail;

        const response = await fetch(`${getApiBase()}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: normalizedEmail,
                password,
                tenant_id: import.meta.env.VITE_TENANT_ID
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        setUser(data.user);
        localStorage.setItem('teflon_token', data.token);
        localStorage.setItem('teflon_user', JSON.stringify(data.user));
        return data;
    };

    const signup = async (email, password, role, name = '') => {
        const response = await fetch(`${getApiBase()}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                role,
                name,
                tenant_id: import.meta.env.VITE_TENANT_ID
            }),
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
            setUser(data.user);
            localStorage.setItem('teflon_token', data.token);
            localStorage.setItem('teflon_user', JSON.stringify(data.user));
        } else {
            clearSession();
        }
        return data;
    };

    const verifyEmailCode = async (email, code) => {
        const response = await fetch(`${getApiBase()}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                code,
                tenant_id: import.meta.env.VITE_TENANT_ID
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'verify_email_failed');
        }
        return response.json();
    };

    const resendVerificationCode = async (email) => {
        const response = await fetch(`${getApiBase()}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                tenant_id: import.meta.env.VITE_TENANT_ID
            }),
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
        <AuthContext.Provider value={{ user, login, signup, verifyEmailCode, resendVerificationCode, logout, isWholesale, isWholesalePending, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
