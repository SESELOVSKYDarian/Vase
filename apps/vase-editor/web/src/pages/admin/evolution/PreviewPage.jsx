import React, { useContext, useEffect, useMemo, useState } from 'react';
import PageBuilder from '../../../components/PageBuilder';
import { TenantContext } from '../../../context/TenantContext';
import { ThemeContext } from '../../../context/ThemeContext';
import { getStorefrontThemePreset } from '../../../utils/storefrontTheme';

const applyThemeCssVars = (theme = {}) => {
    const root = document.documentElement;
    const mode = theme?.mode === 'dark' ? 'dark' : 'light';
    const effective = getStorefrontThemePreset(mode, theme);

    root.classList.toggle('dark', mode === 'dark');
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    const palette = {
        primary: effective.primary,
        accent: effective.accent || effective.primary,
        background: effective.background,
        text: effective.text,
        secondary: effective.secondary,
        ...(effective.colors || {}),
    };
    Object.entries(palette).forEach(([key, value]) => {
        if (typeof value === 'string') {
            root.style.setProperty(`--color-${key}`, value);
        }
    });

    const catalog = effective.catalog || {};
    Object.entries(catalog).forEach(([key, value]) => {
        if (typeof value === 'string') {
            root.style.setProperty(`--catalog-${key.replace(/_/g, '-')}`, value);
        }
    });

    const fontFamily = effective.font_family || effective.fontFamily;
    if (fontFamily) {
        root.style.setProperty('--font-family', fontFamily);
    }
};

const PreviewPage = () => {
    const [sections, setSections] = useState([]);
    const [livesSettings, setLiveSettings] = useState(null);
    const parentTenant = useContext(TenantContext);

    useEffect(() => {
        const handleMessage = (event) => {
            const { type, data } = event.data || {};
            if (type === 'EVOLUTION_SYNC_SECTIONS') {
                setSections(Array.isArray(data) ? data : []);
            } else if (type === 'EVOLUTION_SYNC_SETTINGS') {
                setLiveSettings(data);
            }
        };

        window.addEventListener('message', handleMessage);
        window.parent?.postMessage({ type: 'EVOLUTION_PREVIEW_READY' }, '*');
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const effectiveSettings = livesSettings || parentTenant?.settings || null;

    useEffect(() => {
        if (!effectiveSettings?.theme) return;
        applyThemeCssVars(effectiveSettings.theme);
    }, [effectiveSettings?.theme]);

    const tenantValue = useMemo(
        () => ({
            tenant: parentTenant?.tenant || null,
            settings: effectiveSettings,
            refreshTenantSettings: parentTenant?.refreshTenantSettings || (() => {}),
        }),
        [parentTenant?.tenant, parentTenant?.refreshTenantSettings, effectiveSettings]
    );

    const themeValue = useMemo(() => {
        const configuredTheme = effectiveSettings?.theme || {};
        const mode = configuredTheme?.mode === 'dark' ? 'dark' : 'light';
        return {
            theme: getStorefrontThemePreset(mode, configuredTheme),
            mode,
            configuredMode: mode,
            setMode: () => {},
            toggleMode: () => {},
            clearModePreference: () => {},
        };
    }, [effectiveSettings?.theme]);

    return (
        <TenantContext.Provider value={tenantValue}>
            <ThemeContext.Provider value={themeValue}>
                <div className="preview-mode bg-white min-h-screen">
                    <PageBuilder sections={sections} />
                </div>
            </ThemeContext.Provider>
        </TenantContext.Provider>
    );
};

export default PreviewPage;
