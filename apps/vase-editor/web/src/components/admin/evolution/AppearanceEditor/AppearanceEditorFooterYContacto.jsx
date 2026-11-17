// Parte de AppearanceEditor: Footer y contacto.
import EvolutionInput from '../EvolutionInput';
import LinkInput from '../LinkInput';
import { LinkListEditor } from './LinkListEditor.jsx';
import { Storefront } from '@phosphor-icons/react';
import { fieldClass } from './LinkListEditor.jsx';

export default function AppearanceEditorFooterYContacto({ addFooterListItem, addQuickLink, contact, footer, helpLinks, legalLinks, newsletter, quickLinks, removeFooterListItem, removeQuickLink, shopLinks, socials, updateFooter, updateFooterContact, updateFooterListItem, updateFooterSocial, updateNewsletter, updateQuickLink }) {
    return (
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-2">
            <div className="flex items-center gap-3">
                <div className="admin-accent-surface flex h-10 w-10 items-center justify-center rounded-2xl border">
                    <Storefront size={18} weight="bold" />
                </div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Footer y contacto</h3>
                    <p className="text-xs text-zinc-500">Contenido del pie de pagina publico.</p>
                </div>
            </div>

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
                    label="Facebook URL"
                    value={socials.facebook || ''}
                    onChange={(e) => updateFooterSocial('facebook', e.target.value)}
                    placeholder="https://facebook.com/tu-cuenta"
                />
                <EvolutionInput
                    label="YouTube URL"
                    value={socials.youtube || ''}
                    onChange={(e) => updateFooterSocial('youtube', e.target.value)}
                    placeholder="https://youtube.com/@tu-cuenta"
                />
                <EvolutionInput
                    label="TikTok URL"
                    value={socials.tiktok || ''}
                    onChange={(e) => updateFooterSocial('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@tu-cuenta"
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
                        <div key={`quick-link-${idx}`} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                            <input
                                type="text"
                                value={link.label || ''}
                                placeholder="Etiqueta"
                                onChange={(e) => updateQuickLink(idx, 'label', e.target.value)}
                                className={fieldClass}
                            />
                            <LinkInput
                                value={link.href || ''}
                                placeholder="/catalog o https://…"
                                onChange={(e) => updateQuickLink(idx, 'href', e.target.value)}
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <LinkListEditor
                    title="Footer tienda"
                    links={shopLinks}
                    onAdd={() => addFooterListItem('shopLinks', shopLinks)}
                    onRemove={(idx) => removeFooterListItem('shopLinks', shopLinks, idx)}
                    onChange={(idx, field, value) => updateFooterListItem('shopLinks', shopLinks, idx, field, value)}
                />
                <LinkListEditor
                    title="Footer ayuda"
                    links={helpLinks}
                    onAdd={() => addFooterListItem('helpLinks', helpLinks)}
                    onRemove={(idx) => removeFooterListItem('helpLinks', helpLinks, idx)}
                    onChange={(idx, field, value) => updateFooterListItem('helpLinks', helpLinks, idx, field, value)}
                />
                <LinkListEditor
                    title="Footer legal"
                    links={legalLinks}
                    onAdd={() => addFooterListItem('legalLinks', legalLinks)}
                    onRemove={(idx) => removeFooterListItem('legalLinks', legalLinks, idx)}
                    onChange={(idx, field, value) => updateFooterListItem('legalLinks', legalLinks, idx, field, value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-2">
                <EvolutionInput
                    label="Newsletter titulo"
                    value={newsletter.title || ''}
                    onChange={(e) => updateNewsletter({ title: e.target.value })}
                    placeholder="Novedades para profesionales"
                />
                <EvolutionInput
                    label="Boton newsletter"
                    value={newsletter.buttonLabel || ''}
                    onChange={(e) => updateNewsletter({ buttonLabel: e.target.value })}
                    placeholder="Suscribirme"
                />
                <EvolutionInput
                    label="Placeholder email"
                    value={newsletter.placeholder || ''}
                    onChange={(e) => updateNewsletter({ placeholder: e.target.value })}
                    placeholder="tu@email.com"
                />
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-xs font-bold text-zinc-200">Mostrar newsletter</p>
                    <button
                        type="button"
                        onClick={() => updateNewsletter({ enabled: newsletter.enabled === false })}
                        className={`h-6 w-11 rounded-full border transition ${
                            newsletter.enabled === false
                                ? 'border-white/20 bg-zinc-700'
                                : 'border-evolution-indigo/70 bg-evolution-indigo'
                        }`}
                        aria-label="toggle newsletter footer"
                    >
                        <span
                            className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                newsletter.enabled === false ? 'translate-x-1' : 'translate-x-6'
                            }`}
                        />
                    </button>
                </div>
                <div className="md:col-span-2">
                    <EvolutionInput
                        label="Descripcion newsletter"
                        value={newsletter.description || ''}
                        onChange={(e) => updateNewsletter({ description: e.target.value })}
                        multiline
                        placeholder="Texto breve del newsletter"
                    />
                </div>
            </div>

            <EvolutionInput
                label="Texto legal inferior"
                value={footer.legalText || ''}
                onChange={(e) => updateFooter({ legalText: e.target.value })}
                placeholder="(c) 2026 Tu empresa. Todos los derechos reservados."
            />
        </section>
    );
}
