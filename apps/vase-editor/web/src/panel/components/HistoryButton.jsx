import { useState } from 'react';
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

const MAX_LINES = 5;

// Nombre del punto: si se publicó, si se guardó antes de volver atrás, o un guardado automático.
function entryTitle(entry) {
    if (entry.summary === 'Versión publicada') return 'Versión publicada';
    if (entry.summary === 'Antes de volver atrás') return 'Antes de volver atrás';
    return 'Guardado automático';
}

function ChangeList({ lines, empty }) {
    if (!lines) return null;
    if (!lines.length) return <span className="vp-hist-none">{empty}</span>;
    const shown = lines.slice(0, MAX_LINES);
    return (
        <ul className="vp-hist-list">
            {shown.map((line) => <li key={line}>{line}</li>)}
            {lines.length > MAX_LINES ? <li className="more">y {lines.length - MAX_LINES} cambios más</li> : null}
        </ul>
    );
}

// Historial: los últimos cambios grandes del diseño, qué cambió en cada uno y volver atrás si algo quedó mal.
export default function HistoryButton({ history, theme, toast }) {
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    const show = () => {
        setOpen(true);
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
                description="Qué cambió en cada versión del diseño. Volver atrás no cambia la tienda hasta que publiques."
            >
                {history.loading ? <p className="vp-mut">Cargando…</p> : null}
                {!history.loading && history.entries.length === 0 ? (
                    <p className="vp-mut">Todavía no hay cambios guardados en el historial.</p>
                ) : null}
                <div className="vp-hist">
                    {history.entries.map((entry, index) => {
                        const undo = confirm?.id === entry.id ? history.undoFor?.(entry) : null;
                        const oldest = index === history.entries.length - 1;
                        return (
                            <div className="vp-hist-row" key={entry.id}>
                                <div className="vp-hist-txt">
                                    <b>{entryTitle(entry)}</b>
                                    <span>{historyWhen(entry.created_at)}</span>
                                </div>
                                {entry.changes ? (
                                    <ChangeList lines={entry.changes} empty="Sin cambios en el diseño desde la versión anterior." />
                                ) : (
                                    <span className="vp-hist-none">{oldest ? 'Es la versión más vieja que se guarda.' : entry.summary}</span>
                                )}
                                {confirm?.id === entry.id ? (
                                    <div className="vp-hist-confirm">
                                        {undo ? (
                                            <>
                                                <b>Si volvés, se deshace:</b>
                                                <ChangeList lines={undo} empty="Nada: el diseño está igual que en esta versión." />
                                            </>
                                        ) : null}
                                        <div className="vp-hist-act">
                                            <button type="button" className="vp-btn line sm" onClick={() => setConfirm(null)} disabled={busy}>Cancelar</button>
                                            <button type="button" className="vp-btn acc sm" onClick={restore} disabled={busy}>{busy ? 'Volviendo…' : 'Sí, volver'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button type="button" className="vp-btn line sm" onClick={() => setConfirm(entry)}>Volver a esta versión</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Modal>
        </>
    );
}
