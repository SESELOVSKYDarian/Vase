// Parte de heroSliderTemplates.js: STYLE_DEFAULTS_BY_VARIANT, EMPTY_SLIDE, cloneSlides, sanitizeText, normalizeHeroVariant, getDefaultHeroSlides y más.
import { HERO_VARIANT_OPTIONS, SLIDE_DEFAULTS_BY_VARIANT } from "./hero-color-fields.js";

export const STYLE_DEFAULTS_BY_VARIANT = {
    classic: {
        titleHexColor: '#ffffff',
        subtitleHexColor: '#f4f4f5',
        overlayColor: '#000000',
        tagTextColor: '#ea580c',
        tagBgColor: 'rgba(234, 88, 12, 0.2)',
        tagBorderColor: 'transparent',
        primaryButtonBgColor: '#ea580c',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: '#ffffff',
    },
    modernist: {
        titleColor: '#000000',
        textColor: '#444748',
        labelColor: '#1c1b1b',
        primaryButtonBgColor: '#000000',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#000000',
        secondaryButtonBorderColor: '#000000',
        overlayColor: 'rgba(0,0,0,0.2)',
    },
    modernist_centered: {
        titleColor: '#ffffff',
        textColor: '#d4d4d8',
        labelColor: '#ffffff',
        primaryButtonBgColor: '#ffffff',
        primaryButtonTextColor: '#000000',
        secondaryButtonBgColor: 'transparent',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: 'rgba(255, 255, 255, 0.3)',
        overlayColor: '#000000',
    },
    fashion: {
        backgroundColor: '#f5f3f0',
        titleColor: '#111111',
        textColor: '#52525b',
        labelColor: '#52525b',
        accentColor: '#111111',
        primaryButtonBgColor: '#111111',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: '#ffffff',
        secondaryButtonTextColor: '#111111',
        secondaryButtonBorderColor: '#111111',
    },
    home_decor: {
        backgroundColor: '#ffffff',
        titleColor: '#0f172a',
        textColor: '#475569',
        labelColor: '#135bec',
        accentColor: '#135bec',
        primaryButtonBgColor: '#135bec',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: '#ffffff',
        secondaryButtonTextColor: '#0f172a',
        secondaryButtonBorderColor: '#cbd5e1',
    },
    sanitarios_industrial: {
        backgroundColor: '#f97316',
        gridLineColor: '#ffffff',
        leftPanelColor: '#121212',
        titleColor: '#ffffff',
        labelColor: '#f97316',
        cardBgColor: '#ffffff',
        cardBorderColor: '#ffffff',
        cardTitleColor: '#ffffff',
        cardSubtitleColor: '#e4e4e7',
        textColor: '#f4f4f5',
        primaryButtonBgColor: '#ffffff',
        primaryButtonTextColor: '#f97316',
        secondaryButtonBgColor: '#18181b',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: '#3f3f46',
        specColor: '#e4e4e7',
        dotActiveColor: '#f97316',
        dotInactiveColor: '#d4d4d8',
    },
    corporate: {},
    modern_boutique: {
        titleColor: '#ffffff',
        textColor: '#f4f4f5',
        labelBgColor: '#000000',
        labelTextColor: '#ffffff',
        primaryButtonBgColor: '#000000',
        primaryButtonTextColor: '#ffffff',
        secondaryButtonBgColor: 'rgba(255, 255, 255, 0)',
        secondaryButtonTextColor: '#ffffff',
        secondaryButtonBorderColor: 'rgba(255, 255, 255, 0.3)',
        accentBgColor: '#ffffff',
        accentTextColor: '#000000',
        overlayColor: '#000000',
    },
};

export const EMPTY_SLIDE = {
    label: '',
    title: '',
    subtitle: '',
    description: '',
    featured: '',
    cardEyebrow: '',
    cardTitle: '',
    specLabel: '',
    image: '',
    primaryButtonLabel: '',
    primaryButtonLink: '',
    secondaryButtonLabel: '',
    secondaryButtonLink: '',
};

