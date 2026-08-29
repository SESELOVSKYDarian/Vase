import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useTenant } from './TenantContext';
import { getStorefrontThemePreset, getStorefrontThemeColorTokens } from '../utils/storefrontTheme';

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const { tenant, settings } = useTenant();
    const configuredTheme = settings?.theme || tenant?.theme || {};
    const [localMode, setLocalMode] = useState(() => {
        try {
            const saved = window.localStorage.getItem('vase-storefront-theme');
            if (saved === 'dark' || saved === 'light') return saved;
            return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : null;
        } catch { return null; }
    });
    const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const mode = !isAdmin && localMode ? localMode : (configuredTheme?.mode === 'dark' ? 'dark' : 'light');
    const effectiveTheme = useMemo(() => getStorefrontThemePreset(mode, configuredTheme), [configuredTheme, mode]);

    useEffect(() => {
        const palette = effectiveTheme.colors || {};
        const fallbackPalette = {};
        const root = document.documentElement;

        root.classList.toggle('dark', mode === 'dark');
        document.body?.classList?.toggle('dark', mode === 'dark');
        root.dataset.theme = mode;
        root.style.colorScheme = mode;
        if (document.body) {
            document.body.dataset.theme = mode;
            document.body.style.colorScheme = mode;
        }

        ['primary', 'accent', 'background', 'text', 'secondary', 'surface', 'surface_secondary', 'surface_elevated', 'border', 'header_bg'].forEach((key) => {
            if (effectiveTheme[key]) {
                fallbackPalette[key] = effectiveTheme[key];
            }
        });
        root.style.setProperty('--color-text-muted', effectiveTheme.secondary || '');
        root.style.setProperty('--color-surface-secondary', effectiveTheme.surface_secondary || '');
        root.style.setProperty('--color-surface-elevated', effectiveTheme.surface_elevated || '');
        root.style.setProperty('--color-header-bg', effectiveTheme.header_bg || '');
        if (!fallbackPalette.text && effectiveTheme.secondary) {
            fallbackPalette.text = effectiveTheme.secondary;
        }

        const colors = { ...fallbackPalette, ...palette };

        Object.entries(colors).forEach(([key, value]) => {
            if (typeof value === 'string') {
                root.style.setProperty(`--color-${key}`, value);
            }
        });

        const catalogTheme =
            effectiveTheme.catalog && typeof effectiveTheme.catalog === 'object'
                ? effectiveTheme.catalog
                : {};
        Object.entries(catalogTheme).forEach(([key, value]) => {
            if (typeof value === 'string') {
                root.style.setProperty(`--catalog-${key.replace(/_/g, '-')}`, value);
            }
        });

        const fontFamily =
            effectiveTheme.font_family || effectiveTheme.fontFamily || effectiveTheme.typography?.fontFamily;
        if (fontFamily) {
            root.style.setProperty('--font-family', fontFamily);
        }
    }, [effectiveTheme, mode]);

    const setMode = (nextMode) => {
        try {
            const next = nextMode === 'dark' ? 'dark' : 'light';
            window.localStorage.setItem('vase-storefront-theme', next);
            setLocalMode(next);
        } catch { setLocalMode(nextMode === 'dark' ? 'dark' : 'light'); }
    };

    return (
        <ThemeContext.Provider
            value={{
                theme: effectiveTheme,
                mode,
                configuredMode: mode,
                setMode,
                toggleMode: () => setMode(mode === 'dark' ? 'light' : 'dark'),
                clearModePreference: () => {
                    try { window.localStorage.removeItem('vase-storefront-theme'); } catch { /* ignore */ }
                    setLocalMode(null);
                },
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export const useStorefrontThemeColors = () => {
    const ctx = useContext(ThemeContext);
    return useMemo(
        () => getStorefrontThemeColorTokens(ctx?.theme || {}, ctx?.mode || 'light'),
        [ctx?.theme, ctx?.mode]
    );
};
