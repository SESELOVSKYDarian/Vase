export const FEATURED_VARIANT_OPTIONS = [
    { value: 'classic', label: 'Clasico (actual)' },
    { value: 'modern', label: 'Grid moderno' },
    { value: 'high_energy', label: 'Grid alta energia' },
    { value: 'luxury', label: 'Grid luxury' },
    { value: 'masonry', label: 'Masonry Asimétrico' },
    { value: 'snap', label: 'Carrusel Snap' },
    { value: 'minimal', label: 'Lista Minimalista' },
];

export const FEATURED_COLOR_FIELDS = {
    modern: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'cardBackgroundColor', label: 'Card fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'subtitleColor', label: 'Subtitulo' },
        { key: 'accentColor', label: 'Acento' },
        { key: 'priceColor', label: 'Precio' },
        { key: 'buttonBackgroundColor', label: 'Boton fondo' },
        { key: 'buttonTextColor', label: 'Boton texto' },
    ],
    high_energy: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'cardBackgroundColor', label: 'Card fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'subtitleColor', label: 'Subtitulo' },
        { key: 'accentColor', label: 'Acento' },
        { key: 'priceColor', label: 'Precio' },
        { key: 'buttonBackgroundColor', label: 'Boton fondo' },
        { key: 'buttonTextColor', label: 'Boton texto' },
        { key: 'saleBadgeColor', label: 'Badge oferta' },
    ],
    luxury: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'cardBackgroundColor', label: 'Card fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'subtitleColor', label: 'Subtitulo' },
        { key: 'accentColor', label: 'Acento' },
        { key: 'priceColor', label: 'Precio' },
        { key: 'buttonBackgroundColor', label: 'Boton fondo' },
        { key: 'buttonTextColor', label: 'Boton texto' },
        { key: 'borderColor', label: 'Bordes' },
    ],
};

const STYLE_DEFAULTS_BY_VARIANT = {
    modern: {
        backgroundColor: '#ffffff',
        cardBackgroundColor: '#ffffff',
        titleColor: '#0f172a',
        subtitleColor: '#64748b',
        accentColor: '#f97316',
        priceColor: '#f97316',
        buttonBackgroundColor: '#f1f5f9',
        buttonTextColor: '#0f172a',
    },
    high_energy: {
        backgroundColor: '#ffffff',
        cardBackgroundColor: '#ffffff',
        titleColor: '#0f172a',
        subtitleColor: '#475569',
        accentColor: '#f97316',
        priceColor: '#f97316',
        buttonBackgroundColor: '#0f172a',
        buttonTextColor: '#ffffff',
        saleBadgeColor: '#dc2626',
    },
    luxury: {
        backgroundColor: '#fdfcfb',
        cardBackgroundColor: '#ffffff',
        titleColor: '#0a192f',
        subtitleColor: '#64748b',
        accentColor: '#c5a059',
        priceColor: '#c5a059',
        buttonBackgroundColor: '#0a192f',
        buttonTextColor: '#ffffff',
        borderColor: '#e2e8f0',
    },
    masonry: {},
    snap: {},
    minimal: {},
};

export const normalizeFeaturedVariant = (variant) =>
    FEATURED_VARIANT_OPTIONS.some((item) => item.value === variant) ? variant : 'classic';

export const getDefaultFeaturedStyles = (variant) => {
    const normalizedVariant = normalizeFeaturedVariant(variant);
    return { ...(STYLE_DEFAULTS_BY_VARIANT[normalizedVariant] || {}) };
};

export const normalizeFeaturedStyles = (variant, styles) => {
    const defaults = getDefaultFeaturedStyles(variant);
    const source = styles && typeof styles === 'object' ? styles : {};
    const next = { ...defaults };
    Object.keys(defaults).forEach((key) => {
        if (typeof source[key] === 'string' && source[key].trim().length > 0) {
            next[key] = source[key];
        }
    });
    return next;
};
