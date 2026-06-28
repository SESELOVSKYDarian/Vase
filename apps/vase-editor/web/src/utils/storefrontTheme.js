export const DEFAULT_STOREFRONT_LIGHT_THEME = {
    mode: 'light',
    primary: '#ff4d00',
    accent: '#ff7a2f',
    background: '#fffaf6',
    text: '#1a1614',
    secondary: '#6f625d',
    font_family: 'Gilroy, Manrope, sans-serif',
    catalog: {
        panel_bg: '#fff3eb',
        surface_bg: '#fffaf6',
        card_bg: '#ffffff',
        border: '#dab6a6',
        muted_text: '#7b665d',
    },
};

export const DEFAULT_STOREFRONT_DARK_THEME = {
    mode: 'dark',
    primary: '#2dd4bf',
    accent: '#5eead4',
    background: '#071317',
    text: '#ecfeff',
    secondary: '#94a3b8',
    font_family: 'Gilroy, Manrope, sans-serif',
    catalog: {
        panel_bg: '#0b1b21',
        surface_bg: '#0f2229',
        card_bg: '#10262d',
        border: '#1f3a43',
        muted_text: '#94a3b8',
    },
};

export const getCatalogThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'dark' ? DEFAULT_STOREFRONT_DARK_THEME.catalog : DEFAULT_STOREFRONT_LIGHT_THEME.catalog;
    const overrides = (currentTheme?.catalog && typeof currentTheme.catalog === 'object') ? currentTheme.catalog : {};
    return { ...preset, ...overrides };
};

export const getStorefrontThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'light' ? DEFAULT_STOREFRONT_LIGHT_THEME : DEFAULT_STOREFRONT_DARK_THEME;
    return {
        ...preset,
        ...currentTheme,
        mode,
        font_family: currentTheme?.font_family || currentTheme?.fontFamily || preset.font_family,
        catalog: getCatalogThemePreset(mode, currentTheme),
    };
};

export const getStorefrontThemeColorTokens = (theme = {}, mode = 'light') => {
    const preset = getStorefrontThemePreset(mode, theme || {});
    const catalog = preset.catalog || {};
    return {
        primary: preset.primary || '',
        accent: preset.accent || preset.primary || '',
        background: preset.background || '',
        text: preset.text || '',
        secondary: preset.secondary || '',
        panel_bg: catalog.panel_bg || '',
        card_bg: catalog.card_bg || '',
        surface_bg: catalog.surface_bg || '',
        border: catalog.border || '',
        muted_text: catalog.muted_text || '',
    };
};
