import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Cierra con Escape y devuelve el foco a donde estaba al abrir.
function useDismiss(open, onClose) {
    const lastFocus = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        lastFocus.current = document.activeElement;
        const onKey = (event) => {
            if (event.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (lastFocus.current && typeof lastFocus.current.focus === 'function') lastFocus.current.focus();
        };
    }, [open, onClose]);
}

// Ventana centrada (o pegada a la derecha con side) para lo puntual: elegir imagen, ver precios, ayuda.
export function Modal({ open, onClose, title, description, side = false, wide = false, footer, children, theme }) {
    useDismiss(open, onClose);
    if (!open) return null;
    const sizeClass = side ? 'dr' : wide ? 'w' : '';
    return createPortal(
        <div className="vp" data-theme={theme} style={{ position: 'static', background: 'none', display: 'contents' }}>
            <div className={`vp-scrim ${side ? 'right' : ''}`} onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
                <div className={`vp-modal ${sizeClass}`} role="dialog" aria-modal="true" aria-label={title}>
                    <div className="vp-mh">
                        <div>
                            <h3>{title}</h3>
                            {description ? <p>{description}</p> : null}
                        </div>
                        <button type="button" className="vp-x" onClick={onClose} aria-label="Cerrar" autoFocus>×</button>
                    </div>
                    <div className="vp-mb">{children}</div>
                    {footer ? <div className="vp-mf">{footer}</div> : null}
                </div>
            </div>
        </div>,
        document.body
    );
}

// Barra lateral derecha: empuja el contenido (no lo tapa) y queda fija al hacer scroll.
export function SidePanel({ open, onClose, kicker, title, media, footer, children, label }) {
    useDismiss(open, onClose);
    if (!open) return null;
    return (
        <aside className="vp-rbar" aria-label={label || title}>
            <div className="vp-rh">
                {media}
                <div style={{ minWidth: 0 }}>
                    {kicker ? <small>{kicker}</small> : null}
                    <b>{title}</b>
                </div>
                <button type="button" className="vp-x" onClick={onClose} aria-label="Cerrar">×</button>
            </div>
            <div className="vp-rb">{children}</div>
            {footer ? <div className="vp-rf">{footer}</div> : null}
        </aside>
    );
}