export const cloneSlides = (slides = []) => slides.map((slide) => ({ ...slide }));

export const sanitizeText = (value) => (typeof value === 'string' ? value : '');

export const normalizeHeroVariant = (variant) =>
    HERO_VARIANT_OPTIONS.some((option) => option.value === variant) ? variant : 'classic';

export const getDefaultHeroSlides = (variant) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const defaults = SLIDE_DEFAULTS_BY_VARIANT[normalizedVariant] || [];
    return cloneSlides(defaults);
};

export const getDefaultHeroStyles = (variant) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    return { ...(STYLE_DEFAULTS_BY_VARIANT[normalizedVariant] || {}) };
};

export const createEmptyHeroSlide = (variant) => {
    const defaults = getDefaultHeroSlides(variant);
    if (defaults.length > 0) {
        return { ...defaults[0], label: '', title: '', subtitle: '', description: '', featured: '' };
    }
    return { ...EMPTY_SLIDE };
};

export const normalizeSlide = (rawSlide = {}) => ({
    label: sanitizeText(rawSlide.label),
    title: sanitizeText(rawSlide.title),
    subtitle: sanitizeText(rawSlide.subtitle),
    description: sanitizeText(rawSlide.description),
    featured: sanitizeText(rawSlide.featured),
    cardEyebrow: sanitizeText(rawSlide.cardEyebrow),
    cardTitle: sanitizeText(rawSlide.cardTitle),
    specLabel: sanitizeText(rawSlide.specLabel),
    image: sanitizeText(rawSlide.image),
    primaryButtonLabel: sanitizeText(rawSlide.primaryButtonLabel),
    primaryButtonLink: sanitizeText(rawSlide.primaryButtonLink),
    secondaryButtonLabel: sanitizeText(rawSlide.secondaryButtonLabel),
    secondaryButtonLink: sanitizeText(rawSlide.secondaryButtonLink),
});

export const normalizeHeroSlides = (variant, slides) => {
    const normalizedVariant = normalizeHeroVariant(variant);
    const sourceSlides = Array.isArray(slides) && slides.length > 0 ? slides : getDefaultHeroSlides(normalizedVariant);
    const normalized = sourceSlides.map((slide) => normalizeSlide(slide));
    return normalized.length > 0 ? normalized : [normalizeSlide(createEmptyHeroSlide(normalizedVariant))];
};

// Slot de color → token de tema. Slots ausentes no heredan del tema (solo hardcoded).
export const HERO_THEME_TOKEN_MAP = {
    classic: {
        // titleHexColor y subtitleHexColor NO se enchufan al tema:
        // el hero clasico va sobre imagen con overlay oscuro, default claro hardcoded.
        tagTextColor: 'primary',
        tagBgColor: 'primary',
        tagBorderColor: 'primary',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
    },
    modernist: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    modernist_centered: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    modern_boutique: {
        titleColor: 'text',
        textColor: 'secondary',
        labelBgColor: 'primary',
        labelTextColor: 'background',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
        accentBgColor: 'accent',
        accentTextColor: 'background',
    },
    fashion: {
        backgroundColor: 'background',
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        accentColor: 'accent',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    home_decor: {
        backgroundColor: 'background',
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'text',
        accentColor: 'accent',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
    },
    sanitarios_industrial: {
        titleColor: 'text',
        labelColor: 'secondary',
        cardTitleColor: 'text',
        cardSubtitleColor: 'secondary',
        textColor: 'secondary',
        primaryButtonBgColor: 'primary',
        primaryButtonTextColor: 'background',
        secondaryButtonTextColor: 'text',
        secondaryButtonBorderColor: 'text',
        specColor: 'accent',
        dotActiveColor: 'primary',
    },
    corporate: {
        titleColor: 'text',
        textColor: 'secondary',
        labelColor: 'accent',
    },
};
