import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Modal } from './Overlays';
import { HELP, HELP_SECTIONS, MENU, SETTINGS_PAGES } from '../sections';

const LOGO = { light: '/brand/vase-logo-green.png', dark: '/brand/vase-logo-white.png' };

export function Sidebar({ section, sub, go, mini, onToggleMini, theme, onTheme, badges, store, account }) {
    const [ajOpen, setAjOpen] = useState(section === 'ajustes');
    const [accOpen, setAccOpen] = useState(false);
    const accRef = useRef(null);

    useEffect(() => {
        if (section === 'ajustes') setAjOpen(true);
    }, [section]);

    useEffect(() => {
        if (!accOpen) return undefined;
        const onDown = (event) => {
            if (accRef.current && !accRef.current.contains(event.target)) setAccOpen(false);
        };
        const onKey = (event) => event.key === 'Escape' && setAccOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [accOpen]);

    return (
        <aside className={`vp-side ${mini ? 'mini' : ''}`} aria-label="Menú del panel">
            <button type="button" className="vp-coll" onClick={onToggleMini} aria-label={mini ? 'Agrandar el menú' : 'Achicar el menú'}>{mini ? '›' : '‹'}</button>
            <div className="vp-logo"><img src={LOGO[theme]} alt="Vase" /><b>vase business</b></div>
            <nav>
                {MENU.map((group) => (
                    <div key={group.group}>
                        <div className="vp-grp">{group.group}</div>
                        {group.items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                className={`vp-nb ${section === item.id ? 'on' : ''}`}
                                onClick={() => go(item.id)}
                                aria-current={section === item.id ? 'page' : undefined}
                                title={mini ? item.label : undefined}
                            >
                                <Icon name={item.icon} />
                                <span className="vp-lbl">{item.label}</span>
                                {item.badge && badges[item.badge] ? <span className="vp-badge">{badges[item.badge]}</span> : null}
                            </button>
                        ))}
                    </div>
                ))}
                <div className="vp-grp">Cuenta</div>
                <button
                    type="button"
                    className={`vp-nb ${section === 'ajustes' ? 'on' : ''}`}
                    aria-expanded={ajOpen}
                    title={mini ? 'Ajustes' : undefined}
                    onClick={() => {
                        if (section === 'ajustes' && !sub) setAjOpen((open) => !open);
                        else { setAjOpen(true); go('ajustes'); }
                    }}
                >
                    <Icon name="sliders" />
                    <span className="vp-lbl">Ajustes</span>
                    <span className="vp-chev">{ajOpen ? '▾' : '▸'}</span>
                </button>
                {ajOpen ? (
                    <div className="vp-subnav">
                        {SETTINGS_PAGES.map((page) => (
                            <button key={page.id} type="button" className={`vp-sn ${section === 'ajustes' && sub === page.id ? 'on' : ''}`} onClick={() => go('ajustes', page.id)}>
                                {page.label}
                            </button>
                        ))}
                    </div>
                ) : null}
                <button type="button" className="vp-nb" onClick={account.onHelp} title={mini ? 'Ayuda y soporte' : undefined}>
                    <Icon name="help" /><span className="vp-lbl">Ayuda y soporte</span>
                </button>
            </nav>
            <div className="vp-acc" ref={accRef}>
                {accOpen ? (
                    <div className="vp-accmenu" role="menu">
                        <div className="vp-am-h">{account.email || 'Tu cuenta'}</div>
                        <button type="button" className="vp-am" role="menuitem" onClick={() => { onTheme(theme === 'dark' ? 'light' : 'dark'); }}>
                            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        </button>
                        {account.vaseUrl ? <a className="vp-am" role="menuitem" href={account.vaseUrl}>← Volver a Vase</a> : null}
                        <a className="vp-am" role="menuitem" href="/admin/anterior">Abrir el panel anterior</a>
                        <button type="button" className="vp-am out" role="menuitem" onClick={account.onLogout}>Cerrar sesión</button>
                    </div>
                ) : null}
                <button type="button" className="vp-accbtn" onClick={() => setAccOpen((open) => !open)} aria-expanded={accOpen} aria-haspopup="menu">
                    <span className="vp-acc-ini">{store.logo ? <img src={store.logo} alt="" /> : store.initial}</span>
                    <span className="vp-acc-text"><b>{store.name}</b><small>{account.name}</small></span>
                    <span className="vp-chev">⌃</span>
                </button>
            </div>
        </aside>
    );
}

