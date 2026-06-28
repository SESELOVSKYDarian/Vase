import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowsClockwise,
    CheckCircle,
    Copy,
    CrownSimple,
    Globe,
    GlobeHemisphereWest,
    RocketLaunch,
    Trash,
    X,
} from '@phosphor-icons/react';

import { getApiBase, getTenantHeaders } from '../../../utils/api';
import { useToast } from '../../../context/ToastContext';
import { cn } from '../../../utils/cn';

const inputClass = 'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';
const ghostButtonClass = 'admin-hover-surface inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium admin-text-primary transition-all disabled:cursor-not-allowed disabled:opacity-50';
const panelStyle = { borderColor: 'var(--admin-border)' };
const headerStyle = { borderColor: 'var(--admin-border-soft)' };
const surfaceStyle = {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.10)',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.06)',
};
const fieldStyle = {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.12)',
    color: '#0f172a',
};
const whiteTextPrimary = { color: '#0f172a' };
const whiteTextMuted = { color: '#475569' };
const whiteTextLabel = { color: '#64748b' };
const whiteStepBadgeStyle = { backgroundColor: '#111827', color: '#ffffff' };

const chipToneMap = {
    success: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.24)' },
    warning: { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.24)' },
    info: { backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#7dd3fc', borderColor: 'rgba(56, 189, 248, 0.24)' },
    default: { backgroundColor: 'var(--admin-hover)', color: 'var(--admin-muted)', borderColor: 'var(--admin-border-soft)' },
};

const readResponsePayload = async (res) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const buildHeaders = () => {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const normalizeDomainInput = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.$/, '');

const safePublicUrl = (domain) => {
    const value = normalizeDomainInput(domain);
    if (!value || value === 'sin url principal') return null;
    return `https://${value}`;
};

const getPlatformSubdomainValue = (payload) =>
    String(payload?.platform?.assigned_subdomain || payload?.platform?.suggested_subdomain || '')
        .trim()
        .toLowerCase();

const resolveDomainErrorMessage = (errorCode, domainValue) => {
    const domain = String(domainValue || '').trim();
    switch (errorCode) {
        case 'domain_required':
            return 'Ingresa un dominio para conectar.';
        case 'invalid_domain':
            return domain ? `El dominio ${domain} no tiene un formato valido.` : 'El dominio ingresado no tiene un formato valido.';
        case 'domain_in_use':
            return domain ? `El dominio ${domain} ya esta vinculado a otro negocio.` : 'Ese dominio ya esta vinculado a otro negocio.';
        default:
            return 'No se pudo conectar el dominio.';
    }
};

const resolvePlatformErrorMessage = (errorCode) => {
    switch (errorCode) {
        case 'platform_domain_not_configured':
            return 'La plataforma todavia no tiene base de subdominios configurada.';
        case 'subdomain_required':
            return 'Ingresa un subdominio para reservar.';
        case 'domain_in_use':
            return 'Ese subdominio ya esta reservado por otro negocio.';
        default:
            return 'No se pudo reservar el subdominio.';
    }
};

const getVerificationTone = (status) => {
    switch (status) {
        case 'active': return 'success';
        case 'attention': return 'warning';
        case 'dns_pending': return 'info';
        default: return 'default';
    }
};

const getVercelStatusTone = (status) => {
    switch (status) {
        case 'verified': return 'success';
        case 'pending': return 'info';
        case 'error': return 'warning';
        default: return 'default';
    }
};

