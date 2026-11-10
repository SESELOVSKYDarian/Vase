import HistoryButton from './HistoryButton';
import CloudStatus from './CloudStatus';
import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { Modal } from './Overlays';
import { HELP, HELP_VIDEOS, MENU, SETTINGS_PAGES } from '../sections';

const LOGO = { light: '/brand/vase-logo-green.png?v=2', dark: '/brand/vase-logo-white.png?v=2' };

export function Sidebar({ section, sub, go, mini, onToggleMini, theme, onTheme, badges, store, account, phone = false, mobileOpen = false, onCloseMobile }) {
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

    useEffect(() => {
        if (!phone || !mobileOpen) return undefined;
        const onKey = (event) => event.key === 'Escape' && onCloseMobile?.();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [phone, mobileOpen, onCloseMobile]);

    return (
        <>
        {phone && mobileOpen ? <div className="vp-mscrim" onClick={onCloseMobile} aria-hidden="true" /> : null}
        <aside className={`vp-side ${mini ? 'mini' : ''} ${phone ? 'phone' : ''} ${mobileOpen ? 'm-open' : ''}`} aria-label="Menú del panel" aria-hidden={phone && !mobileOpen ? true : undefined}>
            {phone ? (
                <button type="button" className="vp-mclose" onClick={onCloseMobile} aria-label="Cerrar el menú">×</button>
            ) : (
                <button type="button" className="vp-coll" onClick={onToggleMini} aria-label={mini ? 'Agrandar el menú' : 'Achicar el menú'}><Icon name="chevron" size={14} className={mini ? 'vp-rot-r' : 'vp-rot-l'} /></button>
            )}
            <div className="vp-logo"><img src={LOGO[theme]} alt="Vase" /><b>business</b></div>
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
                    <span className={`vp-chev ${ajOpen ? 'open' : ''}`} aria-hidden="true"><Icon name="chevron" size={14} /></span>
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
                        {account.vaseUrl ? <a className="vp-am" role="menuitem" href={`${account.vaseUrl}/app/settings`}>Ajustes</a> : null}
                        {account.vaseUrl ? <a className="vp-am" role="menuitem" href={account.vaseUrl}>← Volver a Vase</a> : null}
                        <a className="vp-am" role="menuitem" href="/admin/anterior">Abrir el panel anterior</a>
                        <button type="button" className="vp-am out" role="menuitem" onClick={account.onLogout}>Cerrar sesión</button>
                    </div>
                ) : null}
                <button type="button" className="vp-accbtn" onClick={() => setAccOpen((open) => !open)} aria-expanded={accOpen} aria-haspopup="menu">
                    <span className="vp-acc-ini">{store.logo ? <img src={store.logo} alt="" /> : store.initial}</span>
                    <span className="vp-acc-text"><b>{store.name}</b><small>{account.name}</small></span>
                    <span className="vp-chev acc" aria-hidden="true"><Icon name="updown" size={15} /></span>
                </button>
            </div>
        </aside>
        </>
    );
}

export function Topbar({ title, subtitle, crumb, onBack, status, onPublish, publishing, badges, onNotifications, onHelp, onMenu }) {
    return (
        <header className="vp-top">
            {onMenu ? <button type="button" className="vp-ibtn vp-menu" onClick={onMenu} aria-label="Abrir el menú"><Icon name="list" size={18} /></button> : null}
            <div style={{ minWidth: 0 }}>
                {crumb ? <div className="vp-crumb"><button type="button" onClick={onBack}>{crumb}</button>›<span>{title}</span></div> : null}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {crumb ? <button type="button" className="vp-back" onClick={onBack}>← Volver</button> : null}
                    <h1 className="vp-ttl">{title}</h1>
                </div>
                {subtitle ? <div className="vp-sub">{subtitle}</div> : null}
            </div>
            <div className="vp-sp" />
            {status.history ? <HistoryButton history={status.history} theme={status.theme} toast={status.toast} /> : null}
            <CloudStatus cloud={status.cloud} unpublished={status.dirty} />
            <button type="button" className="vp-btn acc" onClick={onPublish} disabled={publishing}>{publishing ? 'Publicando…' : 'Publicar'}</button>
            <button type="button" className="vp-ibtn" onClick={onNotifications} aria-label={`Avisos: ${badges.total || 0}`}>
                <Icon name="bell" size={17} />
                {badges.total ? <span className="n">{badges.total}</span> : null}
            </button>
            <button type="button" className="vp-ibtn" onClick={onHelp} aria-label="Ayuda de esta sección" title="Ayuda de esta sección">?</button>
        </header>
    );
}

const helpFile = (slug, theme) => `/help/videos/${slug}${theme === 'light' ? '-claro' : ''}`;

