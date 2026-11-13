// Historial detallado: qué cambió de una versión a la otra, agrupado por parte de la tienda y con el
// antes y el después de cada cosa (colores con su muestra, textos, fotos y bloques de cada página).

const same = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const GROUPS = [
    ['theme', 'Colores y estilo'],
    ['branding', 'Logo, menú y textos'],
    ['seo', 'Google y redes'],
    ['commerce', 'Ajustes de la tienda'],
];

const PAGES = [['home', 'Página de inicio'], ['about', 'Página Nosotros']];

// Nombres simples de los campos que más se tocan. El resto se arma con el nombre del campo.
const LABELS = {
    // estilo
    primary: 'Color principal', secondary: 'Color secundario', accent: 'Color de acento', text: 'Color del texto',
    muted_text: 'Texto suave', panel_bg: 'Fondo de los paneles', canvas_bg: 'Fondo', shell_bg: 'Fondo general',
    sidebar_bg: 'Fondo del menú', mode: 'Modo claro u oscuro', catalog: 'Catálogo', font: 'Tipografía', fontFamily: 'Tipografía',
    radius: 'Bordes redondeados', buttonRadius: 'Bordes de los botones', admin_panel: 'Panel',
    // marca
    logo: 'Logo', favicon_url: 'Ícono de la pestaña', name: 'Nombre', navbar: 'Menú de arriba', links: 'Links',
    footer: 'Pie de página', legal_pages: 'Páginas legales', catalog_page: 'Textos del catálogo', description: 'Descripción',
    legalText: 'Texto legal', newsletter: 'Suscripción', shopLinks: 'Links de la tienda', helpLinks: 'Links de ayuda', legalLinks: 'Links legales',
    // google
    title: 'Título', keyword: 'Palabra clave', secondaryKeywords: 'Otras palabras clave', ogTitle: 'Título al compartir',
    ogDescription: 'Descripción al compartir', ogImage: 'Imagen al compartir', indexable: 'Aparece en Google', canonicalPath: 'Dirección principal', tracking: 'Mediciones',
    // tienda
    branches: 'Sucursales', shipping_zones: 'Zonas de envío', payment_methods: 'Medios de pago', bank_transfer: 'Datos de transferencia',
    whatsapp_number: 'WhatsApp', order_channels: 'Cómo llegan los pedidos', reviews_enabled: 'Opiniones de productos', tax_rate: 'IVA',
    price_tier_labels: 'Nombres de las listas de precios', guest_price_list_id: 'Precios para quien no entró', manual_approval: 'Aprobación de clientes',
    auto_approve_wholesale: 'Aprobación automática', legal_company_name: 'Nombre legal', phone: 'Teléfono', email: 'Correo', address: 'Dirección',
    price: 'Precio', enabled: 'Activado', label: 'Nombre', href: 'Link',
    // bloques
    heading: 'Título', headline: 'Título', subtitle: 'Subtítulo', subheading: 'Subtítulo', body: 'Texto', content: 'Texto',
    buttonText: 'Texto del botón', ctaText: 'Texto del botón', ctaLink: 'Link del botón', buttonLink: 'Link del botón', link: 'Link',
    image: 'Foto', imageUrl: 'Foto', src: 'Foto', backgroundImage: 'Foto de fondo', video: 'Video', videoUrl: 'Video',
    slides: 'Fotos', items: 'Elementos', products: 'Productos', badge: 'Etiqueta de arriba', styles: 'Estilo', background: 'Fondo', color: 'Color',
};

const humanize = (key) => {
    const text = String(key).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
};
const labelOf = (key) => LABELS[key] || humanize(key);

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;
const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i;

function kindOf(key, before, after) {
    const sample = typeof after === 'string' && after ? after : before;
    if (typeof sample === 'string' && COLOR.test(sample.trim())) return 'color';
    if (typeof sample === 'string' && (IMAGE.test(sample) || /logo|image|img|foto|favicon|src/i.test(String(key)) && /^(https?:|\/)/.test(sample))) return 'image';
    if (typeof sample === 'boolean' || typeof before === 'boolean') return 'bool';
    return 'text';
}

