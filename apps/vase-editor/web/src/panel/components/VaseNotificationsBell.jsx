import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

// Campana de notificaciones de tu cuenta de Vase: las mismas que en app.vase.ar y en el resto de los
// productos. El panel es la pantalla de app (con tu sesión), cargado adentro de Business.
export default function VaseNotificationsBell({ vaseUrl, tenantSlug, theme }) {
    const frameRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    const src = useMemo(() => {
        const params = new URLSearchParams({ theme: theme === 'dark' ? 'dark' : 'light' });
        if (tenantSlug) params.set('tenant', tenantSlug);
        return `${vaseUrl}/app/embed/notifications?${params.toString()}`;
    }, [tenantSlug, theme, vaseUrl]);

    const origin = useMemo(() => {
        try {
            return new URL(vaseUrl).origin;
        } catch {
            return '';
        }
    }, [vaseUrl]);

    useEffect(() => {
        const onMessage = (event) => {
            if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
            if (event.data?.type === 'vase-embed-unread') setUnread(Math.max(0, Number(event.data.count) || 0));
            if (event.data?.type === 'vase-embed-close') setOpen(false);
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [origin]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <>
            <button type="button" className="vp-ibtn" onClick={() => setOpen(true)} aria-label={`Notificaciones: ${unread}`} title="Notificaciones">
                <Icon name="bell" size={17} />
                {unread ? <span className="n">{unread > 99 ? '99+' : unread}</span> : null}
            </button>
            <div className={open ? 'vp-vnotif open' : 'vp-vnotif'} onClick={() => setOpen(false)} aria-hidden={!open}>
                <iframe ref={frameRef} src={src} title="Notificaciones de tu cuenta de Vase" onClick={(event) => event.stopPropagation()} />
            </div>
        </>
    );
}
