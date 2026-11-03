// Ayudas para los campos de foto, video y link de los editores.

export const isInlineData = (value) => /^data:/i.test(String(value || '').trim());

// Tamaño aproximado de un archivo incrustado como base64.
export function inlineBytes(value) {
    const text = String(value || '');
    const comma = text.indexOf(',');
    if (!isInlineData(text) || comma < 0) return 0;
    return Math.round(((text.length - comma - 1) * 3) / 4);
}

export function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// Nombre corto para mostrar en vez del link entero.
export function mediaName(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (isInlineData(text)) return `Archivo dentro de la página · ${formatBytes(inlineBytes(text))}`;
    const clean = text.split(/[?#]/)[0];
    const last = clean.split('/').filter(Boolean).pop() || clean;
    try {
        return decodeURIComponent(last);
    } catch {
        return last;
    }
}

export const fileMatches = (file, accept = '') => {
    if (!file) return false;
    const rules = String(accept || '').split(',').map((rule) => rule.trim().toLowerCase()).filter(Boolean);
    if (!rules.length) return true;
    const type = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    return rules.some((rule) => (rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : rule.startsWith('.') ? name.endsWith(rule) : type === rule));
};

// Páginas de la tienda para elegir rápido en un campo de link.
export const LINK_SUGGESTIONS = [
    { href: '/', label: 'Inicio' },
    { href: '/catalog', label: 'Catálogo' },
    { href: '/about', label: 'Nosotros' },
    { href: '/signup', label: 'Crear cuenta' },
    { href: '/login', label: 'Ingresar' },
    { href: '/cart', label: 'Carrito' },
    { href: '/profile', label: 'Mi cuenta' },
];

export function describeHref(href) {
    const value = String(href || '').trim();
    if (!value) return { kind: 'empty', text: 'Sin link' };
    const known = LINK_SUGGESTIONS.find((item) => item.href === value);
    if (known) return { kind: 'page', text: `Página: ${known.label}` };
    if (/^\/catalog\?/i.test(value) || /^\/catalog\//i.test(value)) return { kind: 'page', text: 'Una parte del catálogo' };
    if (/^\/product\//i.test(value)) return { kind: 'page', text: 'Un producto' };
    if (/^#/.test(value)) return { kind: 'anchor', text: 'Una sección de esta página' };
    if (/^\//.test(value)) return { kind: 'page', text: 'Página de la tienda' };
    if (/wa\.me|whatsapp/i.test(value)) return { kind: 'external', text: 'WhatsApp' };
    if (/^mailto:/i.test(value)) return { kind: 'external', text: 'Correo' };
    if (/^https?:\/\/\S+\.\S+/i.test(value)) return { kind: 'external', text: `Otro sitio: ${value.replace(/^https?:\/\//i, '').split('/')[0]}` };
    return { kind: 'invalid', text: 'Revisá el link: empezá con / para una página de la tienda o con https:// para otro sitio' };
}
