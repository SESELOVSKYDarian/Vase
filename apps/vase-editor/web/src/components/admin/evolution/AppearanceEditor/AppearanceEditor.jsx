// Parte de AppearanceEditor.jsx: AppearanceEditor.
// partes: ./AppearanceEditorFooterYContacto.jsx, ./AppearanceEditorTiendaPublica.jsx, ./AppearanceEditorApariencia.jsx
import { useState } from 'react';
import EvolutionInput from '../EvolutionInput';
import MediaField from '../MediaField';
import LinkInput from '../LinkInput';
import { uploadMedia } from '../../../../utils/uploadMedia';
import { FloppyDisk, MoonStars, Storefront, Sun } from '@phosphor-icons/react';
import { DEFAULT_ADMIN_PANEL_THEME, LIGHT_ADMIN_PANEL_THEME } from '../../../../utils/adminPanelTheme';
import { DEFAULT_STOREFRONT_LIGHT_THEME, getStorefrontThemePreset } from '../../../../utils/storefrontTheme';
import { ColorField, GENERIC_FOOTER_DEFAULTS, LinkListEditor, PalettePreview, ThemeModeButton, fieldClass } from './LinkListEditor.jsx';

import AppearanceEditorFooterYContacto from './AppearanceEditorFooterYContacto.jsx';
import AppearanceEditorTiendaPublica from './AppearanceEditorTiendaPublica.jsx';
import AppearanceEditorApariencia from './AppearanceEditorApariencia.jsx';
export const AppearanceEditor = ({ settings, setSettings, onSave, isSaving }) => {
    const [logoUploading, setLogoUploading] = useState(false);
    const [adminLogoUploading, setAdminLogoUploading] = useState(false);

    const branding = settings?.branding || {};
    const theme = settings?.theme || {};
    const adminBranding = branding?.admin_panel || {};
    const adminTheme = theme?.admin_panel || {};
    const navbar = branding?.navbar || {};
    const navbarLinks = Array.isArray(navbar?.links) ? navbar.links : [];
    const footer = branding?.footer || {};
    const socials = footer?.socials || {};
    const socialLinks = Array.isArray(footer?.socialLinks) ? footer.socialLinks : [];
    const contact = footer?.contact || {};
    const quickLinks = Array.isArray(footer?.quickLinks) ? footer.quickLinks : [];
    const shopLinks = Array.isArray(footer?.shopLinks) ? footer.shopLinks : GENERIC_FOOTER_DEFAULTS.shopLinks;
    const helpLinks = Array.isArray(footer?.helpLinks) ? footer.helpLinks : GENERIC_FOOTER_DEFAULTS.helpLinks;
    const legalLinks = Array.isArray(footer?.legalLinks) ? footer.legalLinks : GENERIC_FOOTER_DEFAULTS.legalLinks;
    const newsletter = { ...GENERIC_FOOTER_DEFAULTS.newsletter, ...(footer?.newsletter || {}) };
    const storefrontMode = theme?.mode === 'dark' ? 'dark' : 'light';
    const adminMode = adminTheme?.mode === 'light' ? 'light' : 'dark';
    const storefrontPreview = getStorefrontThemePreset(storefrontMode, theme);
    const adminPreview = adminMode === 'light' ? LIGHT_ADMIN_PANEL_THEME : DEFAULT_ADMIN_PANEL_THEME;

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

    const updateNavbar = (patch) => {
        setSettings((prev) => ({
            ...prev,
            branding: {
                ...(prev.branding || {}),
                navbar: {
                    ...((prev.branding || {}).navbar || {}),
                    ...patch,
                },
            },
        }));
    };

    const updateNavbarLink = (index, field, value) => {
        const next = [...navbarLinks];
        if (!next[index]) return;
        next[index] = { ...next[index], [field]: value };
        updateNavbar({ links: next });
    };

    const addNavbarLink = () => {
        updateNavbar({ links: [...navbarLinks, { label: 'Nuevo link', href: '/' }] });
    };

    const removeNavbarLink = (index) => {
        updateNavbar({ links: navbarLinks.filter((_, idx) => idx !== index) });
    };

    const applyStorefrontThemePreset = (mode) => {
        updateTheme(getStorefrontThemePreset(mode));
    };

    const resetStorefrontTheme = () => {
        const confirmed = window.confirm(
            '¿Restablecer la paleta a los valores predeterminados? Se perdera cualquier color personalizado del storefront.'
        );
        if (!confirmed) return;
        setSettings((prev) => ({
            ...prev,
            theme: {
                ...DEFAULT_STOREFRONT_LIGHT_THEME,
                admin_panel: prev?.theme?.admin_panel,
            },
        }));
    };

    const applyAdminThemePreset = (mode) => {
        updateAdminTheme(mode === 'light' ? LIGHT_ADMIN_PANEL_THEME : DEFAULT_ADMIN_PANEL_THEME);
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

    const updateFooterSocialLink = (index, field, value) => {
        const next = [...socialLinks];
        if (!next[index]) return;
        next[index] = { ...next[index], [field]: value };
        updateFooter({ socialLinks: next });
    };

    const addFooterSocialLink = () => {
        updateFooter({
            socialLinks: [
                ...socialLinks,
                { label: 'Instagram', type: 'instagram', href: 'https://instagram.com/' },
            ],
        });
    };

    const removeFooterSocialLink = (index) => {
        updateFooter({ socialLinks: socialLinks.filter((_, idx) => idx !== index) });
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
        updateFooter({ quickLinks: quickLinks.filter((_, idx) => idx !== index) });
    };

    const addQuickLink = () => {
        updateFooter({ quickLinks: [...quickLinks, { label: 'Nuevo link', href: '/catalog' }] });
    };

    const updateFooterListItem = (listKey, list, index, field, value) => {
        const next = [...list];
        if (!next[index]) return;
        next[index] = { ...next[index], [field]: value };
        updateFooter({ [listKey]: next });
    };

    const addFooterListItem = (listKey, list) => {
        updateFooter({ [listKey]: [...list, { label: 'Nuevo link', href: '/catalog' }] });
    };

    const removeFooterListItem = (listKey, list, index) => {
        updateFooter({ [listKey]: list.filter((_, idx) => idx !== index) });
    };

    const updateNewsletter = (patch) => {
        updateFooter({
            newsletter: {
                ...newsletter,
                ...patch,
            },
        });
    };

    const handleLogoUpload = async (file) => {
        if (!file) return;
        setLogoUploading(true);
        try {
            const url = await uploadMedia(file);
            if (url) updateBranding({ logo_url: url });
        } catch (err) {
            console.error('Logo upload failed', err);
        } finally {
            setLogoUploading(false);
        }
    };

    const handleAdminLogoUpload = async (file) => {
        if (!file) return;
        setAdminLogoUploading(true);
        try {
            const url = await uploadMedia(file);
            if (url) updateAdminBranding({ logo_url: url });
        } catch (err) {
            console.error('Admin logo upload failed', err);
        } finally {
            setAdminLogoUploading(false);
        }
    };

    return (
        <AppearanceEditorApariencia addFooterListItem={addFooterListItem} addFooterSocialLink={addFooterSocialLink} addNavbarLink={addNavbarLink} addQuickLink={addQuickLink} adminBranding={adminBranding} adminLogoUploading={adminLogoUploading} adminMode={adminMode} adminPreview={adminPreview} applyAdminThemePreset={applyAdminThemePreset} branding={branding} contact={contact} footer={footer} handleAdminLogoUpload={handleAdminLogoUpload} handleLogoUpload={handleLogoUpload} helpLinks={helpLinks} isSaving={isSaving} legalLinks={legalLinks} logoUploading={logoUploading} navbar={navbar} navbarLinks={navbarLinks} newsletter={newsletter} onSave={onSave} quickLinks={quickLinks} removeFooterListItem={removeFooterListItem} removeFooterSocialLink={removeFooterSocialLink} removeNavbarLink={removeNavbarLink} removeQuickLink={removeQuickLink} resetStorefrontTheme={resetStorefrontTheme} shopLinks={shopLinks} socialLinks={socialLinks} socials={socials} storefrontPreview={storefrontPreview} theme={theme} updateAdminBranding={updateAdminBranding} updateBranding={updateBranding} updateFooter={updateFooter} updateFooterContact={updateFooterContact} updateFooterListItem={updateFooterListItem} updateFooterSocial={updateFooterSocial} updateFooterSocialLink={updateFooterSocialLink} updateNavbar={updateNavbar} updateNavbarLink={updateNavbarLink} updateNewsletter={updateNewsletter} updateQuickLink={updateQuickLink} updateTheme={updateTheme} />
    );
};
