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

// Historial: los últimos cambios grandes del diseño, para volver atrás si algo quedó mal.
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
                description="Los últimos cambios grandes del diseño. Volver atrás no cambia la tienda hasta que publiques."
            >
                {history.loading ? <p className="vp-mut">Cargando…</p> : null}
                {!history.loading && history.entries.length === 0 ? (
                    <p className="vp-mut">Todavía no hay cambios guardados en el historial.</p>
                ) : null}
                <div className="vp-hist">
                    {history.entries.map((entry) => (
                        <div className="vp-hist-row" key={entry.id}>
                            <div className="vp-hist-txt">
                                <b>{entry.summary}</b>
                                <span>{historyWhen(entry.created_at)}</span>
                            </div>
                            {confirm?.id === entry.id ? (
                                <div className="vp-hist-act">
                                    <button type="button" className="vp-btn line sm" onClick={() => setConfirm(null)} disabled={busy}>Cancelar</button>
                                    <button type="button" className="vp-btn acc sm" onClick={restore} disabled={busy}>{busy ? 'Volviendo…' : 'Sí, volver'}</button>
                                </div>
                            ) : (
                                <button type="button" className="vp-btn line sm" onClick={() => setConfirm(entry)}>Volver a esta versión</button>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
}