const plain = (value) => String(value ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const short = (value, max = 90) => {
    const text = plain(value);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// Lista de cosas con nombre (links, sucursales, zonas): qué se agregó o quitó.
function namedListChanges(label, before, after) {
    const name = (item) => plain(isObject(item) ? item.label || item.name || item.title || item.href || '' : item);
    const beforeNames = before.map(name).filter(Boolean);
    const afterNames = after.map(name).filter(Boolean);
    const rows = [];
    for (const item of afterNames) if (!beforeNames.includes(item)) rows.push({ kind: 'note', label, text: `Agregaste “${item}”` });
    for (const item of beforeNames) if (!afterNames.includes(item)) rows.push({ kind: 'note', label, text: `Quitaste “${item}”` });
    if (!rows.length) rows.push({ kind: 'note', label, text: before.length === after.length ? 'Cambiaste datos adentro' : `Ahora son ${after.length}` });
    return rows;
}

// Recorre dos valores y devuelve una fila por cada cosa que cambió (hasta 3 niveles de profundidad).
function walk(key, before, after, path, depth, out) {
    if (same(before, after)) return;
    const label = path.length ? `${path.join(' › ')} › ${labelOf(key)}` : labelOf(key);
    if (Array.isArray(before) || Array.isArray(after)) {
        const left = Array.isArray(before) ? before : [];
        const right = Array.isArray(after) ? after : [];
        const named = [...left, ...right].some((item) => isObject(item) && (item.label || item.name || item.title));
        if (named || right.every((item) => typeof item !== 'object')) {
            out.push(...namedListChanges(label, left, right));
            return;
        }
        right.forEach((item, index) => walk(String(index + 1), left[index], item, [...path, labelOf(key)], depth + 1, out));
        if (left.length > right.length) out.push({ kind: 'note', label, text: `Quitaste ${left.length - right.length}` });
        return;
    }
    if ((isObject(before) || isObject(after)) && depth < 3) {
        const left = isObject(before) ? before : {};
        const right = isObject(after) ? after : {};
        for (const child of new Set([...Object.keys(left), ...Object.keys(right)])) {
            walk(child, left[child], right[child], [...path, labelOf(key)], depth + 1, out);
        }
        return;
    }
    if (isObject(before) || isObject(after)) {
        out.push({ kind: 'note', label, text: 'Cambiaste la configuración' });
        return;
    }
    const kind = kindOf(key, before, after);
    if (kind === 'bool') {
        out.push({ kind: 'note', label, text: after ? 'Lo activaste' : 'Lo desactivaste' });
        return;
    }
    out.push({ kind, label, before: kind === 'text' ? short(before) : before ?? null, after: kind === 'text' ? short(after) : after ?? null });
}

function settingsGroups(older, newer) {
    const groups = [];
    for (const [key, title] of GROUPS) {
        const before = isObject(older?.settings?.[key]) ? older.settings[key] : {};
        const after = isObject(newer?.settings?.[key]) ? newer.settings[key] : {};
        if (same(before, after)) continue;
        const rows = [];
        for (const child of new Set([...Object.keys(before), ...Object.keys(after)])) walk(child, before[child], after[child], [], 0, rows);
        if (rows.length) groups.push({ title, rows });
    }
    return groups;
}

function blockDetails(before, after) {
    const rows = [];
    const left = isObject(before?.props) ? before.props : {};
    const right = isObject(after?.props) ? after.props : {};
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) walk(key, left[key], right[key], [], 1, rows);
    return rows;
}

function pageGroups(older, newer, labelFor) {
    const groups = [];
    for (const [slug, title] of PAGES) {
        const before = Array.isArray(older?.pages?.[slug]) ? older.pages[slug] : [];
        const after = Array.isArray(newer?.pages?.[slug]) ? newer.pages[slug] : [];
        if (same(before, after)) continue;
        const name = (block) => labelFor(slug, block);
        const beforeById = new Map(before.map((block, index) => [block?.id, { block, index }]));
        const afterIds = new Set(after.map((block) => block?.id));
        const rows = [];
        after.forEach((block, index) => {
            const previous = beforeById.get(block?.id);
            if (!previous) {
                rows.push({ kind: 'block', action: 'add', name: name(block), text: `En el lugar ${index + 1}` });
                return;
            }
            const wasHidden = previous.block?.enabled === false;
            const isHidden = block?.enabled === false;
            if (wasHidden !== isHidden) rows.push({ kind: 'block', action: isHidden ? 'hide' : 'show', name: name(block), text: isHidden ? 'Ya no se ve en la tienda' : 'Vuelve a verse en la tienda' });
            const details = blockDetails(previous.block, block);
            if (details.length) rows.push({ kind: 'block', action: 'edit', name: name(block), details });
            if (previous.index !== index) rows.push({ kind: 'block', action: 'move', name: name(block), text: `Del lugar ${previous.index + 1} al ${index + 1}` });
        });
        before.forEach((block) => {
            if (!afterIds.has(block?.id)) rows.push({ kind: 'block', action: 'remove', name: name(block), text: 'Ya no está en la página' });
        });
        // Si solo se corrieron por agregar o quitar uno, no hace falta decir que se movieron todos.
        const structural = rows.some((row) => row.action === 'add' || row.action === 'remove');
        const visible = structural ? rows.filter((row) => row.action !== 'move') : rows;
        if (visible.length) groups.push({ title, rows: visible });
        else groups.push({ title, rows: [{ kind: 'note', label: title, text: 'Cambios en los bloques' }] });
    }
    return groups;
}

/** Grupos de cambios de older a newer: [{ title, rows }]. */
export function detailChanges(older, newer, labelFor = (_, block) => String(block?.type || 'Bloque')) {
    return [...settingsGroups(older, newer), ...pageGroups(older, newer, labelFor)];
}

/** Cuántas cosas cambiaron (para la etiqueta de cada versión). */
export function countChanges(groups) {
    return groups.reduce((total, group) => total + group.rows.reduce((sum, row) => sum + (row.details ? Math.max(1, row.details.length) : 1), 0), 0);
}
