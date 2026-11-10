import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminTenantHeaders, getApiBase } from '../utils/api';
import { changedParts, historySummary, shouldCheckpoint } from './history';

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

const state = (editor) => ({ settings: editor.settings, pages: { home: editor.pageSections?.home || [], about: editor.pageSections?.about || [] } });
const snapshot = (editor) => JSON.stringify(state(editor));

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
    const savedStateRef = useRef(null);
    const lastCheckpointRef = useRef(null);
    const [entries, setEntries] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const refreshHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const headers = await authHeaders(user);
            if (!headers) return [];
            const response = await fetch(`${getApiBase()}/tenant/editor-history`, { headers });
            const payload = response.ok ? await response.json() : { entries: [] };
            const list = Array.isArray(payload.entries) ? payload.entries : [];
            setEntries(list);
            if (list[0]?.created_at) lastCheckpointRef.current = Math.max(lastCheckpointRef.current || 0, new Date(list[0].created_at).getTime());
            return list;
        } catch {
            return [];
        } finally {
            setHistoryLoading(false);
        }
    }, [user]);

    const checkpoint = useCallback(async (snapshotState, summary) => {
        if (!snapshotState) return;
        lastCheckpointRef.current = Date.now();
        try {
            const headers = await authHeaders(user);
            if (!headers) return;
            await fetch(`${getApiBase()}/tenant/editor-history`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ...snapshotState, summary }),
            });
        } catch {
            // el historial es una ayuda: si no se guarda, la edición sigue igual
        }
    }, [user]);

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
                refreshHistory();
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
            savedStateRef.current = JSON.parse(current);
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
            savedStateRef.current = state(editor);
            return;
        }
        if (current === lastSavedRef.current) return;
        setUnpublished(true);
        // Primer cambio después de un rato: se guarda cómo estaba, para poder volver.
        if (shouldCheckpoint(lastCheckpointRef.current)) {
            const before = savedStateRef.current;
            checkpoint(before, historySummary(changedParts(before, state(editor))));
        }
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
        savedStateRef.current = state(editor);
        checkpoint(state(editor), 'Versión publicada');
        setUnpublished(false);
        setCloud('saved');
        try {
            const headers = await authHeaders(user);
            if (headers) await fetch(`${getApiBase()}/tenant/editor-draft`, { method: 'DELETE', headers });
        } catch {
            // si falla, el próximo publicar lo vuelve a intentar
        }
    }, [checkpoint, editor, user]);

    // Volver a un punto: antes se guarda cómo está ahora, así también se puede deshacer.
    const restore = useCallback(async (id) => {
        try {
            const headers = await authHeaders(user);
            if (!headers) return false;
            const response = await fetch(`${getApiBase()}/tenant/editor-history/${encodeURIComponent(id)}`, { headers });
            if (!response.ok) return false;
            const { entry } = await response.json();
            await checkpoint(state(editor), 'Antes de volver atrás');
            editor.setSettings((prev) => ({ ...prev, ...(entry.settings || {}) }));
            editor.setPageSections((prev) => ({ ...prev, home: entry.pages?.home || [], about: entry.pages?.about || [] }));
            refreshHistory();
            return true;
        } catch {
            return false;
        }
    }, [checkpoint, editor, refreshHistory, user]);

    return {
        cloud,
        unpublished,
        markPublished,
        history: { entries, loading: historyLoading, refresh: refreshHistory, restore },
    };
}
