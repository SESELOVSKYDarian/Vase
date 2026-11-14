// Parte de DomainConnectModal.jsx: inputClass, ghostButtonClass, panelStyle, headerStyle, surfaceStyle, fieldStyle y más.
import { Copy } from '@phosphor-icons/react';
import { getTenantHeaders } from '../../../../utils/api';

export const inputClass = 'admin-input-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all duration-200';
export const ghostButtonClass = 'admin-hover-surface inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium admin-text-primary transition-all disabled:cursor-not-allowed disabled:opacity-50';
export const panelStyle = { borderColor: 'var(--admin-border)' };
export const headerStyle = { borderColor: 'var(--admin-border-soft)' };
export const surfaceStyle = {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.10)',
    boxShadow: '0 18px 38px rgba(15, 23, 42, 0.06)',
};
export const fieldStyle = {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.12)',
    color: '#0f172a',
};
export const whiteTextPrimary = { color: '#0f172a' };
export const whiteTextMuted = { color: '#475569' };
export const whiteTextLabel = { color: '#64748b' };
export const whiteStepBadgeStyle = { backgroundColor: '#111827', color: '#ffffff' };

export const chipToneMap = {
    success: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.24)' },
    warning: { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.24)' },
    info: { backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#7dd3fc', borderColor: 'rgba(56, 189, 248, 0.24)' },
    default: { backgroundColor: 'var(--admin-hover)', color: 'var(--admin-muted)', borderColor: 'var(--admin-border-soft)' },
};

export const readResponsePayload = async (res) => {
    const text = await res.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const buildHeaders = () => {
    const token = localStorage.getItem('teflon_token');
    return {
        ...getTenantHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const normalizeDomainInput = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.$/, '');

export const safePublicUrl = (domain) => {
    const value = normalizeDomainInput(domain);
    if (!value || value === 'sin url principal') return null;
    return `https://${value}`;
};

export const getPlatformSubdomainValue = (payload) =>
    String(payload?.platform?.assigned_subdomain || payload?.platform?.suggested_subdomain || '')
        .trim()
        .toLowerCase();

export const resolveDomainErrorMessage = (errorCode, domainValue) => {
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

export const resolvePlatformErrorMessage = (errorCode) => {
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

export const getVerificationTone = (status) => {
    switch (status) {
        case 'active': return 'success';
        case 'attention': return 'warning';
        case 'dns_pending': return 'info';
        default: return 'default';
    }
};

export const getVercelStatusTone = (status) => {
    switch (status) {
        case 'verified': return 'success';
        case 'pending': return 'info';
        case 'error': return 'warning';
        default: return 'default';
    }
};

export const inferDraftDnsPlan = (domain, platform) => {
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

export const Chip = ({ label, tone = 'default' }) => (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={chipToneMap[tone] || chipToneMap.default}>{label}</span>
);

export const Card = ({ eyebrow, title, description, action, children }) => (
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

export const Step = ({ step, title, description }) => (
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

export const RecordRow = ({ record, onCopy }) => (
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