const inferDraftDnsPlan = (domain, platform) => {
    const normalized = normalizeDomainInput(domain);
    if (!normalized) return null;
    const platformBase = String(platform?.base_domain || '').trim().toLowerCase();
    const cnameTarget = String(platform?.cname_target || 'tu-host-de-publicacion').trim();
    const apexIp = String(platform?.apex_ip || 'tu-ip-publica').trim();
    const labels = normalized.split('.');
    const isPlatform = platformBase && normalized.endsWith(`.${platformBase}`);
    const mode = isPlatform ? 'platform' : labels.length > 2 ? 'subdomain' : 'apex';
    const hostLabel = labels.length > 2 ? labels.slice(0, -2).join('.') : '@';

    if (mode === 'platform') {
        return { mode, connection_type: 'platform', required_records: [], dns_hint: 'Este host ya vive dentro del dominio de la plataforma y no necesita DNS manual.' };
    }
    if (mode === 'subdomain') {
        return {
            mode,
            connection_type: 'custom',
            required_records: [{ type: 'CNAME', host: hostLabel, value: cnameTarget, ttl: 'Auto' }],
            dns_hint: `Crea un CNAME para ${hostLabel} apuntando a ${cnameTarget}.`,
        };
    }
    return {
        mode,
        connection_type: 'custom',
        required_records: [
            { type: 'A', host: '@', value: apexIp, ttl: 'Auto' },
            { type: 'CNAME', host: 'www', value: cnameTarget, ttl: 'Auto' },
        ],
        dns_hint: `Apunta el dominio raiz a ${apexIp}. Si tambien quieres www, agrega un CNAME hacia ${cnameTarget}.`,
    };
};

const Chip = ({ label, tone = 'default' }) => (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={chipToneMap[tone] || chipToneMap.default}>{label}</span>
);

