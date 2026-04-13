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

const ResultPanel = ({ title, result }) => {
    if (!result) return null;

    return (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{title}</p>
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider',
                            result.ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                        )}
                    >
                        {result.ok ? 'OK' : 'Error'}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        HTTP {result.status}
                    </span>
                </div>
            </div>
            <p className="text-[11px] text-zinc-500">Ultima prueba: {result.tested_at || 'sin fecha'}</p>
            <pre className={preClass}>{JSON.stringify(result.payload, null, 2)}</pre>
        </div>
    );
};

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
    const lastSamplePayloadJson = useMemo(
        () => JSON.stringify(lastSamplePayload || {}, null, 2),
        [lastSamplePayload]
    );
    const expectedFrontendOrigin = 'https://proyecto-teflon-web.vercel.app';
    const expectedBackendOrigin = 'https://proyecto-teflon.onrender.com';
    const currentFrontendOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const configuredApiBase = getApiBase();
    const manifestSyncUrl = manifest?.endpoints?.sync_products_url || '';
    const manifestPingUrl = manifest?.endpoints?.ping_url || '';
    const renderEnvSnippet = useMemo(
        () => [
            `PUBLIC_API_URL=${expectedBackendOrigin}`,
            `INTEGRATIONS_PUBLIC_BASE_URL=${expectedBackendOrigin}`,
            `CORS_ORIGIN=${expectedFrontendOrigin}`,
        ].join('\n'),
        []
    );
    const vercelEnvSnippet = useMemo(
        () => [
            `VITE_API_URL=${expectedBackendOrigin}`,
            `VITE_TENANT_ID=${manifest?.tenant_id || import.meta.env.VITE_TENANT_ID || '636736e2-e135-44cd-ac5c-5d4ccb839a73'}`,
        ].join('\n'),
        [manifest]
    );
    const deploymentChecks = useMemo(
        () => [
            {
                label: 'Frontend actual',
                value: currentFrontendOrigin,
                ok: currentFrontendOrigin === expectedFrontendOrigin,
            },
            {
                label: 'API configurada en frontend',
                value: configuredApiBase,
                ok: configuredApiBase === expectedBackendOrigin,
            },
            {
                label: 'Ping ERP publicado por backend',
                value: manifestPingUrl,
                ok: manifestPingUrl.startsWith(expectedBackendOrigin),
            },
            {
                label: 'Sync ERP publicado por backend',
                value: manifestSyncUrl,
                ok: manifestSyncUrl.startsWith(expectedBackendOrigin),
            },
        ],
        [configuredApiBase, currentFrontendOrigin, manifestPingUrl, manifestSyncUrl]
    );
    const hasDeploymentMismatch = deploymentChecks.some((check) => !check.ok);
    const powershellSnippet = useMemo(() => {
        if (!manifest?.endpoints?.sync_products_url || !manifest?.auth?.token || !manifest?.tenant_id) return '';

        return [
            `$headers = @{`,
            `  "x-api-key" = "${manifest.auth.token}"`,
            `  "x-tenant-id" = "${manifest.tenant_id}"`,
            `  "Content-Type" = "application/json"`,
            `}`,
            ``,
            `$body = @'`,
            samplePayload,
            `'@`,
            ``,
            `Invoke-RestMethod -Method Post -Uri "${manifest.endpoints.sync_products_url}" -Headers $headers -Body $body`,
        ].join('\n');
    }, [manifest, samplePayload]);
    const curlSnippet = useMemo(() => {
        if (!manifest?.endpoints?.sync_products_url || !manifest?.auth?.token || !manifest?.tenant_id) return '';

        const compactPayload = JSON.stringify(manifest?.schema?.sample_payload || {});
        return [
            'curl -X POST',
            `  "${manifest.endpoints.sync_products_url}"`,
            `  -H "x-api-key: ${manifest.auth.token}"`,
            `  -H "x-tenant-id: ${manifest.tenant_id}"`,
            '  -H "Content-Type: application/json"',
            `  -d '${compactPayload}'`,
        ].join('\n');
    }, [manifest]);

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
                    <EndpointRow label="Esquema JSON del producto" url={manifest?.endpoints?.schema_product_url || ''} />
                    <EndpointRow label="Compatibilidad ping" url={manifest?.compatibility?.endpoints?.ping_url || ''} />
                    <EndpointRow label="Compatibilidad producto" url={manifest?.compatibility?.endpoints?.product_url || ''} />
                    <EndpointRow label="Compatibilidad productos" url={manifest?.compatibility?.endpoints?.products_url || ''} />

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-white">
                        El stock viaja dentro del mismo item de producto. No hace falta una URL separada de stock si el sistema ya puede enviar JSON de producto.
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
                        Hay una configuracion desalineada entre Vercel y Render. Si en alguna fila ves `localhost` o una URL distinta,
                        las integraciones pueden fallar aunque el codigo este bien.
                    </div>
                ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] leading-6 text-emerald-200">
                        El panel esta apuntando a las URLs productivas correctas: Vercel para frontend, Render para backend e integraciones.
                        La persistencia sigue en Supabase via `DATABASE_URL` del backend.
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
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Render env esperado</p>
                            <CopyButton value={renderEnvSnippet} label="Copiar Render env" />
                        </div>
                        <pre className={preClass}>{renderEnvSnippet}</pre>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Vercel env esperado</p>
                            <CopyButton value={vercelEnvSnippet} label="Copiar Vercel env" />
                        </div>
                        <pre className={preClass}>{vercelEnvSnippet}</pre>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className={cardClass}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        <CheckCircle size={16} weight="bold" />
                        Pruebas rapidas desde admin
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[12px] leading-6 text-zinc-300">
                            Desde aca podes probar si el sistema de gestion va a poder conectarse y si el sync realmente inserta o actualiza productos.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <ActionButton onClick={() => testConnection().catch(() => {})} disabled={pinging}>
                                <Plug size={14} weight="bold" />
                                {pinging ? 'Probando conexion...' : 'Probar conexion'}
                            </ActionButton>
                            <ActionButton onClick={() => testCompatibilityConnection().catch(() => {})} disabled={compatPinging}>
                                <ShieldCheck size={14} weight="bold" />
                                {compatPinging ? 'Probando compatibilidad...' : 'Probar compatibilidad'}
                            </ActionButton>
                            <ActionButton
                                onClick={() => syncSampleProduct().catch(() => {})}
                                disabled={syncingSample}
                                className="bg-evolution-indigo text-white hover:bg-evolution-indigo/90"
                            >
                                <ArrowsClockwise size={14} weight="bold" />
                                {syncingSample ? 'Sincronizando prueba...' : 'Sync producto demo'}
                            </ActionButton>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-white">
                            La prueba de sync envia un producto demo con categoria `Sanitarios`. Si esa categoria no existe, el backend la crea automaticamente.
                        </div>
                    </div>

                    <ResultPanel title="Resultado ping" result={lastPingResult} />
                    <ResultPanel title="Resultado compatibilidad" result={lastCompatibilityPingResult} />
                    {lastSamplePayload ? (
                        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Payload enviado en la prueba</p>
                                <CopyButton value={lastSamplePayloadJson} label="Copiar payload" />
                            </div>
                            <pre className={preClass}>{lastSamplePayloadJson}</pre>
                        </div>
                    ) : null}
                    <ResultPanel title="Resultado sync demo" result={lastSyncResult} />
                </div>

                <div className={cardClass}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        <Copy size={16} weight="bold" />
                        Snippets listos
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">PowerShell</p>
                            <CopyButton value={powershellSnippet} label="Copiar PowerShell" />
                        </div>
                        <pre className={preClass}>{powershellSnippet || 'Cargando snippet...'}</pre>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">cURL</p>
                            <CopyButton value={curlSnippet} label="Copiar cURL" />
                        </div>
                        <pre className={preClass}>{curlSnippet || 'Cargando snippet...'}</pre>
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
                            `price_retail`, `price_wholesale`, `stock`, `is_active`, `description`, `category_id` e `images` si las tiene.
                        </p>
                        <p className="text-[12px] leading-6 text-zinc-300">
                            Si el software solo acepta `Consumer Key` y `Consumer Secret`, debe usar la capa de compatibilidad con las URLs
                            `Compatibilidad producto` o `Compatibilidad productos`.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsEditor;
