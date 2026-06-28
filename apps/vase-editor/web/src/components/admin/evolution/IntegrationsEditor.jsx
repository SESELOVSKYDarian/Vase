import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowsClockwise,
    CheckCircle,
    Copy,
    Key,
    Link,
    Plug,
    ShieldCheck,
} from '@phosphor-icons/react';

import { cn } from '../../../utils/cn';
import { getApiBase } from '../../../utils/api';

const cardClass = 'rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4';
const codeClass = 'rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-200 font-mono break-all';
const preClass = 'custom-scrollbar overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-[12px] leading-6 text-zinc-200';

const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const getUrlOrigin = (value) => {
    const normalized = normalizeUrl(value);
    if (!normalized) return '';
    try {
        return new URL(normalized).origin;
    } catch {
        return normalized;
    }
};

const isLocalOrigin = (value) => /localhost|127\.0\.0\.1/i.test(String(value || ''));

const CopyButton = ({ value, label = 'Copiar', className = '' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(String(value));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch (err) {
            console.error(`Failed to copy ${label}`, err);
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-200 transition hover:bg-white/10',
                className
            )}
        >
            {copied ? <CheckCircle size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
            {copied ? 'Copiado' : label}
        </button>
    );
};

const ActionButton = ({ onClick, disabled, children, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60',
            className
        )}
    >
        {children}
    </button>
);

const EndpointRow = ({ label, url }) => (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
            <CopyButton value={url} label="Copiar URL" />
        </div>
        <div className={codeClass}>{url}</div>
    </div>
);

