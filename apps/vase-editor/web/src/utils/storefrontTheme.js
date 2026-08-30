export const DEFAULT_STOREFRONT_LIGHT_THEME = {
    mode: 'light',
    primary: '#ff4d00',
    accent: '#ff7a2f',
    background: '#fffaf6',
    text: '#1a1614',
    secondary: '#6f625d',
    surface: '#ffffff',
    surface_soft: '#fff3eb',
    surface_secondary: '#fff3eb',
    surface_elevated: '#ffffff',
    border: '#ead8ce',
    header_bg: 'rgba(255,250,246,0.92)',
    input_bg: '#fffaf6',
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
    primary: '#ff4d00',
    accent: '#ff7a2f',
    background: '#0d0b0a',
    text: '#fffaf6',
    secondary: '#b9aaa2',
    surface: '#181411',
    surface_soft: '#211b18',
    surface_secondary: '#211b18',
    surface_elevated: '#2a211d',
    border: '#3a2d27',
    header_bg: 'rgba(24,20,17,0.94)',
    input_bg: '#15110f',
    font_family: 'Gilroy, Manrope, sans-serif',
    catalog: {
        panel_bg: '#211812',
        surface_bg: '#0d0b0a',
        card_bg: '#181411',
        border: '#3a2d27',
        muted_text: '#b9aaa2',
    },
};

export const getCatalogThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'dark' ? DEFAULT_STOREFRONT_DARK_THEME.catalog : DEFAULT_STOREFRONT_LIGHT_THEME.catalog;
    const overrides = (currentTheme?.catalog && typeof currentTheme.catalog === 'object') ? currentTheme.catalog : {};
    return { ...preset, ...overrides };
};

export const getStorefrontThemePreset = (mode, currentTheme = {}) => {
    const preset = mode === 'light' ? DEFAULT_STOREFRONT_LIGHT_THEME : DEFAULT_STOREFRONT_DARK_THEME;
    const currentMode = currentTheme?.mode === 'dark' ? 'dark' : currentTheme?.mode === 'light' ? 'light' : null;
    const modeOverrides = !currentMode || currentMode === mode ? currentTheme : {};
    return {
        ...preset,
        ...modeOverrides,
        mode,
        font_family: currentTheme?.font_family || currentTheme?.fontFamily || preset.font_family,
        catalog: getCatalogThemePreset(mode, modeOverrides),
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
        surface: preset.surface || '',
        surface_soft: preset.surface_soft || preset.surface_secondary || '',
        surface_elevated: preset.surface_elevated || '',
        header_bg: preset.header_bg || '',
        input_bg: preset.input_bg || preset.surface || '',
        panel_bg: catalog.panel_bg || '',
        card_bg: catalog.card_bg || '',
        surface_bg: catalog.surface_bg || '',
        border: catalog.border || '',
        muted_text: catalog.muted_text || '',
    };
};
