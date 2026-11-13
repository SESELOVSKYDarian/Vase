// Qué cambió entre dos versiones del diseño, en palabras simples, para el historial.

const SETTINGS_PARTS = [
    ['theme', 'colores y estilo'],
    ['branding', 'logo, textos y menú'],
    ['seo', 'Google y redes'],
    ['commerce', 'ajustes de la tienda'],
];

const PAGE_PARTS = [
    ['home', 'página de inicio'],
    ['about', 'página Nosotros'],
];

const same = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export function changedParts(previous, next) {
    const parts = [];
    for (const [key, label] of SETTINGS_PARTS) {
        if (!same(previous?.settings?.[key], next?.settings?.[key])) parts.push(label);
    }
    for (const [key, label] of PAGE_PARTS) {
        if (!same(previous?.pages?.[key], next?.pages?.[key])) parts.push(label);
    }
    return parts;
}

export function historySummary(parts) {
    if (!parts.length) return 'Cambios en el diseño';
    const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
    return `Antes de cambiar ${list}`;
}

// ───── Qué cambió de una versión a la otra, cosa por cosa, para el historial ─────

const KEY_LABELS = {
    theme: {},
    branding: {
        logo: 'el logo',
        favicon_url: 'el ícono de la pestaña',
        navbar: 'el menú de arriba',
        footer: 'el pie de página',
        legal_pages: 'las páginas legales',
        catalog_page: 'los textos del catálogo',
        name: 'el nombre de la tienda',
    },
    seo: {
        title: 'el título en Google',
        description: 'la descripción en Google',
        keyword: 'las palabras clave',
        secondaryKeywords: 'las palabras clave',
        ogTitle: 'cómo se ve al compartir',
        ogDescription: 'cómo se ve al compartir',
        ogImage: 'cómo se ve al compartir',
        indexable: 'si aparece en Google',
        canonicalPath: 'la dirección principal en Google',
        tracking: 'las mediciones',
    },
    commerce: {
        branches: 'las sucursales',
        shipping_zones: 'los envíos',
        payment_methods: 'los medios de pago',
        bank_transfer: 'los datos de transferencia',
        whatsapp_number: 'el WhatsApp',
        order_channels: 'cómo llegan los pedidos',
        reviews_enabled: 'las opiniones de productos',
        tax_rate: 'el IVA',
        price_tier_labels: 'los nombres de las listas de precios',
        guest_price_list_id: 'los precios que ve quien no entró',
        manual_approval: 'la aprobación de clientes',
        auto_approve_wholesale: 'la aprobación de clientes',
        legal_company_name: 'el nombre legal',
        phone: 'los datos de contacto',
        email: 'los datos de contacto',
        address: 'los datos de contacto',
    },
};

const GROUP_FALLBACK = {
    theme: 'los colores y el estilo',
    branding: 'los textos de la tienda',
    seo: 'Google y redes',
    commerce: 'los ajustes de la tienda',
};

const PAGE_NAMES = { home: 'Inicio', about: 'Nosotros' };

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function settingsChanges(older, newer) {
    const out = [];
    for (const group of Object.keys(GROUP_FALLBACK)) {
        const before = asObject(older?.settings?.[group]);
        const after = asObject(newer?.settings?.[group]);
        if (same(before, after)) continue;
        const labels = new Set();
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
            if (same(before[key], after[key])) continue;
            labels.add(KEY_LABELS[group]?.[key] || GROUP_FALLBACK[group]);
        }
        for (const label of labels) out.push(`Cambiaste ${label}`);
    }
    return out;
}

function pageChanges(older, newer, labelFor) {
    const out = [];
    for (const slug of Object.keys(PAGE_NAMES)) {
        const before = Array.isArray(older?.pages?.[slug]) ? older.pages[slug] : [];
        const after = Array.isArray(newer?.pages?.[slug]) ? newer.pages[slug] : [];
        if (same(before, after)) continue;
        const where = PAGE_NAMES[slug];
        const name = (block) => `“${labelFor(slug, block)}”`;
        const beforeById = new Map(before.map((block) => [block?.id, block]));
        const afterById = new Map(after.map((block) => [block?.id, block]));
        for (const block of after) {
            const old = beforeById.get(block?.id);
            if (!old) out.push(`${where}: agregaste ${name(block)}`);
            else if ((old.enabled === false) !== (block.enabled === false)) out.push(`${where}: ${block.enabled === false ? 'ocultaste' : 'mostraste'} ${name(block)}`);
            else if (!same(old.props, block.props) || old.type !== block.type) out.push(`${where}: editaste ${name(block)}`);
        }
        for (const block of before) {
            if (!afterById.has(block?.id)) out.push(`${where}: quitaste ${name(block)}`);
        }
        const order = (list) => list.filter((block) => beforeById.has(block?.id) && afterById.has(block?.id)).map((block) => block.id);
        if (!same(order(before), order(after))) out.push(`${where}: cambiaste el orden de los bloques`);
        if (!out.some((line) => line.startsWith(`${where}:`))) out.push(`${where}: cambios en los bloques`);
    }
    return out;
}

// Lista de cambios en palabras simples: de la versión anterior (older) a esta (newer).
export function describeChanges(older, newer, labelFor = (_, block) => String(block?.type || 'Bloque')) {
    return [...settingsChanges(older, newer), ...pageChanges(older, newer, labelFor)].map(capital);
}

// Un punto nuevo cada vez que se vuelve a editar después de un rato: así quedan los cambios
// grandes y no cada tecla.
export const CHECKPOINT_GAP_MS = 10 * 60 * 1000;

export function shouldCheckpoint(lastCheckpointAt, now = Date.now()) {
    return !lastCheckpointAt || now - lastCheckpointAt >= CHECKPOINT_GAP_MS;
}

export function historyWhen(value, now = new Date()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
    if (minutes < 1) return 'Recién';
    if (minutes < 60) return `Hace ${minutes} min`;
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Hoy, ${time}`;
    return `${date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${time}`;
}
