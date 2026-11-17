// Parte de AppearanceEditor: Apariencia.
import AppearanceEditorFooterYContacto from './AppearanceEditorFooterYContacto.jsx';
import AppearanceEditorTiendaPublica from './AppearanceEditorTiendaPublica.jsx';
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import MediaField from '../MediaField';
import { FloppyDisk } from '@phosphor-icons/react';
import { MoonStars } from '@phosphor-icons/react';
import { PalettePreview } from './LinkListEditor.jsx';
import { Sun } from '@phosphor-icons/react';
import { ThemeModeButton } from './LinkListEditor.jsx';
import { fieldClass } from './LinkListEditor.jsx';

export default function AppearanceEditorApariencia({ addFooterListItem, addFooterSocialLink, addNavbarLink, addQuickLink, adminBranding, adminLogoUploading, adminMode, adminPreview, applyAdminThemePreset, branding, contact, footer, handleAdminLogoUpload, handleLogoUpload, helpLinks, isSaving, legalLinks, logoUploading, navbar, navbarLinks, newsletter, onSave, quickLinks, removeFooterListItem, removeFooterSocialLink, removeNavbarLink, removeQuickLink, resetStorefrontTheme, shopLinks, socialLinks, socials, storefrontPreview, theme, updateAdminBranding, updateBranding, updateFooter, updateFooterContact, updateFooterListItem, updateFooterSocial, updateFooterSocialLink, updateNavbar, updateNavbarLink, updateNewsletter, updateQuickLink, updateTheme }) {
    return (
        <div className="space-y-6 pb-10">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight admin-text-primary">Apariencia</h2>
                    <p className="text-sm admin-text-muted">
                        Paletas cerradas para que la tienda y el panel mantengan una identidad consistente.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="admin-accent-button inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                    <FloppyDisk size={14} weight="bold" />
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <AppearanceEditorTiendaPublica branding={branding} handleLogoUpload={handleLogoUpload} logoUploading={logoUploading} resetStorefrontTheme={resetStorefrontTheme} storefrontPreview={storefrontPreview} theme={theme} updateBranding={updateBranding} updateTheme={updateTheme} />

                <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Admin panel</h3>
                        <p className="text-xs text-zinc-500">
                            El editor tambien usa presets completos: sidebar, paneles, canvas, texto y estados.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <ThemeModeButton
                            active={adminMode === 'light'}
                            icon={<Sun size={16} weight="bold" />}
                            title="Claro"
                            description="Panel luminoso para gestion diaria con mucho contenido."
                            onClick={() => applyAdminThemePreset('light')}
                        />
                        <ThemeModeButton
                            active={adminMode === 'dark'}
                            icon={<MoonStars size={16} weight="bold" />}
                            title="Oscuro"
                            description="Panel oscuro con acento neutro y foco en el canvas."
                            onClick={() => applyAdminThemePreset('dark')}
                        />
                    </div>

                    <PalettePreview
                        title="Paleta del admin"
                        subtitle="Preset bloqueado para que todo el panel mantenga contraste correcto."
                        colors={{
                            accent: adminPreview.accent,
                            sidebar_bg: adminPreview.sidebar_bg,
                            panel_bg: adminPreview.panel_bg,
                            canvas_bg: adminPreview.canvas_bg,
                            text: adminPreview.text,
                            muted_text: adminPreview.muted_text,
                        }}
                    />

                    <EvolutionInput
                        label="Nombre visible del admin"
                        value={adminBranding.title || ''}
                        onChange={(e) => updateAdminBranding({ title: e.target.value })}
                        placeholder="Ej: Panel principal"
                        helperText="Si lo dejas vacio, el panel muestra automaticamente el nombre de la empresa."
                    />

                    <MediaField
                        label="Logo del panel"
                        value={adminBranding.logo_url || ''}
                        onChange={(value) => updateAdminBranding({ logo_url: value })}
                        onFile={handleAdminLogoUpload}
                        busy={adminLogoUploading}
                        kind="image"
                        hint="Si lo dejás vacío, usa el logo de la tienda."
                    />
                </section>

                <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-2">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Navbar publico</h3>
                        <p className="text-xs text-zinc-500">Configura links, iconos y CTA del header compartido en todas las paginas.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <EvolutionInput
                            label="Texto boton registro"
                            value={navbar?.register_label || 'Registrarse'}
                            onChange={(e) => updateNavbar({ register_label: e.target.value })}
                            placeholder="Registrarse"
                        />
                        <LinkInput
                            label="Link boton registro"
                            value={navbar?.register_href || '/register'}
                            onChange={(e) => updateNavbar({ register_href: e.target.value })}
                            placeholder="/register"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Redes visibles (iconos en footer)</p>
                            <button
                                type="button"
                                onClick={addFooterSocialLink}
                                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-zinc-300"
                            >
                                + Anadir red
                            </button>
                        </div>
                        <div className="space-y-2">
                            {socialLinks.map((item, idx) => (
                                <div key={`social-link-${idx}`} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
                                    <input
                                        type="text"
                                        value={item.label || ''}
                                        placeholder="Etiqueta"
                                        onChange={(e) => updateFooterSocialLink(idx, 'label', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <select
                                        value={item.type || 'website'}
                                        onChange={(e) => updateFooterSocialLink(idx, 'type', e.target.value)}
                                        className={fieldClass}
                                    >
                                        <option value="instagram">Instagram</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="youtube">YouTube</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="website">Web</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={item.href || ''}
                                        placeholder="https://..."
                                        onChange={(e) => updateFooterSocialLink(idx, 'href', e.target.value)}
                                        className={fieldClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFooterSocialLink(idx)}
                                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                            {!socialLinks.length ? (
                                <p className="text-xs text-zinc-500">Sin redes configuradas en lista dinamica. Puedes agregarlas arriba.</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <button type="button" onClick={() => updateNavbar({ show_search: navbar.show_search === false })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200">
                            Busqueda: {navbar.show_search === false ? 'OFF' : 'ON'}
                        </button>
                        <button type="button" onClick={() => updateNavbar({ show_wishlist: navbar.show_wishlist === false })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200">
                            Guardados: {navbar.show_wishlist === false ? 'OFF' : 'ON'}
                        </button>
                        <button type="button" onClick={() => updateNavbar({ show_cart: navbar.show_cart === false })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200">
                            Carrito: {navbar.show_cart === false ? 'OFF' : 'ON'}
                        </button>
                        <button type="button" onClick={() => updateNavbar({ show_account: navbar.show_account === false })} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-zinc-200">
                            Cuenta/CTA: {navbar.show_account === false ? 'OFF' : 'ON'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Links de navegacion</p>
                            <button type="button" onClick={addNavbarLink} className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-zinc-300">+ Anadir</button>
                        </div>
                        <div className="space-y-2">
                            {navbarLinks.map((link, idx) => (
                                <div key={`navbar-link-${idx}`} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                                    <input type="text" value={link.label || ''} placeholder="Etiqueta" onChange={(e) => updateNavbarLink(idx, 'label', e.target.value)} className={fieldClass} />
                                    <LinkInput value={link.href || ''} placeholder="/catalog o https://…" onChange={(e) => updateNavbarLink(idx, 'href', e.target.value)} />
                                    <button type="button" onClick={() => removeNavbarLink(idx)} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300">X</button>
                                </div>
                            ))}
                            {!navbarLinks.length ? <p className="text-xs text-zinc-500">Sin links configurados.</p> : null}
                        </div>
                    </div>
                </section>

                <AppearanceEditorFooterYContacto addFooterListItem={addFooterListItem} addQuickLink={addQuickLink} contact={contact} footer={footer} helpLinks={helpLinks} legalLinks={legalLinks} newsletter={newsletter} quickLinks={quickLinks} removeFooterListItem={removeFooterListItem} removeQuickLink={removeQuickLink} shopLinks={shopLinks} socials={socials} updateFooter={updateFooter} updateFooterContact={updateFooterContact} updateFooterListItem={updateFooterListItem} updateFooterSocial={updateFooterSocial} updateNewsletter={updateNewsletter} updateQuickLink={updateQuickLink} />

            </div>
        </div>
    );
}