// Video dentro del panel de ayuda: muestra la portada y se reproduce ahí mismo al tocarla.
function HelpVideoCard({ text, time, index, theme, playing, onPlay }) {
    const file = helpFile(HELP_VIDEOS[text], theme);
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', background: 'var(--soft)', border: '1px solid var(--line)' }}>
                {playing ? (
                    <video key={file} src={`${file}.mp4`} poster={`${file}.jpg`} controls autoPlay playsInline style={{ width: '100%', height: '100%', display: 'block' }}>
                        Tu navegador no puede reproducir este video.
                    </video>
                ) : (
                    <button type="button" onClick={onPlay} aria-label={`Ver el video: ${text}`} style={{ position: 'absolute', inset: 0, padding: 0, border: 0, cursor: 'pointer', background: `center / cover no-repeat url(${file}.jpg)` }}>
                        <span style={{ position: 'absolute', left: 12, bottom: 12, width: 40, height: 40, borderRadius: '50%', background: 'var(--acc)', color: 'var(--acc-on)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, boxShadow: 'var(--sh-md)' }}>▶</span>
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: 8, background: 'var(--accsoft)', color: 'var(--acc-tx)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flex: 'none' }}>{index + 1}</span>
                <b style={{ fontSize: 13.5 }}>{text}</b>
                <span className="vp-note" style={{ marginLeft: 'auto' }}>{time}</span>
            </div>
        </div>
    );
}

function HelpVideoList({ items, theme, onSoon }) {
    const [playing, setPlaying] = useState(null);
    const withVideo = items.filter(([text]) => HELP_VIDEOS[text]);
    const soon = items.filter(([text]) => !HELP_VIDEOS[text]);
    return (
        <>
            {withVideo.map(([text, time], index) => (
                <HelpVideoCard key={text} text={text} time={time} index={index} theme={theme} playing={playing === text} onPlay={() => setPlaying(text)} />
            ))}
            {soon.length ? (
                <>
                    {withVideo.length ? <span className="vp-fl">Próximamente</span> : <div className="vp-lock">Los videos de esta pantalla están en proceso.</div>}
                    <div>
                        {soon.map(([text], index) => (
                            <button key={text} type="button" className="vp-hl" onClick={() => onSoon(text)}>
                                <i>{withVideo.length + index + 1}</i>{text}<em>Pronto</em>
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </>
    );
}

export function SectionHelp({ open, onClose, section, title, onAll, onPlay, theme }) {
    const items = HELP[section] || [];
    return (
        <Modal open={open} onClose={onClose} side theme={theme} title={`Ayuda · ${title}`} description="Videos cortos de lo que podés hacer en esta pantalla.">
            <HelpVideoList items={items} theme={theme} onSoon={onPlay} />
            <button type="button" className="vp-btn soft" onClick={onAll}>Ver toda la ayuda</button>
        </Modal>
    );
}

// Por ahora la ayuda vive acá: las guías con video se ven en esta ventana y el resto avisa que está en proceso.
export function HelpVideo({ title, onClose, onBack, theme }) {
    const slug = title ? HELP_VIDEOS[title] : null;
    const file = slug ? `/help/videos/${slug}${theme === 'light' ? '-claro' : ''}` : null;
    return (
        <Modal
            open={Boolean(title)}
            onClose={onClose}
            wide={Boolean(slug)}
            theme={theme}
            title={title || ''}
            description={slug ? 'Video corto, paso a paso.' : 'Esta guía está en proceso.'}
            footer={<>
                <button type="button" className="vp-btn soft" onClick={onBack}>← Otras guías</button>
                <button type="button" className="vp-btn acc" onClick={onClose}>Listo</button>
            </>}
        >
            {slug ? (
                <video key={file} src={`${file}.mp4`} poster={`${file}.jpg`} controls autoPlay playsInline style={{ width: '100%', aspectRatio: '16 / 9', display: 'block', borderRadius: 12, background: 'var(--soft)' }}>
                    Tu navegador no puede reproducir este video.
                </video>
            ) : (
                <div className="vp-soon" style={{ padding: '28px 12px' }}>
                    <span className="ic"><Icon name="tool" size={26} /></span>
                    <h2>Estamos preparando esta guía</h2>
                    <p className="vp-note" style={{ fontSize: 13 }}>Pronto vas a tener acá un video corto que te muestra cómo hacerlo. Mientras tanto, escribinos y te ayudamos.</p>
                </div>
            )}
        </Modal>
    );
}

export function GeneralHelp({ open, onClose, onPlay, theme }) {
    const items = Object.values(HELP).flat().filter(([text], index, all) => all.findIndex(([other]) => other === text) === index);
    return (
        <Modal open={open} onClose={onClose} side theme={theme} title="Ayuda y soporte" description="Todos los videos de ayuda.">
            <div className="vp-lock">El manual completo en help.vase.ar está en proceso. Mientras tanto, los videos están acá.</div>
            <HelpVideoList items={items} theme={theme} onSoon={onPlay} />
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
