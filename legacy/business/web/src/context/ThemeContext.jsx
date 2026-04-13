import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { getStorefrontThemePreset } from '../utils/storefrontTheme';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const { tenant, settings } = useTenant();
    const configuredTheme = settings?.theme || tenant?.theme || {};
    const mode = 'light';
    const effectiveTheme = useMemo(() => getStorefrontThemePreset('light', configuredTheme), [configuredTheme]);

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

        ['primary', 'accent', 'background', 'text', 'secondary'].forEach((key) => {
            if (effectiveTheme[key]) {
                fallbackPalette[key] = effectiveTheme[key];
            }
        });
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
        try {
            window.localStorage.removeItem('teflon_storefront_mode');
        } catch (error) {
            // Ignore storage failures.
        }
    }, [effectiveTheme, mode]);

    const noop = () => {
        try {
            window.localStorage.removeItem('teflon_storefront_mode');
        } catch (error) {
            // Ignore storage failures.
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                theme: effectiveTheme,
                mode,
                configuredMode: 'light',
                setMode: noop,
                toggleMode: noop,
                clearModePreference: noop,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
