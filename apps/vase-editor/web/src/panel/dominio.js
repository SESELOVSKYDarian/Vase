// Ajustes › Dominio: textos y orden de las direcciones de la tienda (GET /tenant/domains).

export function normalizeDomainInput(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .replace(/\.$/, '');
}

export const isValidDomain = (value) => /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(normalizeDomainInput(value));

const STATUS = {
    active: ['Conectado y seguro', 'g'],
    attention: ['Revisar', 'y'],
    dns_pending: ['Esperando los DNS', 'b'],
};

export function domainStatus(item = {}) {
    const verification = item.verification || {};
    const [label, tone] = STATUS[verification.status] || [verification.label || 'Sin comprobar', ''];
    return { label, tone, message: verification.message || '', checkedAt: verification.last_checked_at || null };
}

// La principal primero, después las propias y al final el link de Vase.
export function sortDomains(domains = []) {
    const rank = (item) => (item.is_primary ? 0 : item.connection_type === 'platform' ? 2 : 1);
    return [...domains].sort((a, b) => rank(a) - rank(b) || String(a.domain).localeCompare(String(b.domain)));
}

export function domainKind(item = {}) {
    if (item.connection_type === 'platform') return 'Dirección de Vase · siempre funciona';
    if (item.mode === 'subdomain') return 'Subdominio propio';
    return 'Dominio propio';
}

// Lo que hoy responde el dominio, para comparar con lo que hay que cargar.
export function observedText(item = {}) {
    const observed = item.verification?.observed_records || {};
    const parts = [];
    if (Array.isArray(observed.a) && observed.a.length) parts.push(`A → ${observed.a.join(', ')}`);
    if (Array.isArray(observed.cname) && observed.cname.length) parts.push(`CNAME → ${observed.cname.join(', ')}`);
    return parts.join(' · ');
}

// Valores que todavía no están configurados en el servidor (los muestra el servidor como "tu-…").
export const isPlaceholderValue = (value) => /^tu-/.test(String(value || ''));

export function domainError(code, domain = '') {
    switch (code) {
        case 'domain_required': return 'Escribí el dominio que querés conectar.';
        case 'invalid_domain': return domain ? `${domain} no parece un dominio. Escribilo así: mitienda.com` : 'Escribilo así: mitienda.com';
        case 'domain_in_use': return domain ? `${domain} ya está conectado a otra tienda.` : 'Ese dominio ya está conectado a otra tienda.';
        case 'platform_domain_not_configured': return 'La dirección de Vase todavía no está disponible.';
        case 'subdomain_required': return 'Escribí el nombre que querés para tu dirección de Vase.';
        default: return 'No se pudo hacer. Probá de nuevo.';
    }
}
