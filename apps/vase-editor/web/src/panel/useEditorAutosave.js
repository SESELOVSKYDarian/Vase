import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminTenantHeaders, getApiBase } from '../utils/api';

const SAVE_DELAY_MS = 1500;

async function authHeaders(user) {
    const tenantHeaders = await getAdminTenantHeaders(user);
    if (!tenantHeaders['X-Tenant-Id']) return null;
    let token = null;
    try {
        token = localStorage.getItem('teflon_token');
    } catch {
        token = null;
    }
    return { ...tenantHeaders, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const snapshot = (editor) => JSON.stringify({ settings: editor.settings, pages: editor.pageSections });

/**
 * Guarda solo, en la nube, lo que se edita del diseño: los ajustes van a un borrador y las páginas a
 * su versión borrador. La tienda no cambia hasta que se toca Publicar.
 * cloud: 'saved' | 'saving' | 'error' | 'offline'.
 */
export function useEditorAutosave(editor, user) {
    const [cloud, setCloud] = useState(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'saved'));
    const [unpublished, setUnpublished] = useState(false);
    const hydratedRef = useRef(false);
    const baselineRef = useRef(null);
    const lastSavedRef = useRef(null);
    const timerRef = useRef(null);

    // Al entrar por primera vez se recupera el borrador guardado, si quedó uno sin publicar.
    useEffect(() => {
        if (editor.loading || hydratedRef.current) return;
        hydratedRef.current = true;
        let cancelled = false;
        (async () => {
            try {
                const headers = await authHeaders(user);
                if (!headers) return;
                const response = await fetch(`${getApiBase()}/tenant/editor-draft`, { headers });
                const payload = response.ok ? await response.json() : null;
                if (cancelled) return;
                if (payload?.draft?.settings) {
                    editor.setSettings((prev) => ({ ...prev, ...payload.draft.settings }));
                    setUnpublished(true);
                }
            } catch {
                // sin borrador: se sigue con lo publicado
            } finally {
                if (!cancelled) baselineRef.current = null;
            }
        })();
        return () => {
            cancelled = true;
        };
        // Solo la primera carga: las recargas de otras pantallas no deben pisar el borrador.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor.loading]);

    const save = useCallback(async (current) => {
        const headers = await authHeaders(user);
        if (!headers) return;
        setCloud('saving');
        try {
            const settingsRes = await fetch(`${getApiBase()}/tenant/editor-draft`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ settings: editor.settings }),
            });
            const pageResults = await Promise.all(['home', 'about'].map((slug) => fetch(`${getApiBase()}/tenant/pages/${slug}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ sections: editor.pageSections?.[slug] || [] }),
            })));
            if (!settingsRes.ok || pageResults.some((response) => !response.ok)) throw new Error('save_failed');
            lastSavedRef.current = current;
            setCloud('saved');
        } catch {
            setCloud(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
        }
    }, [editor.pageSections, editor.settings, user]);

    useEffect(() => {
        if (editor.loading || !hydratedRef.current) return;
        const current = snapshot(editor);
        if (baselineRef.current === null) {
            baselineRef.current = current;
            lastSavedRef.current = current;
            return;
        }
        if (current === lastSavedRef.current) return;
        setUnpublished(true);
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => save(current), SAVE_DELAY_MS);
        return () => window.clearTimeout(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor.settings, editor.pageSections, editor.loading]);

    useEffect(() => {
        const online = () => setCloud((state) => (state === 'offline' ? 'saved' : state));
        const offline = () => setCloud('offline');
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        return () => {
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
        };
    }, []);

    // Publicar pasa todo a la tienda: el borrador ya no hace falta.
    const markPublished = useCallback(async () => {
        window.clearTimeout(timerRef.current);
        lastSavedRef.current = snapshot(editor);
        setUnpublished(false);
        setCloud('saved');
        try {
            const headers = await authHeaders(user);
            if (headers) await fetch(`${getApiBase()}/tenant/editor-draft`, { method: 'DELETE', headers });
        } catch {
            // si falla, el próximo publicar lo vuelve a intentar
        }
    }, [editor, user]);

    return { cloud, unpublished, markPublished };
}
