export const FEATURED_VARIANT_OPTIONS = [
    { value: 'classic', label: 'Clasico' },
    { value: 'modern', label: 'Grilla Moderna' },
    { value: 'high_energy', label: 'Grilla Alta Energia' },
    { value: 'luxury', label: 'Grilla Lujo' },
    { value: 'masonry', label: 'Mosaico Asimetrico' },
    { value: 'snap', label: 'Carrusel Deslizante' },
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
    masonry: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'accentColor', label: 'Acento' },
    ],
    snap: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'accentColor', label: 'Acento' },
    ],
    minimal: [
        { key: 'backgroundColor', label: 'Fondo' },
        { key: 'titleColor', label: 'Titulo' },
        { key: 'textColor', label: 'Texto' },
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

// Slot de color → token de tema. Slots ausentes no heredan del tema.
export const FEATURED_THEME_TOKEN_MAP = {
    classic: {
        titleColor: 'text',
        accentColor: 'primary',
        ctaBg: 'primary',
        ctaTextColor: 'background',
        cardBg: 'card_bg',
        borderColor: 'border',
    },
    modern: {
        titleColor: 'text',
        accentColor: 'primary',
        ctaBg: 'primary',
        ctaTextColor: 'background',
        cardBg: 'card_bg',
        borderColor: 'border',
        sectionBg: 'background',
    },
    high_energy: {
        titleColor: 'text',
        accentColor: 'accent',
        ctaBg: 'primary',
        ctaTextColor: 'background',
    },
    luxury: {
        titleColor: 'text',
        accentColor: 'accent',
        buttonBackgroundColor: 'primary',
        buttonTextColor: 'background',
        borderColor: 'border',
    },
    // masonry, snap, minimal: usan clases Tailwind para colores (no hex), no soportan tokens de tema.
};

export const normalizeFeaturedStyles = (variant, styles, themeColors = null) => {
    const normalizedVariant = normalizeFeaturedVariant(variant);
    const defaults = getDefaultFeaturedStyles(variant);
    const source = styles && typeof styles === 'object' ? styles : {};
    const themeMap = FEATURED_THEME_TOKEN_MAP[normalizedVariant] || {};
    const next = { ...defaults };

    Object.keys(defaults).forEach((key) => {
        const override = source[key];
        if (typeof override === 'string' && override.trim().length > 0) {
            next[key] = override;
            return;
        }
        const tokenName = themeMap[key];
        if (tokenName && themeColors && typeof themeColors[tokenName] === 'string' && themeColors[tokenName].length > 0) {
            next[key] = themeColors[tokenName];
        }
    });

    return next;
};
