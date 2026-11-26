// Botón "Quitar fondos" del catálogo y su ventana.
// Quita el fondo liso (negro, blanco o de un color parejo) de las fotos de los productos, para que todas
// se vean iguales en la tienda. Las fotos con ambiente se dejan como están.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '../components/Overlays';
import { errorText, panelFetch } from '../api';

export default function QuitarFondos({ user, theme, toast, onProductsChanged }) {
    const [open, setOpen] = useState(false);
    const [info, setInfo] = useState(null);
    const [busy, setBusy] = useState(false);
    const wasRunning = useRef(false);

    // Trae el estado: cuántos faltan, si está trabajando y si el automático está prendido.
    const load = useCallback(async () => {
        try {
            const next = await panelFetch('/tenant/products/backgrounds', { user });
            setInfo(next);
            return next;
        } catch (error) {
            toast(errorText(error), 'error');
            return null;
        }
    }, [user, toast]);

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    // Mientras trabaja, mira el avance cada 4 segundos. Al terminar, recarga los productos para ver las fotos nuevas.
    const running = info?.status?.state === 'running';
    useEffect(() => {
        if (!open || !running) return undefined;
        wasRunning.current = true;
        const timer = setInterval(() => void load(), 4000);
        return () => clearInterval(timer);
    }, [open, running, load]);
    useEffect(() => {
        if (wasRunning.current && info && !running) {
            wasRunning.current = false;
            void onProductsChanged?.();
        }
    }, [info, running, onProductsChanged]);

    const call = async (path, body, okMessage) => {
        setBusy(true);
        try {
            await panelFetch(path, { method: 'POST', body, user });
            if (okMessage) toast(okMessage, 'success');
            await load();
        } catch (error) {
            toast(errorText(error), 'error');
        } finally {
            setBusy(false);
        }
    };

    const auto = info?.auto === true;
    const status = info?.status || {};
    return (
        <>
            <button type="button" className="vp-btn sm" onClick={() => setOpen(true)} title="Quitar el fondo de las fotos de los productos">
                Quitar fondos
            </button>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                theme={theme}
                title="Quitar el fondo de las fotos"
                description="Las fotos con fondo liso (negro, blanco o de un solo color) quedan sin fondo, así todo el catálogo se ve parejo. Las fotos con ambiente no se tocan."
                footer={
                    <>
                        <button type="button" className="vp-btn soft" onClick={() => call('/tenant/products/backgrounds/restore', {}, 'Volvieron las fotos originales')} disabled={busy || running}>
                            Volver a las originales
                        </button>
                        <span style={{ flex: 1 }} />
                        <button type="button" className="vp-btn acc" onClick={() => call('/tenant/products/backgrounds/run', {}, 'Empezó: se procesa en segundo plano')} disabled={busy || running || !info?.pending}>
                            {running ? 'Trabajando…' : info?.pending ? `Quitar fondo a ${info.pending} productos` : 'Todo revisado'}
                        </button>
                    </>
                }
            >
                <div className="vp-row">
                    <div className="g">
                        <b>Automático para las fotos nuevas</b>
                        <span>Cada foto que entre (a mano o desde tu sistema de gestión) se revisa sola.</span>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={auto}
                        aria-label="Quitar fondo automático"
                        className={`vp-tog ${auto ? '' : 'off'}`}
                        disabled={busy || !info}
                        onClick={() => call('/tenant/products/backgrounds/auto', { enabled: !auto }, auto ? 'Automático apagado' : 'Automático prendido')}
                    />
                </div>
                <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                    {!info
                        ? 'Cargando…'
                        : running
                            ? `Trabajando: ${status.products || 0} productos listos, ${status.images || 0} fotos sin fondo.`
                            : status.state === 'done'
                                ? `Última pasada: ${status.images || 0} fotos sin fondo. Faltan ${info.pending} productos.`
                                : `Faltan revisar ${info.pending} productos.`}
                </p>
                <button type="button" className="vp-lnk" style={{ marginTop: 8 }} onClick={() => call('/tenant/products/backgrounds/run', { again: true }, 'Se revisa todo de nuevo')} disabled={busy || running}>
                    Revisar todas las fotos de nuevo
                </button>
            </Modal>
        </>
    );
}
