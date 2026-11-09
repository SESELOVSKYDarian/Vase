// Menú de arriba y pie de página: lo que se ve en la tienda, con los valores de siempre si no hay nada cargado.
import { PIQUIM_FOOTER_DEFAULTS } from '../../data/piquimBranding.js';
import { normalizeInternalPath } from '../../utils/navigation.js';
import { isExtraNavLink } from '../../utils/storeTexts.js';

export const HEADER_ID = '__header';
export const FOOTER_ID = '__footer';

const DEFAULT_NAV = [
    { label: 'Inicio', href: '/' },
    { label: 'Catalogo', href: '/catalog' },
    { label: 'Nosotros', href: '/about' },
];

const GENERIC_FOOTER = {
    description: 'Catalogo, pedidos y atencion comercial desde una tienda online personalizada.',
    shopLinks: [
        { label: 'Inicio', href: '/' },
        { label: 'Catalogo', href: '/catalog' },
        { label: 'Sobre Nosotros', href: '/about' },
    ],
    helpLinks: [],
    legalLinks: [{ label: 'Terminos', href: '/terms' }],
    newsletter: { enabled: false },
    legalText: '© 2026 Vase. Todos los derechos reservados.',
};

const list = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback);

// Los mismos links que arma la tienda (StoreLayout) para el menú de arriba.
export function navLinksFromSettings(settings = {}) {
    const configured = Array.isArray(settings?.branding?.navbar?.links) ? settings.branding.navbar.links : [];
    return (configured.length ? configured : DEFAULT_NAV).map((item) => {
        const label = typeof item === 'string' ? item : item?.label || '';
        const rawHref = typeof item === 'string' ? item : item?.href || item?.path || label;
        return { ...(typeof item === 'object' ? item : {}), label: label || 'Link', href: normalizeInternalPath(rawHref, '/') };
    });
}

// Tiendas sin plantilla propia: Productos, Sobre nosotros y Contactanos son fijos; el resto son links agregados.
export const headerExtraLinks = (settings = {}) => navLinksFromSettings(settings).filter(isExtraNavLink);

export function withHeaderExtraLinks(settings = {}, extras = []) {
    const fixed = navLinksFromSettings(settings).filter((link) => !isExtraNavLink(link));
    return [...fixed, ...extras.map((link) => ({ ...link, custom: true }))];
}

export function navbarProps(settings = {}, isPiquim = false) {
    const navbar = settings?.branding?.navbar || {};
    return {
        navLinks: navLinksFromSettings(settings),
        isPiquimPreset: isPiquim,
        showSearch: navbar.show_search !== false,
        showWishlist: navbar.show_wishlist !== false,
        showCart: navbar.show_cart !== false,
        showAccount: navbar.show_account !== false,
        registerLabel: navbar.register_label || 'Registrarse',
        registerHref: navbar.register_href || '/signup',
    };
}

// Lo que muestra el pie hoy: lo cargado o, si no hay nada, lo que trae la plantilla.
export function footerValues(settings = {}, isPiquim = false) {
    const footer = settings?.branding?.footer || {};
    const base = isPiquim ? PIQUIM_FOOTER_DEFAULTS : GENERIC_FOOTER;
    return {
        description: footer.description || base.description || '',
        // El pie de las tiendas sin plantilla propia lee primero quickLinks.
        shopLinks: isPiquim
            ? list(footer.shopLinks, list(footer.quickLinks, base.shopLinks || []))
            : list(footer.quickLinks, list(footer.shopLinks, base.shopLinks || [])),
        helpLinks: list(footer.helpLinks, base.helpLinks || []),
        legalLinks: list(footer.legalLinks, base.legalLinks || []),
        newsletter: { ...(base.newsletter || { enabled: false }), ...(footer.newsletter || {}) },
        legalText: footer.legalText || base.legalText || '',
        contact: { ...(footer.contact || {}) },
        labels: { ...(footer.labels || {}) },
        whatsapp_enabled: footer.whatsapp_enabled !== false,
    };
}

export const FOOTER_COLUMNS = [
    ['shopLinks', 'Comprar'],
    ['helpLinks', 'Ayuda'],
    ['legalLinks', 'Legales'],
];

// El pie de las tiendas sin plantilla propia solo tiene una columna de links y los legales.
export const footerColumns = (isPiquim) => (isPiquim ? FOOTER_COLUMNS : [['shopLinks', 'Enlaces'], ['legalLinks', 'Legales']]);

export function footerSocials(footer = {}) {
    const fromLinks = {};
    (Array.isArray(footer.socialLinks) ? footer.socialLinks : []).forEach((item) => {
        const href = String(item?.href || '');
        const type = item?.type || SOCIALS.map(([key]) => key).find((key) => href.toLowerCase().includes(key));
        if (type && href) fromLinks[type] = href;
    });
    return { ...fromLinks, ...(footer.socials || {}) };
}

export const linksSummary = (links = []) => links.map((link) => link?.label).filter(Boolean).join(' · ') || 'Sin links';

export const SOCIALS = [
    ['instagram', 'Instagram', 'https://instagram.com/tu-tienda'],
    ['facebook', 'Facebook', 'https://facebook.com/tu-tienda'],
    ['tiktok', 'TikTok', 'https://tiktok.com/@tu-tienda'],
    ['youtube', 'YouTube', 'https://youtube.com/@tu-tienda'],
];

// Aviso si el link de una red no es una dirección completa.
export function socialError(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return /^https?:\/\/\S+\.\S+/i.test(text) ? '' : 'Pegá el link completo, que empiece con https://';
}
