import React, { useState } from 'react';
import { LinkPicker } from '../components/Pickers';
import { FOOTER_COLUMNS, footerValues, linksSummary, navLinksFromSettings } from './chrome';

const Toggle = ({ on, onChange, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`vp-tog ${on ? '' : 'off'}`} onClick={() => onChange(!on)} />
);

const ToggleRow = ({ title, help, on, onChange }) => (
    <div className="vp-row">
        <div className="g"><b>{title}</b>{help ? <span>{help}</span> : null}</div>
        <Toggle on={on} onChange={onChange} label={title} />
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

export function HeaderEditor({ settings, setSettings, pickers }) {
    const navbar = settings?.branding?.navbar || {};
    const update = (patch) => setSettings((prev) => ({
        ...prev,
        branding: { ...(prev?.branding || {}), navbar: { ...((prev?.branding || {}).navbar || {}), ...patch } },
    }));
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

    return (
        <>
            <div className="vp-fld">
                <label htmlFor="ft-desc">Texto debajo del logo</label>
                <textarea id="ft-desc" className="vp-inp ta" rows={3} value={values.description} onChange={(event) => update({ description: event.target.value })} />
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Columnas de links</span>
                {FOOTER_COLUMNS.map(([key, title]) => (
                    <div key={key} className="vp-colw">
                        <div className="vp-row">
                            <div className="g"><b>{title}</b><span>{linksSummary(values[key])}</span></div>
                            <button type="button" className="vp-btn line sm" aria-expanded={openColumn === key} onClick={() => setOpenColumn(openColumn === key ? null : key)}>{openColumn === key ? 'Listo' : 'Editar'}</button>
                        </div>
                        {openColumn === key ? <LinksEditor links={values[key]} onChange={(links) => update({ [key]: links })} pickers={pickers} /> : null}
                    </div>
                ))}
            </div>
            <div className="vp-fld">
                <span className="vp-fl">Contacto</span>
                <input className="vp-inp" aria-label="Dirección" placeholder="Dirección" value={values.contact.address || ''} onChange={(event) => setContact({ address: event.target.value })} />
                <input className="vp-inp" aria-label="Teléfono" placeholder="Teléfono" value={values.contact.phone || ''} onChange={(event) => setContact({ phone: event.target.value })} />
                <input className="vp-inp" aria-label="Correo" placeholder="Correo" value={values.contact.email || ''} onChange={(event) => setContact({ email: event.target.value })} />
                <ToggleRow title="Botón de WhatsApp" help="Usa el número de Ajustes › Pagos." on={values.whatsapp_enabled} onChange={(on) => update({ whatsapp_enabled: on })} />
            </div>
            <div className="vp-fld">
                <ToggleRow title="Newsletter" help={values.newsletter.enabled ? `“${values.newsletter.title || 'Novedades'}”` : 'Oculto'} on={Boolean(values.newsletter.enabled)} onChange={(on) => setNewsletter({ enabled: on })} />
                {values.newsletter.enabled ? (
                    <>
                        <input className="vp-inp" aria-label="Título del newsletter" placeholder="Título" value={values.newsletter.title || ''} onChange={(event) => setNewsletter({ title: event.target.value })} />
                        <input className="vp-inp" aria-label="Texto del newsletter" placeholder="Texto" value={values.newsletter.description || ''} onChange={(event) => setNewsletter({ description: event.target.value })} />
                        <input className="vp-inp" aria-label="Texto del botón del newsletter" placeholder="Texto del botón" value={values.newsletter.buttonLabel || ''} onChange={(event) => setNewsletter({ buttonLabel: event.target.value })} />
                    </>
                ) : null}
            </div>
            <div className="vp-fld">
                <label htmlFor="ft-legal">Texto legal</label>
                <input id="ft-legal" className="vp-inp" value={values.legalText} onChange={(event) => update({ legalText: event.target.value })} />
            </div>
            <span className="vp-note">Las redes sociales se cargan en “Colores, logo y pie”.</span>
        </>
    );
}
