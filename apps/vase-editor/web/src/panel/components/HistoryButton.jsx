import { useMemo, useState } from 'react';
import { Modal } from './Overlays';
import { historyWhen } from '../history';

function ClockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v4h4" />
            <path d="M12 8v4l3 2" />
        </svg>
    );
}

function Chevron({ open }) {
    return (
        <svg className="vp-hv-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
        </svg>
    );
}

const KIND = {
    published: { title: 'Versión publicada', mark: '✓', cls: 'pub' },
    restore: { title: 'Antes de volver atrás', mark: '↺', cls: 'back' },
    auto: { title: 'Guardado automático', mark: null, cls: '' },
};

const kindOf = (entry) => (entry.summary === 'Versión publicada' ? 'published' : entry.summary === 'Antes de volver atrás' ? 'restore' : 'auto');
const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '·';
const BLOCK_ICON = { add: ['+', 'add'], remove: ['−', 'del'], edit: ['✎', 'ed'], move: ['↕', 'mv'], hide: ['◌', 'mv'], show: ['●', 'add'] };
const BLOCK_VERB = { add: 'Agregaste', remove: 'Quitaste', edit: 'Editaste', move: 'Moviste', hide: 'Ocultaste', show: 'Mostraste' };

function dayLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Value({ kind, value }) {
    if (value === null || value === undefined || value === '') return <span className="vp-hv-empty">vacío</span>;
    if (kind === 'color') return <span className="vp-hv-sw"><i style={{ background: value }} />{value}</span>;
    if (kind === 'image') return <span className="vp-hv-th"><img src={value} alt="" loading="lazy" /></span>;
    return <span>{value}</span>;
}

function Row({ row }) {
    if (row.kind === 'note') {
        return <div className="vp-hv-row"><span className="k">{row.label}</span><span>{row.text}</span></div>;
    }
    return (
        <div className="vp-hv-row">
            <span className="k">{row.label}</span>
            <span className={row.kind === 'text' ? 'old' : ''}><Value kind={row.kind} value={row.before} /></span>
            <span className="arr" aria-label="pasó a">→</span>
            <span className="new"><Value kind={row.kind} value={row.after} /></span>
        </div>
    );
}

function Groups({ groups, empty }) {
    if (!groups) return null;
    if (!groups.length) return <span className="vp-hv-none">{empty}</span>;
    return groups.map((group) => (
        <div className="vp-hv-grp" key={group.title}>
            <div className="vp-hv-gt">{group.title}</div>
            {group.rows.map((row, index) => (row.kind === 'block' ? (
                <div className="vp-hv-blk" key={`${row.action}-${row.name}-${index}`}>
                    <span className={`s ${BLOCK_ICON[row.action][1]}`} aria-hidden="true">{BLOCK_ICON[row.action][0]}</span>
                    <span className="g">
                        <b>{BLOCK_VERB[row.action]} “{row.name}”</b>
                        {row.text ? <span className="d">{row.text}</span> : null}
                        {row.details ? (
                            <span className="vp-hv-sub">{row.details.slice(0, 8).map((detail, i) => <Row key={i} row={detail} />)}{row.details.length > 8 ? <span className="d">y {row.details.length - 8} cambios más adentro</span> : null}</span>
                        ) : null}
                    </span>
                </div>
            ) : <Row key={index} row={row} />))}
        </div>
    ));
}

