import React, { useState } from 'react';
import { LinkPicker } from '../components/Pickers';
import { STORE_TEXT_DEFAULTS } from '../../utils/storeTexts';
import { SOCIALS, footerColumns, footerSocials, footerValues, headerExtraLinks, linksSummary, navLinksFromSettings, socialError, withHeaderExtraLinks } from './chrome';

const Toggle = ({ on, onChange, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vp-tog ${on ? '' : 'off'}`} onClick={() => onChange(!on)} />
);

const ToggleRow = ({ title, help, on, onChange }) => (
    <div className="vp-row">
        <div className="g"><b>{title}</b>{help ? <span>{help}</span> : null}</div>
        <Toggle on={on} onChange={onChange} label={title} />
    </div>
);

// Texto opcional: muestra de fondo el de siempre.
const TextField = ({ id, label, value, placeholder, onChange, long = false }) => (
    <div className="vp-fld">
        <label htmlFor={id}>{label}</label>
        {long
            ? <textarea id={id} className="vp-inp ta" rows={2} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
            : <input id={id} className="vp-inp" value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
    </div>
);

// Lista de links editable: nombre, a dónde lleva, ordenar y quitar.
function LinksEditor({ links, onChange, pickers, addLabel = '+ Agregar link' }) {
    const set = (index, patch) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
    const move = (index, to) => {
        if (to < 0 || to >= links.length) return;
        const next = [...links];
        const [item] = next.splice(index, 1);
        next.splice(to, 0, item);
        onChange(next);
    };
    return (
        <div className="vp-lnks">
            {links.map((link, index) => (
                <div key={index} className="vp-lnk">
                    <div className="vp-lnkh">
                        <input className="vp-inp" aria-label={`Nombre del link ${index + 1}`} value={link.label || ''} placeholder="Nombre" onChange={(event) => set(index, { label: event.target.value })} />
                        <button type="button" className="vp-ibtn sm" aria-label="Subir" disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                        <button type="button" className="vp-ibtn sm" aria-label="Bajar" disabled={index === links.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                        <button type="button" className="vp-ibtn sm del" aria-label="Quitar link" onClick={() => onChange(links.filter((_, i) => i !== index))}>×</button>
                    </div>
                    <LinkPicker label="Lleva a" value={link.href || ''} onChange={(href) => set(index, { href })} {...pickers} />
                </div>
            ))}
            <button type="button" className="vp-addc" onClick={() => onChange([...links, { label: 'Nuevo link', href: '/' }])}>{addLabel}</button>
        </div>
    );
}

export function HeaderEditor({ settings, setSettings, pickers, isPiquim }) {
    const navbar = settings?.branding?.navbar || {};
    const update = (patch) => setSettings((prev) => ({
        ...prev,
        branding: { ...(prev?.branding || {}), navbar: { ...((prev?.branding || {}).navbar || {}), ...patch } },
    }));
    const texts = STORE_TEXT_DEFAULTS.header;
    const searchField = <TextField id="nav-search" label="Texto del buscador" value={navbar.search_placeholder} placeholder={texts.search_placeholder} onChange={(value) => update({ search_placeholder: value })} />;

    if (!isPiquim) {
        const showAbout = navbar.show_about !== false;
        const showContact = navbar.show_contact !== false;
        return (
            <>
                <div className="vp-fld">
                    <span className="vp-fl">Menú</span>
                    <TextField id="nav-products" label="Menú de productos" value={navbar.products_label} placeholder={texts.products_label} onChange={(value) => update({ products_label: value })} />
                    <ToggleRow title="Sobre nosotros" on={showAbout} onChange={(on) => update({ show_about: on })} />
                    {showAbout ? (
                        <>
                            <TextField id="nav-about" label="Nombre" value={navbar.about_label} placeholder={texts.about_label} onChange={(value) => update({ about_label: value })} />
                            <LinkPicker label="Lleva a" value={navbar.about_href || '/about'} onChange={(href) => update({ about_href: href })} {...pickers} />
                        </>
                    ) : null}
                    <ToggleRow title="Contacto por WhatsApp" help="Usa el número de Ajustes › Pagos." on={showContact} onChange={(on) => update({ show_contact: on })} />
                    {showContact ? <TextField id="nav-contact" label="Nombre" value={navbar.contact_label} placeholder={texts.contact_label} onChange={(value) => update({ contact_label: value })} /> : null}
                </div>
                <div className="vp-fld">
                    <span className="vp-fl">Otros links del menú</span>
                    <LinksEditor links={headerExtraLinks(settings)} onChange={(extras) => update({ links: withHeaderExtraLinks(settings, extras) })} pickers={pickers} />
                </div>
                <div className="vp-fld">
                    <span className="vp-fl">Qué se muestra</span>
                    <ToggleRow title="Buscador" on={navbar.show_search !== false} onChange={(on) => update({ show_search: on })} />
                    <ToggleRow title="Carrito" on={navbar.show_cart !== false} onChange={(on) => update({ show_cart: on })} />
                    <ToggleRow title="Mi cuenta" on={navbar.show_account !== false} onChange={(on) => update({ show_account: on })} />
                </div>
                {searchField}
                <TextField id="nav-help-t" label="Menú del celular: título de ayuda" value={navbar.help_title} placeholder={texts.help_title} onChange={(value) => update({ help_title: value })} />
                <TextField id="nav-help" label="Menú del celular: texto de ayuda" value={navbar.help_text} placeholder={texts.help_text} onChange={(value) => update({ help_text: value })} />
                <span className="vp-note">El logo y los colores se cambian en “Colores, logo y pie”. Los rubros y marcas del menú salen del Catálogo.</span>
            </>
        );
    }

    return (
        <>
            <div className="vp-fld">
                <span className="vp-fl">Links del menú</span>
                <LinksEditor links={navLinksFromSettings(settings)} onChange={(links) => update({ links })} pickers={pickers} />
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Qué se muestra</span>
                <ToggleRow title="Buscador" on={navbar.show_search !== false} onChange={(on) => update({ show_search: on })} />
                <ToggleRow title="Carrito" on={navbar.show_cart !== false} onChange={(on) => update({ show_cart: on })} />
                <ToggleRow title="Favoritos" on={navbar.show_wishlist !== false} onChange={(on) => update({ show_wishlist: on })} />
                <ToggleRow title="Mi cuenta" on={navbar.show_account !== false} onChange={(on) => update({ show_account: on })} />
            </div>
            <div className="vp-fld">
                <label htmlFor="nav-reg">Texto del botón de registro</label>
                <input id="nav-reg" className="vp-inp" value={navbar.register_label ?? ''} placeholder="Registrarse" onChange={(event) => update({ register_label: event.target.value })} />
            </div>
            <LinkPicker label="El botón de registro lleva a" value={navbar.register_href || '/signup'} onChange={(href) => update({ register_href: href })} {...pickers} />
            <span className="vp-note">El logo y los colores se cambian en “Colores, logo y pie”.</span>
        </>
    );
}

export function FooterEditor({ settings, setSettings, pickers, isPiquim }) {
    const [openColumn, setOpenColumn] = useState(null);
    const values = footerValues(settings, isPiquim);
    const update = (patch) => setSettings((prev) => ({
        ...prev,
        branding: { ...(prev?.branding || {}), footer: { ...((prev?.branding || {}).footer || {}), ...patch } },
    }));
    const setContact = (patch) => update({ contact: { ...values.contact, ...patch } });
    const setNewsletter = (patch) => update({ newsletter: { ...values.newsletter, ...patch } });
    const footer = settings?.branding?.footer || {};
    const socials = isPiquim ? footer.socials || {} : footerSocials(footer);
    // socialLinks (formato viejo) tiene prioridad en el pie genérico: al editar pasa todo a socials.
    const setSocial = (key, value) => update({ socials: { ...socials, [key]: value }, ...(isPiquim ? {} : { socialLinks: [] }) });
    const setLabel = (key, value) => update({ labels: { ...values.labels, [key]: value } });
    const setColumn = (key, links) => update(key === 'shopLinks' && !isPiquim ? { shopLinks: links, quickLinks: links } : { [key]: links });
    const commerce = settings?.commerce || {};
    const vaseProfile = settings?.vase_profile;
    const texts = STORE_TEXT_DEFAULTS.footer;

    return (
        <>
            <div className="vp-fld">
                <label htmlFor="ft-desc">Texto debajo del logo</label>
                <textarea id="ft-desc" className="vp-inp ta" rows={3} value={values.description} onChange={(event) => update({ description: event.target.value })} />
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Columnas de links</span>
                {footerColumns(isPiquim).map(([key, title]) => (
                    <div key={key} className="vp-colw">
                        <div className="vp-row">
                            <div className="g"><b>{title}</b><span>{linksSummary(values[key])}</span></div>
                            <button type="button" className="vp-btn line sm" aria-expanded={openColumn === key} onClick={() => setOpenColumn(openColumn === key ? null : key)}>{openColumn === key ? 'Listo' : 'Editar'}</button>
                        </div>
                        {openColumn === key ? <LinksEditor links={values[key]} onChange={(links) => setColumn(key, links)} pickers={pickers} /> : null}
                    </div>
                ))}
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Contacto</span>
                {vaseProfile?.connected ? <span className="vp-note">El teléfono, el correo y la dirección que cargues en <a href={vaseProfile.edit_url} target="_blank" rel="noreferrer">Mi negocio</a> reemplazan a estos.</span> : null}
                <input className="vp-inp" aria-label="Dirección" placeholder={commerce.address || (isPiquim ? 'Dirección' : 'Mar del Plata, Argentina')} value={values.contact.address || ''} onChange={(event) => setContact({ address: event.target.value })} />
                <input className="vp-inp" aria-label="Teléfono" placeholder={commerce.phone || commerce.whatsapp_number || 'Teléfono'} value={values.contact.phone || ''} onChange={(event) => setContact({ phone: event.target.value })} />
                <input className="vp-inp" aria-label="Correo" placeholder={commerce.email || 'Correo'} value={values.contact.email || ''} onChange={(event) => setContact({ email: event.target.value })} />
                <ToggleRow title="Botón de WhatsApp" help="Usa el número de Ajustes › Pagos." on={values.whatsapp_enabled} onChange={(on) => update({ whatsapp_enabled: on })} />
            </div>
            {isPiquim ? null : (
                <div className="vp-fld">
                    <span className="vp-fl">Títulos y textos</span>
                    <TextField id="ft-t-links" label="Título de los links" value={values.labels.links_title} placeholder={texts.links_title} onChange={(value) => setLabel('links_title', value)} />
                    <TextField id="ft-t-contact" label="Título de contacto" value={values.labels.contact_title} placeholder={texts.contact_title} onChange={(value) => setLabel('contact_title', value)} />
                    {values.whatsapp_enabled ? (
                        <>
                            <TextField id="ft-t-wa" label="Título de WhatsApp" value={values.labels.whatsapp_title} placeholder={texts.whatsapp_title} onChange={(value) => setLabel('whatsapp_title', value)} />
                            <TextField id="ft-t-wat" label="Texto de WhatsApp" long value={values.labels.whatsapp_text} placeholder={texts.whatsapp_text} onChange={(value) => setLabel('whatsapp_text', value)} />
                            <TextField id="ft-t-wab" label="Botón de WhatsApp" value={values.labels.whatsapp_button} placeholder={texts.whatsapp_button} onChange={(value) => setLabel('whatsapp_button', value)} />
                        </>
                    ) : null}
                </div>
            )}
            {isPiquim ? <div className="vp-fld">
                <ToggleRow title="Newsletter" help={values.newsletter.enabled ? `“${values.newsletter.title || 'Novedades'}”` : 'Oculto'} on={Boolean(values.newsletter.enabled)} onChange={(on) => setNewsletter({ enabled: on })} />
                {values.newsletter.enabled ? (
                    <>
                        <input className="vp-inp" aria-label="Título del newsletter" placeholder="Título" value={values.newsletter.title || ''} onChange={(event) => setNewsletter({ title: event.target.value })} />
                        <input className="vp-inp" aria-label="Texto del newsletter" placeholder="Texto" value={values.newsletter.description || ''} onChange={(event) => setNewsletter({ description: event.target.value })} />
                        <input className="vp-inp" aria-label="Texto del botón del newsletter" placeholder="Texto del botón" value={values.newsletter.buttonLabel || ''} onChange={(event) => setNewsletter({ buttonLabel: event.target.value })} />
                    </>
                ) : null}
            </div> : null}
            <div className="vp-fld">
                <label htmlFor="ft-legal">Texto legal</label>
                <input id="ft-legal" className="vp-inp" value={values.legalText} onChange={(event) => update({ legalText: event.target.value })} />
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Redes sociales</span>
                {SOCIALS.map(([key, label, placeholder]) => {
                    const error = socialError(socials[key]);
                    return (
                        <div key={key} className="vp-soc">
                            <span className="ic" aria-hidden="true">{label.slice(0, 2)}</span>
                            <div className="g">
                                <input className="vp-inp" aria-label={label} placeholder={placeholder} value={socials[key] || ''} onChange={(event) => setSocial(key, event.target.value)} />
                                {error ? <span className="vp-note bad">{error}</span> : null}
                            </div>
                        </div>
                    );
                })}
                <span className="vp-note">Dejá vacía la que no uses: no aparece en la tienda.</span>
            </div>
        </>
    );
}
