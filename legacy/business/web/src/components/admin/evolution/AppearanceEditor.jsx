import React, { useState } from 'react';
import EvolutionInput from './EvolutionInput';
import { FloppyDisk, UploadSimple, Sun, MoonStars } from '@phosphor-icons/react';
import {
    DEFAULT_ADMIN_PANEL_THEME,
    LIGHT_ADMIN_PANEL_THEME,
} from '../../../utils/adminPanelTheme';
import {
    DEFAULT_STOREFRONT_LIGHT_THEME,
    getCatalogThemePreset,
} from '../../../utils/storefrontTheme';

const fieldClass =
    "w-full rounded-xl border border-white/25 bg-zinc-900/70 px-3 py-2.5 text-sm text-white placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent-soft)]";

const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

const AppearanceEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const [logoUploading, setLogoUploading] = useState(false);
    const [adminLogoUploading, setAdminLogoUploading] = useState(false);

    const branding = settings?.branding || {};
    const theme = settings?.theme || {};
    const adminBranding = branding?.admin_panel || {};
    const adminTheme = theme?.admin_panel || {};
    const catalogTheme = getCatalogThemePreset('light', theme);
    const footer = branding?.footer || {};
    const socials = footer?.socials || {};
    const contact = footer?.contact || {};
    const quickLinks = Array.isArray(footer?.quickLinks) ? footer.quickLinks : [];
    const adminMode = adminTheme.mode === 'light' ? 'light' : 'dark';
    const adminThemeDefaults = adminMode === 'light' ? LIGHT_ADMIN_PANEL_THEME : DEFAULT_ADMIN_PANEL_THEME;

    const updateTheme = (patch) => {
        setSettings((prev) => ({
            ...prev,
            theme: {
                ...(prev.theme || {}),
                ...patch,
            },
        }));
    };

    const updateBranding = (patch) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                ...patch,
            },
        }));
    };

    const updateCatalogTheme = (patch) => {
        setSettings((prev) => ({
            ...prev,
            theme: {
                ...(prev.theme || {}),
                catalog: {
                    ...(((prev.theme || {}).catalog) || {}),
                    ...patch,
                },
            },
        }));
    };

    const updateAdminBranding = (patch) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                admin_panel: {
                    ...((prev.branding || {}).admin_panel || {}),
                    ...patch,
                },
            },
        }));
    };

    const updateAdminTheme = (patch) => {
        setSettings((prev) => ({
            ...prev,
            theme: {
                ...(prev.theme || {}),
                admin_panel: {
                    ...((prev.theme || {}).admin_panel || {}),
                    ...patch,
                },
            },
        }));
    };

    const applyAdminThemePreset = (mode) => {
        const preset = mode === 'light' ? LIGHT_ADMIN_PANEL_THEME : DEFAULT_ADMIN_PANEL_THEME;
        updateAdminTheme({
            ...preset,
            accent: adminTheme.accent || preset.accent,
        });
    };

    const updateFooter = (patch) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                footer: {
                    ...((prev.branding || {}).footer || {}),
                    ...patch,
                },
            },
        }));
    };

    const updateFooterSocial = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                footer: {
                    ...((prev.branding || {}).footer || {}),
                    socials: {
                        ...(((prev.branding || {}).footer || {}).socials || {}),
                        [field]: value,
                    },
                },
            },
        }));
    };

    const updateFooterContact = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                footer: {
                    ...((prev.branding || {}).footer || {}),
                    contact: {
                        ...(((prev.branding || {}).footer || {}).contact || {}),
                        [field]: value,
                    },
                },
            },
        }));
    };

    const updateQuickLink = (index, field, value) => {
        const next = [...quickLinks];
        if (!next[index]) return;
        next[index] = { ...next[index], [field]: value };
        updateFooter({ quickLinks: next });
    };

    const removeQuickLink = (index) => {
        const next = quickLinks.filter((_, idx) => idx !== index);
        updateFooter({ quickLinks: next });
    };

    const addQuickLink = () => {
        const next = [...quickLinks, { label: 'Nuevo link', href: '#' }];
        updateFooter({ quickLinks: next });
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) return;
            updateBranding({ logo_url: dataUrl });
        } catch (err) {
            console.error('Logo upload failed', err);
        } finally {
            setLogoUploading(false);
            event.target.value = '';
        }
    };

    const handleAdminLogoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAdminLogoUploading(true);
        try {
            const dataUrl = await readImageAsDataUrl(file);
            if (!dataUrl) return;
            updateAdminBranding({ logo_url: dataUrl });
        } catch (err) {
            console.error('Admin logo upload failed', err);
        } finally {
            setAdminLogoUploading(false);
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Apariencia</h2>
                    <p className="text-sm text-zinc-400">Completa los campos para configurar colores, marca y footer.</p>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    style={{
                        backgroundColor: 'var(--admin-accent)',
                        color: 'var(--admin-accent-contrast)',
                        boxShadow: '0 0 24px var(--admin-shadow)',
                    }}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                    <FloppyDisk size={14} weight="bold" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Tema</h3>
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Modo tienda</p>
                        <p className="text-xs text-zinc-500">
                            La tienda queda fija en modo claro. Desde aca solo ajustas colores y marca del storefront.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Color primario</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={theme.primary || DEFAULT_STOREFRONT_LIGHT_THEME.primary}
                                    onChange={(e) => updateTheme({ primary: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{theme.primary || DEFAULT_STOREFRONT_LIGHT_THEME.primary}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Color texto</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={theme.text || theme.secondary || DEFAULT_STOREFRONT_LIGHT_THEME.text}
                                    onChange={(e) => updateTheme({ text: e.target.value, secondary: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">
                                    {theme.text || theme.secondary || DEFAULT_STOREFRONT_LIGHT_THEME.text}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Color fondo</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={theme.background || DEFAULT_STOREFRONT_LIGHT_THEME.background}
                                    onChange={(e) => updateTheme({ background: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">
                                    {theme.background || DEFAULT_STOREFRONT_LIGHT_THEME.background}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto secundario</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={theme.secondary || DEFAULT_STOREFRONT_LIGHT_THEME.secondary}
                                    onChange={(e) => updateTheme({ secondary: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">
                                    {theme.secondary || DEFAULT_STOREFRONT_LIGHT_THEME.secondary}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Catalogo</p>
                            <p className="text-xs text-zinc-500">
                                Ajusta el color del listado: fondo, paneles, tarjetas, bordes y texto secundario.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Fondo catalogo</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.shell_bg}
                                        onChange={(e) => updateCatalogTheme({ shell_bg: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.shell_bg}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Paneles</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.panel_bg}
                                        onChange={(e) => updateCatalogTheme({ panel_bg: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.panel_bg}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Superficie</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.surface_bg}
                                        onChange={(e) => updateCatalogTheme({ surface_bg: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.surface_bg}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Tarjetas</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.card_bg}
                                        onChange={(e) => updateCatalogTheme({ card_bg: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.card_bg}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Bordes</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.border}
                                        onChange={(e) => updateCatalogTheme({ border: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.border}</span>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto secundario</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={catalogTheme.muted_text}
                                        onChange={(e) => updateCatalogTheme({ muted_text: e.target.value })}
                                        className="h-9 w-10 rounded-lg border-none bg-transparent"
                                    />
                                    <span className="text-xs font-mono text-zinc-300">{catalogTheme.muted_text}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <EvolutionInput
                        label="Nombre de la empresa"
                        value={branding.name || ''}
                        onChange={(e) => updateBranding({ name: e.target.value })}
                        placeholder="Ej: Tu empresa"
                        helperText="Se usa como nombre base en la tienda y tambien en Evolution Admin."
                    />

                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Logo</p>
                        <div className="flex items-center gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    disabled={logoUploading}
                                />
                                <UploadSimple size={14} weight="bold" />
                                {logoUploading ? 'Subiendo...' : 'Subir logo'}
                            </label>
                            {branding.logo_url ? (
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                                    <img src={branding.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Admin Panel</h3>
                        <p className="text-xs text-zinc-500">
                            Personaliza el shell del admin: nombre, logo y colores base.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Modo</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => applyAdminThemePreset('light')}
                                className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
                                style={{
                                    backgroundColor: adminMode === 'light' ? 'var(--admin-accent-soft)' : 'var(--admin-hover)',
                                    borderColor: adminMode === 'light' ? 'var(--admin-accent-border)' : 'var(--admin-border)',
                                    color: adminMode === 'light' ? 'var(--admin-accent)' : '#d4d4d8',
                                }}
                            >
                                <Sun size={14} weight="bold" />
                                Claro
                            </button>
                            <button
                                type="button"
                                onClick={() => applyAdminThemePreset('dark')}
                                className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
                                style={{
                                    backgroundColor: adminMode === 'dark' ? 'var(--admin-accent-soft)' : 'var(--admin-hover)',
                                    borderColor: adminMode === 'dark' ? 'var(--admin-accent-border)' : 'var(--admin-border)',
                                    color: adminMode === 'dark' ? 'var(--admin-accent)' : '#d4d4d8',
                                }}
                            >
                                <MoonStars size={14} weight="bold" />
                                Oscuro
                            </button>
                        </div>
                    </div>

                    <EvolutionInput
                        label="Nombre visible del admin"
                        value={adminBranding.title || ''}
                        onChange={(e) => updateAdminBranding({ title: e.target.value })}
                        placeholder="Ej: Panel principal"
                        helperText="Si lo dejas vacio, el panel muestra automaticamente el nombre de la empresa."
                    />

                    <EvolutionInput
                        label="Logo URL del panel"
                        value={adminBranding.logo_url || ''}
                        onChange={(e) => updateAdminBranding({ logo_url: e.target.value })}
                        placeholder="https://tu-dominio.com/logo-admin.png"
                        helperText="Si lo dejas vacio, usa el logo general."
                    />

                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Logo del panel</p>
                        <div className="flex items-center gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAdminLogoUpload}
                                    className="hidden"
                                    disabled={adminLogoUploading}
                                />
                                <UploadSimple size={14} weight="bold" />
                                {adminLogoUploading ? 'Subiendo...' : 'Subir logo admin'}
                            </label>
                            {(adminBranding.logo_url || branding.logo_url) ? (
                                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                                    <img
                                        src={adminBranding.logo_url || branding.logo_url}
                                        alt="Logo admin"
                                        className="h-10 w-10 object-contain"
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Acento</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.accent || adminThemeDefaults.accent}
                                    onChange={(e) => updateAdminTheme({ accent: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.accent || adminThemeDefaults.accent}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Sidebar</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.sidebar_bg || adminThemeDefaults.sidebar_bg}
                                    onChange={(e) => updateAdminTheme({ sidebar_bg: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.sidebar_bg || adminThemeDefaults.sidebar_bg}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Paneles</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.panel_bg || adminThemeDefaults.panel_bg}
                                    onChange={(e) => updateAdminTheme({ panel_bg: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.panel_bg || adminThemeDefaults.panel_bg}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Canvas</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.canvas_bg || adminThemeDefaults.canvas_bg}
                                    onChange={(e) => updateAdminTheme({ canvas_bg: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.canvas_bg || adminThemeDefaults.canvas_bg}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.text || adminThemeDefaults.text}
                                    onChange={(e) => updateAdminTheme({ text: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.text || adminThemeDefaults.text}</span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto secundario</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={adminTheme.muted_text || adminThemeDefaults.muted_text}
                                    onChange={(e) => updateAdminTheme({ muted_text: e.target.value })}
                                    className="h-9 w-10 rounded-lg border-none bg-transparent"
                                />
                                <span className="text-xs font-mono text-zinc-300">{adminTheme.muted_text || adminThemeDefaults.muted_text}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Footer</h3>

                    <EvolutionInput
                        label="Descripcion"
                        value={footer.description || ''}
                        onChange={(e) => updateFooter({ description: e.target.value })}
                        multiline
                        placeholder="Texto breve para el pie de pagina"
                        helperText="Se muestra en el footer de la tienda."
                    />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <EvolutionInput
                            label="Instagram URL"
                            value={socials.instagram || ''}
                            onChange={(e) => updateFooterSocial('instagram', e.target.value)}
                            placeholder="https://instagram.com/tu-cuenta"
                        />
                        <EvolutionInput
                            label="WhatsApp"
                            value={socials.whatsapp || ''}
                            onChange={(e) => updateFooterSocial('whatsapp', e.target.value)}
                            disabled={footer.whatsapp_enabled === false}
                            placeholder="5492230000000"
                            helperText="Formato recomendado: codigo pais + numero, sin espacios."
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                        <p className="text-xs font-bold text-zinc-200">Mostrar WhatsApp en footer</p>
                        <button
                            type="button"
                            onClick={() => updateFooter({ whatsapp_enabled: footer.whatsapp_enabled === false })}
                            className={`h-6 w-11 rounded-full border transition ${
                                footer.whatsapp_enabled === false
                                    ? 'border-white/20 bg-zinc-700'
                                    : 'border-evolution-indigo/70 bg-evolution-indigo'
                            }`}
                            aria-label="toggle whatsapp footer"
                        >
                            <span
                                className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                    footer.whatsapp_enabled === false ? 'translate-x-1' : 'translate-x-6'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <EvolutionInput
                            label="Direccion"
                            value={contact.address || ''}
                            onChange={(e) => updateFooterContact('address', e.target.value)}
                            placeholder="Av. Ejemplo 123"
                        />
                        <EvolutionInput
                            label="Telefono"
                            value={contact.phone || ''}
                            onChange={(e) => updateFooterContact('phone', e.target.value)}
                            placeholder="+54 223 000 0000"
                        />
                        <EvolutionInput
                            label="Email"
                            value={contact.email || ''}
                            onChange={(e) => updateFooterContact('email', e.target.value)}
                            placeholder="ventas@tuempresa.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Enlaces rapidos</p>
                            <button
                                type="button"
                                onClick={addQuickLink}
                                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-zinc-300"
                            >
                                + Anadir
                            </button>
                        </div>

                        <div className="space-y-2">
                            {quickLinks.map((link, idx) => (
                                <div key={`quick-link-${idx}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                    <input
                                        type="text"
                                        value={link.label || ''}
                                        placeholder="Etiqueta"
                                        onChange={(e) => updateQuickLink(idx, 'label', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <input
                                        type="text"
                                        value={link.href || ''}
                                        placeholder="Link"
                                        onChange={(e) => updateQuickLink(idx, 'href', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeQuickLink(idx)}
                                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}

                            {!quickLinks.length ? (
                                <p className="text-xs text-zinc-500">Sin enlaces configurados.</p>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppearanceEditor;