// Historial: cada versión dice quién la hizo, cuándo y qué cambió, con el antes y el después.
export default function HistoryButton({ history, theme, toast }) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [filter, setFilter] = useState('todas');
    const [busy, setBusy] = useState(false);

    const show = () => {
        setOpen(true);
        setConfirm(null);
        history.refresh();
    };

    const restore = async () => {
        if (!confirm) return;
        setBusy(true);
        const ok = await history.restore(confirm.id);
        setBusy(false);
        setConfirm(null);
        if (ok) {
            setOpen(false);
            toast?.('Volviste a esa versión. Tocá Publicar para que se vea en la tienda.', 'success');
        } else {
            toast?.('No se pudo volver a esa versión.', 'error');
        }
    };

    const visible = useMemo(() => history.entries.filter((entry) => filter === 'todas' || (filter === 'publicadas' ? kindOf(entry) === 'published' : kindOf(entry) !== 'published')), [filter, history.entries]);
    const firstOpen = expanded ?? visible[0]?.id ?? null;

    return (
        <>
            <button type="button" className="vp-ibtn" onClick={show} aria-label="Historial de cambios" title="Historial de cambios">
                <ClockIcon />
            </button>
            <Modal
                open={open}
                onClose={() => { setOpen(false); setConfirm(null); }}
                side
                theme={theme}
                title="Historial de cambios"
                description="Qué cambió en cada versión, quién lo hizo y cómo estaba antes. Volver atrás no cambia la tienda hasta que publiques."
            >
                <div className="vp-hv-filters" role="group" aria-label="Mostrar">
                    {[['todas', 'Todas'], ['publicadas', 'Publicadas'], ['guardados', 'Sin publicar']].map(([id, label]) => (
                        <button key={id} type="button" className={filter === id ? 'vp-hv-chip on' : 'vp-hv-chip'} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
                    ))}
                </div>
                {history.loading ? <p className="vp-mut">Cargando…</p> : null}
                {!history.loading && visible.length === 0 ? <p className="vp-mut">Todavía no hay versiones guardadas acá.</p> : null}
                <div className="vp-hist">
                    {visible.map((entry, index) => {
                        const kind = KIND[kindOf(entry)];
                        const isOpen = firstOpen === entry.id;
                        const day = dayLabel(entry.created_at);
                        const prevDay = index > 0 ? dayLabel(visible[index - 1].created_at) : null;
                        const oldest = entry.id === history.entries[history.entries.length - 1]?.id;
                        const asking = confirm?.id === entry.id;
                        const undo = asking ? history.undoGroupsFor?.(entry) : null;
                        return (
                            <div key={entry.id}>
                                {day !== prevDay ? <div className="vp-hv-day">{day}</div> : null}
                                <div className={isOpen ? 'vp-hv open' : 'vp-hv'}>
                                    <button type="button" className="vp-hv-h" aria-expanded={isOpen} onClick={() => { setExpanded(isOpen ? '' : entry.id); setConfirm(null); }}>
                                        <span className={`vp-hv-av ${kind.cls}`} aria-hidden="true">{kind.mark || initials(entry.author_name)}</span>
                                        <span className="g">
                                            <b>{kind.title}</b>
                                            <span>{[historyWhen(entry.created_at), entry.author_name].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        {entry.count ? <span className={kind.cls === 'pub' ? 'vp-hv-tag g' : 'vp-hv-tag'}>{entry.count} {entry.count === 1 ? 'cambio' : 'cambios'}</span> : null}
                                        <Chevron open={isOpen} />
                                    </button>
                                    {isOpen ? (
                                        <div className="vp-hv-b">
                                            {entry.groups ? (
                                                <Groups groups={entry.groups} empty="Sin cambios en el diseño desde la versión anterior." />
                                            ) : (
                                                <span className="vp-hv-none">{oldest ? 'Es la versión más vieja que se guarda: no hay otra para comparar.' : entry.summary}</span>
                                            )}
                                            {asking ? (
                                                <div className="vp-hv-undo">
                                                    <b>Si volvés a esta versión, se deshace:</b>
                                                    <Groups groups={undo} empty="Nada: el diseño está igual que en esta versión." />
                                                    <div className="vp-hist-act">
                                                        <button type="button" className="vp-btn line sm" onClick={() => setConfirm(null)} disabled={busy}>Cancelar</button>
                                                        <button type="button" className="vp-btn acc sm" onClick={restore} disabled={busy}>{busy ? 'Volviendo…' : 'Sí, volver'}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="vp-hv-acts">
                                                    <button type="button" className="vp-btn soft sm" onClick={() => setConfirm(entry)}>Volver a esta versión</button>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {history.entries.length ? <p className="vp-hv-foot">Se guardan las últimas 30 versiones.</p> : null}
            </Modal>
        </>
    );
}