const DeploymentCheckRow = ({ label, value, ok }) => (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <div className={codeClass}>{value || 'sin dato'}</div>
        </div>
        <span
            className={cn(
                'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            )}
        >
            {ok ? 'Correcto' : 'Revisar'}
        </span>
    </div>
);

const IntegrationsEditor = ({ manager }) => {
    const {
        manifest,
        loading,
        rotatingToken,
        loadManifest,
        rotateToken,
    } = manager;

    useEffect(() => {
        loadManifest().catch(() => {});
    }, [loadManifest]);

    const samplePayload = useMemo(
        () => JSON.stringify(manifest?.schema?.sample_payload || {}, null, 2),
        [manifest]
    );
    const compatibilitySamplePayload = useMemo(
        () => JSON.stringify(manifest?.compatibility?.sample_payload || {}, null, 2),
        [manifest]
    );
    const productFieldKeys = useMemo(
        () => new Set((manifest?.schema?.fields || []).map((field) => field?.key).filter(Boolean)),
        [manifest]
    );
    const shouldRequestProductImages = productFieldKeys.has('images');
    const currentFrontendOrigin = typeof window !== 'undefined' ? normalizeUrl(window.location.origin) : '';
    const configuredApiBase = normalizeUrl(getApiBase());
    const manifestSyncUrl = manifest?.endpoints?.sync_products_url || '';
    const manifestPingUrl = manifest?.endpoints?.ping_url || '';
    const syncFtpImagesUrl = manifest?.endpoints?.sync_ftp_images_url || manifest?.schema?.ftp_image_sync?.endpoint_url || '';
    const compatibilityFtpImagesUrl = manifest?.compatibility?.endpoints?.ftp_images_url || '';
    const currentApiOrigin = getUrlOrigin(configuredApiBase);
    const manifestSyncOrigin = getUrlOrigin(manifestSyncUrl);
    const manifestPingOrigin = getUrlOrigin(manifestPingUrl);
    const expectedServiceOrigin = currentApiOrigin || currentFrontendOrigin;
    const expectedAdminUrl = currentFrontendOrigin ? `${currentFrontendOrigin}/admin/evolution` : '';
    const backendEnvSnippet = useMemo(
        () => [
            `PUBLIC_API_URL=${expectedServiceOrigin || 'https://editor.vase.ar'}`,
            `INTEGRATIONS_PUBLIC_BASE_URL=${expectedServiceOrigin || 'https://editor.vase.ar'}`,
            `PUBLIC_ADMIN_URL=${expectedAdminUrl || 'https://editor.vase.ar/admin/evolution'}`,
            `CORS_ORIGIN=${currentFrontendOrigin || 'https://editor.vase.ar'}`,
        ].join('\n'),
        [currentFrontendOrigin, expectedAdminUrl, expectedServiceOrigin]
    );
    const frontendEnvSnippet = useMemo(
        () => [
            currentFrontendOrigin && expectedServiceOrigin === currentFrontendOrigin
                ? '# VITE_API_URL no hace falta si frontend y API comparten el mismo host'
                : `VITE_API_URL=${expectedServiceOrigin || 'https://editor.vase.ar'}`,
            manifest?.tenant_id
                ? `# VITE_TENANT_ID=${manifest.tenant_id}  # solo para desarrollo local`
                : '# VITE_TENANT_ID=  # dejar vacio en produccion para resolver por dominio',
        ].join('\n'),
        [currentFrontendOrigin, expectedServiceOrigin, manifest]
    );
    const deploymentChecks = useMemo(
        () => [
            {
                label: 'Panel actual',
                value: currentFrontendOrigin,
                ok: Boolean(currentFrontendOrigin) && !isLocalOrigin(currentFrontendOrigin),
            },
            {
                label: 'API configurada en frontend',
                value: configuredApiBase,
                ok: Boolean(currentApiOrigin) && !isLocalOrigin(currentApiOrigin) && currentApiOrigin === currentFrontendOrigin,
            },
            {
                label: 'Ping ERP publicado por backend',
                value: manifestPingUrl,
                ok: Boolean(manifestPingOrigin) && !isLocalOrigin(manifestPingOrigin) && manifestPingOrigin === expectedServiceOrigin,
            },
            {
                label: 'Sync ERP publicado por backend',
                value: manifestSyncUrl,
                ok: Boolean(manifestSyncOrigin) && !isLocalOrigin(manifestSyncOrigin) && manifestSyncOrigin === expectedServiceOrigin,
            },
        ],
        [configuredApiBase, currentApiOrigin, currentFrontendOrigin, expectedServiceOrigin, manifestPingOrigin, manifestPingUrl, manifestSyncOrigin, manifestSyncUrl]
    );
    const hasDeploymentMismatch = deploymentChecks.some((check) => !check.ok);
    const ftpImageSyncPayload = useMemo(
        () => JSON.stringify(manifest?.schema?.ftp_image_sync?.sample_payload || {}, null, 2),
        [manifest]
    );
    const ftpImageSyncCurlSnippet = useMemo(() => {
        if (!syncFtpImagesUrl || !manifest?.auth?.token || !manifest?.tenant_id) return '';

        return [
            `curl -X POST "${syncFtpImagesUrl}" \\`,
            `  -H "Content-Type: application/json" \\`,
            `  -H "x-api-key: ${manifest.auth.token}" \\`,
            `  -H "x-tenant-id: ${manifest.tenant_id}" \\`,
            `  -d '${ftpImageSyncPayload.replace(/'/g, "'\\''")}'`,
        ].join('\n');
    }, [ftpImageSyncPayload, manifest, syncFtpImagesUrl]);

    if (loading && !manifest) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                <ArrowsClockwise size={28} weight="bold" className="mb-3 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-[0.24em]">Cargando integracion</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300">
                        <Plug size={14} weight="bold" />
                        Integraciones
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">Centro ERP / Sistema de gestion</h2>
                        <p className="max-w-3xl text-sm text-zinc-500">
                            Este modulo le da al proveedor del sistema de gestion el tenant, el token y las URLs que necesita para conectarse.
                            El sync real sigue entrando por la API del ecommerce.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ActionButton onClick={() => loadManifest().catch(() => {})}>
                        <ArrowsClockwise size={14} weight="bold" />
                        Recargar
                    </ActionButton>
                    <ActionButton
                        onClick={() => rotateToken('ERP Sync')}
                        disabled={rotatingToken}
                        className="bg-evolution-indigo text-white hover:bg-evolution-indigo/90"
                    >
                        <Key size={14} weight="bold" />
                        {rotatingToken ? 'Regenerando...' : 'Regenerar token'}
                    </ActionButton>
                </div>
            </div>

            {manifest?.token_auto_created ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    No habia token de integracion para este tenant. El sistema genero uno automaticamente y ya esta listo para usar.
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className={cardClass}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        <ShieldCheck size={16} weight="bold" />
                        Credenciales
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tenant UUID</p>
                            <div className="mt-2 space-y-2">
                                <div className={codeClass}>{manifest?.tenant_id || 'Sin tenant'}</div>
                                <CopyButton value={manifest?.tenant_id} label="Copiar tenant" />
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scope requerido</p>
                            <div className="mt-2 space-y-2">
                                <div className={codeClass}>{manifest?.auth?.scope || 'products:sync'}</div>
                                <p className="text-[11px] text-zinc-500">El proveedor debe usar este scope en el token de integracion.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Token actual</p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                    Compartile este token al desarrollador del sistema de gestion. Si lo regeneras, el anterior deja de servir.
                                </p>
                            </div>
                            <CopyButton value={manifest?.auth?.token} label="Copiar token" />
                        </div>
                        <div className="mt-3 space-y-2">
                            <div className={codeClass}>{manifest?.auth?.token || 'Sin token generado'}</div>
                            <p className="text-[11px] text-zinc-500">Nombre visible: {manifest?.auth?.token_name || 'ERP Sync'}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Compatibilidad sistema de gestion</p>
                            <p className="mt-1 text-[11px] text-zinc-500">
                                Si el software solo deja configurar Dominio, Consumer Key y Consumer Secret, pasales estos datos.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Consumer Key</p>
                                    <CopyButton value={manifest?.compatibility?.consumer_key} label="Copiar key" />
                                </div>
                                <div className={codeClass}>{manifest?.compatibility?.consumer_key || 'Genera un token para usar compatibilidad'}</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Consumer Secret</p>
                                    <CopyButton value={manifest?.compatibility?.consumer_secret} label="Copiar secret" />
                                </div>
                                <div className={codeClass}>{manifest?.compatibility?.consumer_secret || 'Sin secret disponible'}</div>
                            </div>
                        </div>

                        <p className="text-[11px] text-zinc-500">
                            El Consumer Secret se deriva del token actual. Si regeneras el token, tambien cambia este secret.
                        </p>
                    </div>
                </div>

                <div className={cardClass}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        <Link size={16} weight="bold" />
                        Endpoints
                    </div>

                    <EndpointRow label="Prueba de conexion" url={manifest?.endpoints?.ping_url || ''} />
                    <EndpointRow label="Sincronizacion de productos" url={manifest?.endpoints?.sync_products_url || ''} />
                    <EndpointRow label="Sincronizacion FTP de imagenes" url={syncFtpImagesUrl} />
                    <EndpointRow label="Esquema JSON del producto" url={manifest?.endpoints?.schema_product_url || ''} />
                    <EndpointRow label="Compatibilidad ping" url={manifest?.compatibility?.endpoints?.ping_url || ''} />
                    <EndpointRow label="Compatibilidad producto" url={manifest?.compatibility?.endpoints?.product_url || ''} />
                    <EndpointRow label="Compatibilidad productos" url={manifest?.compatibility?.endpoints?.products_url || ''} />
                    <EndpointRow label="Compatibilidad FTP imagenes" url={compatibilityFtpImagesUrl} />

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-white">
                        El stock viaja dentro del mismo item de producto. No hace falta una URL separada de stock si el sistema ya puede enviar JSON de producto.
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                            <Link size={16} weight="bold" />
                            Imagenes por FTP
                        </div>
                        <p className="max-w-3xl text-[12px] leading-6 text-zinc-400">
                            Endpoint legacy para leer imagenes desde un FTP externo y asociarlas a productos ya sincronizados por codigo o SKU.
                        </p>
                    </div>
                    <CopyButton value={ftpImageSyncCurlSnippet} label="Copiar cURL FTP" />
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <EndpointRow label="Endpoint FTP imagenes" url={syncFtpImagesUrl} />
                    <EndpointRow label="Endpoint FTP compatibilidad" url={compatibilityFtpImagesUrl} />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">JSON FTP</p>
                            <CopyButton value={ftpImageSyncPayload} label="Copiar JSON" />
                        </div>
                        <pre className={preClass}>{ftpImageSyncPayload}</pre>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">cURL FTP</p>
                            <CopyButton value={ftpImageSyncCurlSnippet} label="Copiar cURL" />
                        </div>
                        <pre className={preClass}>{ftpImageSyncCurlSnippet || 'Cargando cURL FTP...'}</pre>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                    <ShieldCheck size={16} weight="bold" />
                    Diagnostico de deployment
                </div>

                {hasDeploymentMismatch ? (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] leading-6 text-rose-200">
                        Hay una configuracion desalineada entre el panel, la API o los endpoints publicados. Si en alguna fila ves `localhost`
                        o un host distinto al servicio activo en EasyPanel, las integraciones pueden fallar aunque el codigo este bien.
                    </div>
                ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] leading-6 text-emerald-200">
                        El panel, la API y las URLs publicadas de integracion estan alineadas para el despliegue actual en VPS / EasyPanel.
                        La verificacion ya no depende de una separacion artificial entre frontend y backend.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {deploymentChecks.map((check) => (
                        <DeploymentCheckRow
                            key={check.label}
                            label={check.label}
                            value={check.value}
                            ok={check.ok}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Backend env esperado</p>
                            <CopyButton value={backendEnvSnippet} label="Copiar backend env" />
                        </div>
                        <pre className={preClass}>{backendEnvSnippet}</pre>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Frontend env sugerido</p>
                            <CopyButton value={frontendEnvSnippet} label="Copiar frontend env" />
                        </div>
                        <pre className={preClass}>{frontendEnvSnippet}</pre>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className={cardClass}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        <ShieldCheck size={16} weight="bold" />
                        Campos que debe enviar la gestion
                    </div>

                    <div className="space-y-3">
                        {(manifest?.schema?.fields || []).map((field) => (
                            <div key={field.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-mono text-sm text-white">{field.key}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400">
                                            {field.type}
                                        </span>
                                        {field.required ? (
                                            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                                                obligatorio
                                            </span>
                                        ) : (
                                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-500">
                                                opcional
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-2 text-[12px] text-zinc-400">{field.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={cardClass}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                            <Plug size={16} weight="bold" />
                            JSON de ejemplo
                        </div>
                        <CopyButton value={samplePayload} label="Copiar JSON" />
                    </div>

                    <pre className="custom-scrollbar overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-[12px] leading-6 text-zinc-200">
                        {samplePayload}
                    </pre>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">JSON ejemplo compatibilidad</p>
                            <CopyButton value={compatibilitySamplePayload} label="Copiar JSON compat" />
                        </div>
                        <pre className="custom-scrollbar overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-[12px] leading-6 text-zinc-200">
                            {compatibilitySamplePayload}
                        </pre>
                    </div>

                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Pedido corto para el proveedor</p>
                        <p className="text-[12px] leading-6 text-zinc-300">
                            Necesitamos que el sistema de gestion lea productos desde su propia base y los envie a la URL de sincronizacion.
                            Debe mandar `x-api-key`, `x-tenant-id`, `source_system` y un array `items` con `external_id`, `sku`, `name`,
                            `price_1..price_10`, `short_description`, `stock`, `is_active`, `description` y `category_path`
                            {shouldRequestProductImages ? ' e `images` si las tiene' : ''}. `category_id` solo aplica si ya conocen el UUID real de una categoria del ecommerce.
                        </p>
                        {!shouldRequestProductImages ? (
                            <p className="text-[12px] leading-6 text-orange-200">
                                Este contrato no solicita imagenes al sistema de gestion. Las imagenes se cargan desde el panel web y quedan asociadas al SKU.
                            </p>
                        ) : null}
                        <p className="text-[12px] leading-6 text-zinc-300">
                            Si el software solo acepta `Consumer Key` y `Consumer Secret`, debe usar la capa de compatibilidad con las URLs
                            `Compatibilidad producto` o `Compatibilidad productos`. Aun asi, recomendamos mantener el mismo criterio:
                            `price_1..price_10` y `category_path`.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsEditor;