const Card = ({ eyebrow, title, description, action, children }) => (
    <section className="space-y-5 rounded-2xl border p-5" style={surfaceStyle}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
                {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">{eyebrow}</p> : null}
                {title ? <h3 className="text-lg font-semibold tracking-tight" style={whiteTextPrimary}>{title}</h3> : null}
                {description ? <p className="text-sm leading-relaxed" style={whiteTextMuted}>{description}</p> : null}
            </div>
            {action || null}
        </div>
        {children}
    </section>
);

const Step = ({ step, title, description }) => (
    <div className="rounded-2xl border p-4" style={surfaceStyle}>
        <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black" style={whiteStepBadgeStyle}>{step}</div>
            <div className="space-y-1">
                <p className="text-sm font-semibold" style={whiteTextPrimary}>{title}</p>
                <p className="text-xs leading-relaxed text-zinc-500">{description}</p>
            </div>
        </div>
    </div>
);

const RecordRow = ({ record, onCopy }) => (
    <div className="flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center md:justify-between" style={surfaceStyle}>
        <div className="grid flex-1 gap-3 md:grid-cols-[90px_minmax(120px,0.7fr)_minmax(0,1fr)_90px]">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>Tipo</p><p className="mt-1 text-sm font-semibold" style={whiteTextPrimary}>{record.type}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>Host</p><p className="mt-1 break-all text-sm" style={whiteTextPrimary}>{record.host}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>Valor</p><p className="mt-1 break-all text-sm" style={whiteTextPrimary}>{record.value}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>TTL</p><p className="mt-1 text-sm" style={whiteTextPrimary}>{record.ttl || 'Auto'}</p></div>
        </div>
        <button type="button" onClick={() => onCopy(`${record.type} ${record.host} ${record.value}`)} className={ghostButtonClass} style={headerStyle}><Copy size={14} weight="bold" />Copiar</button>
    </div>
);

const DomainConnectModal = ({ open, onClose, initialIntent = 'domains' }) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [domainState, setDomainState] = useState(null);
    const [customDomain, setCustomDomain] = useState('');
    const [platformSubdomain, setPlatformSubdomain] = useState('');
    const [checkingDomain, setCheckingDomain] = useState('');

    const loadDomains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBase()}/tenant/domains`, { headers: buildHeaders() });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_domains_load_failed');
            setDomainState(payload);
            setPlatformSubdomain((current) => current || getPlatformSubdomainValue(payload));
            return payload;
        } catch (err) {
            console.error('Failed to load tenant domains', err);
            addToast('No se pudo cargar el centro de dominios', 'error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (!open) return;
        loadDomains().catch(() => {});
    }, [open, loadDomains]);

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    const submitCustomDomain = async () => {
        const domain = normalizeDomainInput(customDomain);
        if (!domain) {
            addToast('Ingresa un dominio para conectar', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${getApiBase()}/tenant/domains`, {
                method: 'POST',
                headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain, is_primary: true }),
            });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_domain_connect_failed');
            setDomainState(payload);
            setPlatformSubdomain((current) => current || getPlatformSubdomainValue(payload));
            setCustomDomain('');
            addToast('Dominio conectado. Ahora publica los DNS y verifica el estado.', 'success');
        } catch (err) {
            console.error('Failed to connect custom domain', err);
            addToast(resolveDomainErrorMessage(err?.message, domain), 'error');
        } finally {
            setSaving(false);
        }
    };

    const publishPlatformDomain = async () => {
        setSaving(true);
        try {
            const subdomain = String(platformSubdomain || domainState?.platform?.assigned_subdomain || domainState?.platform?.suggested_subdomain || '').trim();
            const assignedSubdomain = String(domainState?.platform?.assigned_subdomain || '').trim();
            const endpoint = subdomain && subdomain !== assignedSubdomain
                ? `${getApiBase()}/tenant/domains/platform`
                : `${getApiBase()}/tenant/domains/platform/ensure`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, is_primary: !hasCustomPrimary }),
            });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_platform_domain_publish_failed');
            setDomainState(payload);
            setPlatformSubdomain(getPlatformSubdomainValue(payload));
            const publishedUrl = safePublicUrl(payload?.platform?.assigned_domain || payload?.primary_domain);
            addToast(
                hasCustomPrimary
                    ? 'Link Vase guardado como respaldo. Tu dominio propio sigue como principal.'
                    : (publishedUrl ? `Sitio publicado en ${publishedUrl}` : 'Sitio publicado con link de plataforma'),
                'success'
            );
        } catch (err) {
            console.error('Failed to publish platform domain', err);
            addToast(resolvePlatformErrorMessage(err?.message), 'error');
        } finally {
            setSaving(false);
        }
    };

    const refreshVerification = async (domain = '') => {
        setCheckingDomain(domain || '__all__');
        try {
            const res = await fetch(`${getApiBase()}/tenant/domains/check`, {
                method: 'POST',
                headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(domain ? { domain } : {}),
            });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_domains_check_failed');
            setDomainState(payload);
            setPlatformSubdomain((current) => current || getPlatformSubdomainValue(payload));
            addToast(domain ? `Estado actualizado para ${domain}` : 'Estado de dominios actualizado', 'success');
        } catch (err) {
            console.error('Failed to verify domain state', err);
            addToast('No se pudo verificar el estado del dominio', 'error');
        } finally {
            setCheckingDomain('');
        }
    };

    const setPrimaryDomain = async (domain) => {
        setSaving(true);
        try {
            const encoded = encodeURIComponent(domain);
            const res = await fetch(`${getApiBase()}/tenant/domains/${encoded}/primary`, { method: 'PATCH', headers: buildHeaders() });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_domain_primary_failed');
            setDomainState(payload);
            setPlatformSubdomain((current) => current || getPlatformSubdomainValue(payload));
            addToast('Dominio principal actualizado', 'success');
        } catch (err) {
            console.error('Failed to set primary domain', err);
            addToast('No se pudo marcar el dominio como principal', 'error');
        } finally {
            setSaving(false);
        }
    };

    const removeDomain = async (domain) => {
        setSaving(true);
        try {
            const encoded = encodeURIComponent(domain);
            const res = await fetch(`${getApiBase()}/tenant/domains/${encoded}`, { method: 'DELETE', headers: buildHeaders() });
            const payload = await readResponsePayload(res);
            if (!res.ok) throw new Error(payload?.error || 'tenant_domain_delete_failed');
            setDomainState(payload);
            setPlatformSubdomain(getPlatformSubdomainValue(payload));
            addToast('Dominio eliminado', 'success');
        } catch (err) {
            console.error('Failed to remove tenant domain', err);
            addToast('No se pudo eliminar el dominio', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyText = async (value, label = 'Valor copiado') => {
        try {
            await navigator.clipboard.writeText(String(value || ''));
            addToast(label, 'success');
        } catch {
            addToast('No se pudo copiar al portapapeles', 'error');
        }
    };

    const connectedDomains = Array.isArray(domainState?.domains) ? domainState.domains : [];
    const currentPrimary = domainState?.primary_domain || 'Sin URL principal';
    const platform = domainState?.platform || {};
    const currentStoreUrl = safePublicUrl(currentPrimary);
    const assignedPlatformUrl = safePublicUrl(platform?.assigned_domain);
    const currentPrimaryDomain = normalizeDomainInput(currentPrimary);
    const assignedPlatformDomain = normalizeDomainInput(platform?.assigned_domain);
    const primaryIsPlatform = Boolean(currentPrimaryDomain && assignedPlatformDomain && currentPrimaryDomain === assignedPlatformDomain);
    const hasCustomPrimary = Boolean(currentStoreUrl && !primaryIsPlatform);
    const activePublishUrl = currentStoreUrl || assignedPlatformUrl;
    const draftDomainPlan = useMemo(() => inferDraftDnsPlan(customDomain, platform), [customDomain, platform]);
    const platformPreviewDomain = platform?.base_domain && platformSubdomain ? `${platformSubdomain}.${platform.base_domain}` : (platform?.assigned_domain || platform?.suggested_domain || '');
    const platformPreview = safePublicUrl(platformPreviewDomain) || platformPreviewDomain || '';

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
            <div onClick={(event) => event.stopPropagation()} className="admin-panel-surface relative flex h-full max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border shadow-2xl" style={panelStyle}>
                <div className="admin-header-surface flex items-center justify-between border-b px-5 py-4" style={headerStyle}>
                    <div className="flex items-center gap-3">
                        <div className="admin-accent-surface flex h-10 w-10 items-center justify-center rounded-2xl border"><Globe size={18} weight="bold" /></div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">Publicacion y dominios</p>
                            <h2 className="text-lg font-semibold tracking-tight admin-text-primary">Dominio propio o subdominio de plataforma</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => loadDomains().catch(() => {})} disabled={loading} className={ghostButtonClass} style={headerStyle}><ArrowsClockwise size={16} weight="bold" className={cn(loading && 'animate-spin')} />{loading ? 'Actualizando' : 'Actualizar'}</button>
                        <button type="button" onClick={onClose} className="admin-hover-surface flex h-9 w-9 items-center justify-center rounded-full border" style={headerStyle}><X size={18} weight="bold" className="admin-text-primary" /></button>
                    </div>
                </div>

                <div className="grid flex-1 gap-4 overflow-hidden p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <section className="admin-panel-surface flex min-h-0 flex-col overflow-hidden rounded-3xl border" style={panelStyle}>
                        <div className="admin-header-surface flex items-center justify-between border-b px-4 py-3" style={headerStyle}>
                            <div className="space-y-0.5"><p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">Estado actual</p><h3 className="text-sm font-semibold admin-text-primary">Inventario y verificacion de hosts</h3></div>
                            {currentStoreUrl ? <Chip label="Sitio publicado" tone="success" /> : <Chip label="Sin URL principal" tone="warning" />}
                        </div>

                        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                            <Card eyebrow="Dominios conectados" title="Estado y acciones" description="Revisa que URLs estan listas para publicar, que DNS espera cada una y que host quedara como principal. Desde aca puedes verificar, abrir, marcar principal o quitar un dominio." action={<button type="button" onClick={() => refreshVerification()} disabled={checkingDomain === '__all__'} className={ghostButtonClass} style={headerStyle}><ArrowsClockwise size={14} weight="bold" className={cn(checkingDomain === '__all__' && 'animate-spin')} />Verificar todo</button>}>
                                <div className="space-y-3">
                                    {connectedDomains.length ? connectedDomains.map((item) => {
                                        const publicUrl = safePublicUrl(item.domain);
                                        const verificationTone = getVerificationTone(item?.verification?.status);
                                        return (
                                            <div key={item.domain} className="rounded-2xl border p-5" style={surfaceStyle}>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                                        <div className="min-w-0 space-y-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="truncate text-base font-semibold" style={whiteTextPrimary}>{item.domain}</p>
                                                                {item.is_primary ? <Chip label="Principal" tone="success" /> : null}
                                                                <Chip label={item.connection_type === 'platform' ? 'Dominio de plataforma' : 'Dominio propio'} tone={item.connection_type === 'platform' ? 'info' : 'default'} />
                                                                <Chip label={item?.verification?.label || 'Pendiente'} tone={verificationTone} />
                                                            </div>
                                                            <p className="text-sm leading-relaxed" style={whiteTextMuted}>{item?.verification?.message || item?.dns_hint || 'Sin diagnostico todavia.'}</p>
                                                            {item?.verification?.vercel?.enabled ? <div className="flex flex-wrap items-center gap-2"><Chip label={`Vercel: ${item?.verification?.vercel?.status || 'pending'}`} tone={getVercelStatusTone(item?.verification?.vercel?.status)} />{item?.verification?.vercel?.error ? <p className="text-xs text-zinc-500">Detalle: {item.verification.vercel.error}</p> : null}</div> : null}
                                                            {item?.verification?.last_checked_at ? <p className="text-xs text-zinc-500">Ultima verificacion: {new Date(item.verification.last_checked_at).toLocaleString('es-AR')}</p> : null}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button type="button" onClick={() => refreshVerification(item.domain)} disabled={checkingDomain === item.domain} className={ghostButtonClass} style={headerStyle}><ArrowsClockwise size={14} weight="bold" className={cn(checkingDomain === item.domain && 'animate-spin')} />Verificar</button>
                                                            {!item.is_primary ? <button type="button" onClick={() => setPrimaryDomain(item.domain)} disabled={saving} className={ghostButtonClass} style={headerStyle}><CrownSimple size={14} weight="bold" />Hacer principal</button> : null}
                                                            <a href={publicUrl || '#'} target="_blank" rel="noreferrer" className={cn(ghostButtonClass, !publicUrl && 'pointer-events-none opacity-50')} style={headerStyle}><GlobeHemisphereWest size={14} weight="bold" />Abrir</a>
                                                            <button type="button" onClick={() => removeDomain(item.domain)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50" style={chipToneMap.warning}><Trash size={14} weight="bold" />Quitar</button>
                                                        </div>
                                                    </div>
                                                    {Array.isArray(item.required_records) && item.required_records.length ? <div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>DNS esperado</p>{item.required_records.map((record) => <RecordRow key={`${item.domain}-${record.type}-${record.host}-${record.value}`} record={record} onCopy={(value) => copyText(value, 'Registro DNS copiado')} />)}</div> : <div className="rounded-2xl border p-3" style={surfaceStyle}><p className="text-sm" style={whiteTextPrimary}>Este dominio lo sirve directamente la plataforma y no necesita DNS manual.</p></div>}
                                                    {(item?.verification?.observed_records?.a?.length || item?.verification?.observed_records?.cname?.length) ? <div className="rounded-2xl border p-3" style={surfaceStyle}><p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>DNS detectado</p><div className="mt-2 grid gap-2 md:grid-cols-2"><div><p className="text-xs font-semibold" style={whiteTextPrimary}>A</p><p className="mt-1 break-all text-xs text-zinc-500">{item.verification.observed_records.a.join(', ') || 'Sin registros A'}</p></div><div><p className="text-xs font-semibold" style={whiteTextPrimary}>CNAME</p><p className="mt-1 break-all text-xs text-zinc-500">{item.verification.observed_records.cname.join(', ') || 'Sin registros CNAME'}</p></div></div></div> : null}
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border px-5 py-10 text-center" style={surfaceStyle}><Globe size={28} weight="bold" style={whiteTextLabel} /><p className="text-base font-semibold" style={whiteTextPrimary}>Todavia no hay dominios conectados</p><p className="max-w-xl text-sm leading-relaxed" style={whiteTextMuted}>Puedes conectar un dominio que ya tengas o usar el subdominio de plataforma que se asigna automaticamente.</p></div>}
                                </div>
                            </Card>
                        </div>
                    </section>

                    <section className="admin-panel-surface flex min-h-0 flex-col overflow-hidden rounded-3xl border" style={panelStyle}>
                        <div className="admin-header-surface flex items-center justify-between border-b px-4 py-3" style={headerStyle}>
                            <div className="space-y-0.5"><p className="text-[10px] font-bold uppercase tracking-[0.24em] admin-accent-text">Publicacion</p><h3 className="text-sm font-semibold admin-text-primary">Dominios y link publicado</h3></div>
                            <Chip label={initialIntent === 'publish' ? 'Publicar' : (platform?.base_domain || 'Plataforma')} tone="info" />
                        </div>
                        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                            <Card eyebrow="Publicar ahora" title="URL publica del sitio" description="El sitio puede salir con dominio propio o con el subdominio Vase. Si conectas un dominio propio, queda como URL principal y el .vase.ar queda como respaldo.">
                                <div className="space-y-3">
                                    <div className="rounded-3xl border p-5" style={{ ...surfaceStyle, background: 'linear-gradient(135deg, #f8fafc 0%, #ecfeff 48%, #f0fdf4 100%)' }}>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={whiteTextLabel}>URL de publicacion</p>
                                                <p className="break-all text-lg font-black tracking-tight" style={whiteTextPrimary}>{activePublishUrl || platformPreview || 'Pendiente de generar'}</p>
                                                <p className="text-sm leading-relaxed" style={whiteTextMuted}>{hasCustomPrimary ? 'Dominio propio activo como URL principal.' : 'El sitio se publica por datos/version activa, no por deploy individual por cliente.'}</p>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                {activePublishUrl ? <a href={activePublishUrl} target="_blank" rel="noreferrer" className={ghostButtonClass} style={headerStyle}><GlobeHemisphereWest size={14} weight="bold" />Abrir</a> : null}
                                                {activePublishUrl ? <button type="button" onClick={() => copyText(activePublishUrl, 'Link publicado copiado')} className={ghostButtonClass} style={headerStyle}><Copy size={14} weight="bold" />Copiar</button> : null}
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={publishPlatformDomain} disabled={saving || !platform?.enabled} className="admin-accent-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"><RocketLaunch size={17} weight="bold" />{saving ? 'Publicando...' : hasCustomPrimary ? 'Guardar .vase.ar como respaldo' : (assignedPlatformUrl ? 'Publicar usando este .vase.ar' : 'Generar y publicar .vase.ar')}</button>
                                </div>
                            </Card>

                            <Card eyebrow="Dominio propio" title="Conectar un dominio que ya tienes" description="Escribe el dominio del negocio. Al conectarlo queda como principal y reemplaza el subdominio Vase para el publico.">
                                <div className="space-y-3">
                                    <div className="space-y-2"><label className="text-[11px] font-bold tracking-wide admin-input-label">Dominio del cliente</label><input className={inputClass} style={fieldStyle} placeholder="alessitech.space o www.alessitech.space" value={customDomain} onChange={(event) => setCustomDomain(event.target.value)} /></div>
                                    {draftDomainPlan ? <div className="space-y-3 rounded-2xl border p-5" style={surfaceStyle}><div className="flex flex-wrap items-center gap-2"><Chip label={draftDomainPlan.mode === 'apex' ? 'Dominio raiz' : draftDomainPlan.mode === 'subdomain' ? 'Subdominio' : 'Plataforma'} tone="info" /><Chip label={draftDomainPlan.connection_type === 'custom' ? 'Dominio propio' : 'Plataforma'} /></div><p className="text-sm leading-relaxed" style={whiteTextPrimary}>{draftDomainPlan.dns_hint}</p>{draftDomainPlan.required_records?.length ? <div className="space-y-2">{draftDomainPlan.required_records.map((record) => <RecordRow key={`draft-${record.type}-${record.host}-${record.value}`} record={record} onCopy={(value) => copyText(value, 'Registro DNS copiado')} />)}</div> : null}</div> : <div className="rounded-2xl border p-5" style={surfaceStyle}><p className="text-sm" style={whiteTextPrimary}>Escribe el dominio para ver la configuracion DNS recomendada.</p></div>}
                                    <button type="button" onClick={submitCustomDomain} disabled={saving} className="admin-accent-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle size={16} weight="bold" />{saving ? 'Guardando dominio...' : 'Conectar dominio propio'}</button>
                                </div>
                            </Card>

                            <Card eyebrow="Checklist" title="Salida en vivo" description="Orden recomendado para dejar un dominio operativo en esta arquitectura.">
                                <div className="space-y-3">
                                    <Step step="1" title="Elegir modo" description="Decide si el negocio sale con dominio propio o con el subdominio de plataforma." />
                                    <Step step="2" title="Publicar DNS" description={`Para dominio propio, publica los registros esperados hacia ${platform?.cname_target || 'tu-host-de-publicacion'} y ${platform?.apex_ip || 'tu-ip-publica'}.`} />
                                    <Step step="3" title="Verificar estado" description="Usa el boton Verificar para confirmar si ya resolvio DNS y el sitio esta listo." />
                                    <Step step="4" title="Marcar principal" description="Cuando tengas mas de un host, deja uno como principal para definir la URL publica del sitio." />
                                </div>
                            </Card>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DomainConnectModal;
