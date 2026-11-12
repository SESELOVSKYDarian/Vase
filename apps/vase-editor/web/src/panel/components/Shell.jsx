import HistoryButton from './HistoryButton';
import CloudStatus from './CloudStatus';
import React, { useEffect, useState } from 'react';
import { PanelSidebar } from '@vase/ui/panel/sidebar';
import Icon from './Icon';
import { Modal } from './Overlays';
import { HELP, HELP_VIDEOS, MENU, SETTINGS_PAGES } from '../sections';

const LOGO = { light: '/brand/vase-logo-green.png?v=2', dark: '/brand/vase-logo-white.png?v=2' };

export function Sidebar({ section, sub, go, mini, onToggleMini, theme, badges, store, account, phone = false, mobileOpen = false, onCloseMobile }) {
    const [ajOpen, setAjOpen] = useState(section === 'ajustes');

    useEffect(() => {
        if (section === 'ajustes') setAjOpen(true);
    }, [section]);

    // El menú es el mismo de app y Labs (packages/ui/src/panel/sidebar.tsx).
    const groups = [
        ...MENU.map((group) => ({
            label: group.group,
            items: group.items.map((item) => ({
                id: item.id,
                label: item.label,
                icon: <Icon name={item.icon} />,
                badge: item.badge && badges[item.badge] ? badges[item.badge] : undefined,
                onClick: () => go(item.id),
            })),
        })),
        {
            label: 'Cuenta',
            items: [
                {
                    id: 'ajustes',
                    label: 'Ajustes',
                    icon: <Icon name="sliders" />,
                    open: ajOpen,
                    onClick: () => {
                        if (section === 'ajustes' && !sub) setAjOpen((open) => !open);
                        else { setAjOpen(true); go('ajustes'); }
                    },
                    sub: SETTINGS_PAGES.map((page) => ({ id: page.id, label: page.label, onClick: () => go('ajustes', page.id) })),
                },
                { id: 'ayuda', label: 'Ayuda y soporte', icon: <Icon name="help" />, onClick: account.onHelp },
            ],
        },
    ];

    return (
        <PanelSidebar
            ariaLabel="Menú del panel"
            brand={<><img src={LOGO[theme]} alt="Vase" /><b>vase</b><span className="vase-pill business">Business</span></>}
            groups={groups}
            activeId={section}
            activeSubId={sub}
            mini={mini}
            onToggleMini={onToggleMini}
            phone={phone}
            mobileOpen={mobileOpen}
            onCloseMobile={onCloseMobile}
            account={{ avatar: store.logo ? <img src={store.logo} alt="" /> : store.initial, name: store.name, detail: account.name }}
            accountMenu={() => (
                <>
                    <div className="vp-am-h">{account.email || 'Tu cuenta'}</div>
                    {account.vaseUrl ? <a className="vp-am" role="menuitem" href={`${account.vaseUrl}/app/settings`}>Ajustes</a> : null}
                    {account.vaseUrl ? <a className="vp-am" role="menuitem" href={account.vaseUrl}>← Volver a Vase</a> : null}
                    <a className="vp-am" role="menuitem" href="/admin/anterior">Abrir el panel anterior</a>
                    <button type="button" className="vp-am out" role="menuitem" onClick={account.onLogout}>Cerrar sesión</button>
                </>
            )}
        />
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
