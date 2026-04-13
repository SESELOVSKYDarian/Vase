export const DEFAULT_STOREFRONT_LIGHT_THEME = {
    mode: 'light',
    primary: '#f97316',
    accent: '#181411',
    background: '#ffffff',
    text: '#181411',
    secondary: '#6b7280',
    font_family: 'Inter, sans-serif',
    catalog: {
        shell_bg: '#f7f3ee',
        panel_bg: '#fffdfb',
        surface_bg: '#fcfbfa',
        card_bg: '#ffffff',
        border: '#e5e1de',
        muted_text: '#8a7560',
    },
};

export const DEFAULT_STOREFRONT_DARK_THEME = {
    mode: 'dark',
    primary: '#f97316',
    accent: '#cbd5e1',
    background: '#090b0f',
    text: '#e6edf7',
    secondary: '#97a3b6',
    font_family: 'Inter, sans-serif',
    catalog: {
        shell_bg: '#0f0b08',
        panel_bg: '#17110d',
        surface_bg: '#1b140f',
        card_bg: '#120c08',
        border: '#3d2f21',
        muted_text: '#b39e89',
    },
};

export const getCatalogThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'dark' ? DEFAULT_STOREFRONT_DARK_THEME.catalog : DEFAULT_STOREFRONT_LIGHT_THEME.catalog;
    const configured = currentTheme?.catalog && typeof currentTheme.catalog === 'object' ? currentTheme.catalog : {};
    return {
        ...preset,
        ...configured,
    };
};

export const getStorefrontThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'light' ? DEFAULT_STOREFRONT_LIGHT_THEME : DEFAULT_STOREFRONT_DARK_THEME;
    return {
        ...preset,
        mode,
        primary: currentTheme?.primary || preset.primary,
        accent: currentTheme?.accent || preset.accent,
        background: currentTheme?.background || preset.background,
        text: currentTheme?.text || preset.text,
        secondary: currentTheme?.secondary || preset.secondary,
        font_family: currentTheme?.font_family || currentTheme?.fontFamily || preset.font_family,
        catalog: getCatalogThemePreset(mode, currentTheme),
    };
};