export function Topbar({ title, subtitle, crumb, onBack, status, onPublish, publishing, badges, onNotifications, onHelp }) {
    return (
        <header className="vp-top">
            <div style={{ minWidth: 0 }}>
                {crumb ? <div className="vp-crumb"><button type="button" onClick={onBack}>{crumb}</button>›<span>{title}</span></div> : null}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {crumb ? <button type="button" className="vp-back" onClick={onBack}>← Volver</button> : null}
                    <h1 className="vp-ttl">{title}</h1>
                </div>
                {subtitle ? <div className="vp-sub">{subtitle}</div> : null}
            </div>
            <div className="vp-sp" />
            <span className="vp-status" role="status"><i className={status.dirty ? '' : 'ok'} />{status.text}</span>
            <button type="button" className="vp-btn acc" onClick={onPublish} disabled={publishing}>{publishing ? 'Publicando…' : 'Publicar'}</button>
            <button type="button" className="vp-ibtn" onClick={onNotifications} aria-label={`Avisos: ${badges.total || 0}`}>
                <Icon name="bell" size={17} />
                {badges.total ? <span className="n">{badges.total}</span> : null}
            </button>
            <button type="button" className="vp-ibtn" onClick={onHelp} aria-label="Ayuda de esta sección" title="Ayuda de esta sección">?</button>
        </header>
    );
}

export function SectionHelp({ open, onClose, section, title, onAll, theme }) {
    const items = HELP[section] || [];
    return (
        <Modal open={open} onClose={onClose} side theme={theme} title={`Ayuda · ${title}`} description="Lo que podés hacer en esta pantalla.">
            <div>
                {items.map(([text, time], index) => (
                    <a key={text} className="vp-hl" href={`https://help.vase.ar/?q=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                        <i>{index + 1}</i>{text}<em>{time}</em>
                    </a>
                ))}
            </div>
            <span className="vp-note">Cada guía tiene un video corto en help.vase.ar.</span>
            <button type="button" className="vp-btn soft" onClick={onAll}>Ver toda la ayuda</button>
        </Modal>
    );
}

export function GeneralHelp({ open, onClose, theme }) {
    return (
        <Modal open={open} onClose={onClose} side theme={theme} title="Ayuda y soporte" description="Guías, preguntas frecuentes y videos.">
            <a className="vp-btn line" href="https://help.vase.ar" target="_blank" rel="noreferrer" style={{ justifyContent: 'flex-start' }}><Icon name="search" size={15} />Buscar en help.vase.ar</a>
            <span className="vp-fl">Por sección</span>
            <div>
                {HELP_SECTIONS.map(([label, count]) => (
                    <a key={label} className="vp-hl" href={`https://help.vase.ar/?seccion=${encodeURIComponent(label)}`} target="_blank" rel="noreferrer">
                        <i>{label.charAt(0)}</i>{label}<em>{count} guías</em>
                    </a>
                ))}
                <a className="vp-hl" href="https://help.vase.ar/?seccion=programadores" target="_blank" rel="noreferrer"><i>{'{}'}</i>Datos técnicos para el programador<em>JSON, cURL, claves</em></a>
            </div>
            <a className="vp-btn ink" href="https://help.vase.ar" target="_blank" rel="noreferrer">Abrir el manual completo ↗</a>
        </Modal>
    );
}

// Sección que todavía se está rehaciendo: dice en qué fase llega y la abre en el panel anterior.
export function ComingSoon({ title, hint, onOpenLegacy }) {
    return (
        <div className="vp-soon">
            <span className="ic"><Icon name="tool" size={26} /></span>
            <h2>{title} todavía está en el panel anterior</h2>
            <p className="vp-note" style={{ fontSize: 13 }}>{hint || 'La podés usar ahí con todos tus datos. Pronto la vas a tener acá.'}</p>
            <button type="button" className="vp-btn ink" onClick={onOpenLegacy}>Abrir en el panel anterior</button>
        </div>
    );
}
