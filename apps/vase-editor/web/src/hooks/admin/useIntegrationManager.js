import { useCallback, useState } from 'react';

import { getApiBase, getTenantHeaders } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const readResponsePayload = async (res) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (err) {
        return text;
    }
};

export const useIntegrationManager = () => {
    const { addToast } = useToast();
    const [manifest, setManifest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rotatingToken, setRotatingToken] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [compatPinging, setCompatPinging] = useState(false);
    const [syncingSample, setSyncingSample] = useState(false);
    const [lastPingResult, setLastPingResult] = useState(null);
    const [lastCompatibilityPingResult, setLastCompatibilityPingResult] = useState(null);
    const [lastSyncResult, setLastSyncResult] = useState(null);
    const [lastSamplePayload, setLastSamplePayload] = useState(null);

    const buildHeaders = useCallback(() => {
        const token = localStorage.getItem('teflon_token');
        return {
            ...getTenantHeaders(),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const loadManifest = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBase()}/tenant/integrations/product-sync`, {
                headers: buildHeaders(),
            });
            if (!res.ok) {
                throw new Error('integration_manifest_failed');
            }
            const data = await res.json();
            setManifest(data);
            return data;
        } catch (err) {
            console.error('Failed to load integration manifest', err);
            addToast('No se pudo cargar la integracion ERP', 'error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [addToast, buildHeaders]);

    const ensureManifest = useCallback(async () => {
        if (manifest?.auth?.token) return manifest;
        return loadManifest();
    }, [manifest, loadManifest]);

    const rotateToken = useCallback(async (name = 'ERP Sync') => {
        setRotatingToken(true);
        try {
            const res = await fetch(`${getApiBase()}/tenant/integrations/product-sync/token/rotate`, {
                method: 'POST',
                headers: {
                    ...buildHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                throw new Error('integration_token_rotate_failed');
            }
            const data = await res.json();
            setManifest(data);
            addToast('Token de integracion regenerado', 'success');
            return data;
        } catch (err) {
            console.error('Failed to rotate integration token', err);
            addToast('No se pudo regenerar el token', 'error');
            throw err;
        } finally {
            setRotatingToken(false);
        }
    }, [addToast, buildHeaders]);

    const testConnection = useCallback(async () => {
        setPinging(true);
        try {
            const currentManifest = await ensureManifest();
            const token = currentManifest?.auth?.token;
            const tenantId = currentManifest?.tenant_id;
            const url = currentManifest?.endpoints?.ping_url;

            if (!token || !tenantId || !url) {
                throw new Error('integration_manifest_incomplete');
            }

            const res = await fetch(url, {
                headers: {
                    'x-api-key': token,
                    'x-tenant-id': tenantId,
                },
            });

            const payload = await readResponsePayload(res);
            const result = {
                ok: res.ok,
                status: res.status,
                payload,
                tested_at: new Date().toISOString(),
            };
            setLastPingResult(result);

            if (!res.ok) {
                throw new Error(payload?.error || 'integration_ping_failed');
            }

            addToast('Conexion ERP OK', 'success');
            return result;
        } catch (err) {
            console.error('Failed to ping integration endpoint', err);
            addToast('Fallo la prueba de conexion ERP', 'error');
            throw err;
        } finally {
            setPinging(false);
        }
    }, [addToast, ensureManifest]);

    const testCompatibilityConnection = useCallback(async () => {
        setCompatPinging(true);
        try {
            const currentManifest = await ensureManifest();
            const consumerKey = currentManifest?.compatibility?.consumer_key;
            const consumerSecret = currentManifest?.compatibility?.consumer_secret;
            const url = currentManifest?.compatibility?.endpoints?.ping_url;

            if (!consumerKey || !consumerSecret || !url) {
                throw new Error('integration_compat_manifest_incomplete');
            }

            const requestUrl = new URL(url);
            requestUrl.searchParams.set('consumer_key', consumerKey);
            requestUrl.searchParams.set('consumer_secret', consumerSecret);

            const res = await fetch(requestUrl.toString());
            const payload = await readResponsePayload(res);
            const result = {
                ok: res.ok,
                status: res.status,
                payload,
                tested_at: new Date().toISOString(),
            };
            setLastCompatibilityPingResult(result);

            if (!res.ok) {
                throw new Error(payload?.error || 'integration_compat_ping_failed');
            }

            addToast('Compatibilidad Consumer Key/Secret OK', 'success');
            return result;
        } catch (err) {
            console.error('Failed to ping compatibility endpoint', err);
            addToast('Fallo la prueba de compatibilidad', 'error');
            throw err;
        } finally {
            setCompatPinging(false);
        }
    }, [addToast, ensureManifest]);

    const syncSampleProduct = useCallback(async () => {
        setSyncingSample(true);
        try {
            const currentManifest = await ensureManifest();
            const token = currentManifest?.auth?.token;
            const tenantId = currentManifest?.tenant_id;
            const url = currentManifest?.endpoints?.sync_products_url;

            if (!token || !tenantId || !url) {
                throw new Error('integration_manifest_incomplete');
            }

            const stamp = Date.now();
            const payload = {
                source_system: 'admin-panel-smoke-test',
                items: [
                    {
                        external_id: `ERP-ADMIN-${stamp}`,
                        sku: `ERP-ADMIN-${stamp}`,
                        name: `Producto prueba integracion ${stamp}`,
                        price_1: 18990,
                        price_2: 16990,
                        price_3: 15990,
                        stock: 12,
                        is_active: true,
                        brand: 'Integracion Demo',
                        description: 'Producto enviado desde la prueba rapida del panel admin.',
                        short_description: 'Prueba rapida ERP desde admin.',
                        category_path: 'Categoria principal > Subcategoria > Demo',
                    },
                ],
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': token,
                    'x-tenant-id': tenantId,
                },
                body: JSON.stringify(payload),
            });

            const responsePayload = await readResponsePayload(res);
            const result = {
                ok: res.ok,
                status: res.status,
                payload: responsePayload,
                tested_at: new Date().toISOString(),
            };

            setLastSamplePayload(payload);
            setLastSyncResult(result);

            if (!res.ok) {
                throw new Error(responsePayload?.error || 'integration_sample_sync_failed');
            }

            addToast('Producto de prueba sincronizado', 'success');
            return result;
        } catch (err) {
            console.error('Failed to sync sample integration product', err);
            addToast('Fallo la sincronizacion de prueba', 'error');
            throw err;
        } finally {
            setSyncingSample(false);
        }
    }, [addToast, ensureManifest]);

    return {
        manifest,
        loading,
        rotatingToken,
        pinging,
        compatPinging,
        syncingSample,
        lastPingResult,
        lastCompatibilityPingResult,
        lastSyncResult,
        lastSamplePayload,
        loadManifest,
        rotateToken,
        testConnection,
        testCompatibilityConnection,
        syncSampleProduct,
    };
};

export default useIntegrationManager;
