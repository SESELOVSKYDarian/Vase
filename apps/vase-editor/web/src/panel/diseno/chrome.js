// Menú de arriba y pie de página: lo que se ve en la tienda, con los valores de siempre si no hay nada cargado.
import { PIQUIM_FOOTER_DEFAULTS } from '../../data/piquimBranding.js';
import { normalizeInternalPath } from '../../utils/navigation.js';

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
        shopLinks: list(footer.shopLinks, list(footer.quickLinks, base.shopLinks || [])),
        helpLinks: list(footer.helpLinks, base.helpLinks || []),
        legalLinks: list(footer.legalLinks, base.legalLinks || []),
        newsletter: { ...(base.newsletter || { enabled: false }), ...(footer.newsletter || {}) },
        legalText: footer.legalText || base.legalText || '',
        contact: { ...(footer.contact || {}) },
        whatsapp_enabled: footer.whatsapp_enabled !== false,
    };
}

export const FOOTER_COLUMNS = [
    ['shopLinks', 'Comprar'],
    ['helpLinks', 'Ayuda'],
    ['legalLinks', 'Legales'],
];

export const linksSummary = (links = []) => links.map((link) => link?.label).filter(Boolean).join(' · ') || 'Sin links';
