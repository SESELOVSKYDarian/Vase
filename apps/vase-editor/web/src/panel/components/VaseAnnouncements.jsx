import { useEffect, useRef, useState } from 'react';

// Anuncios de Vase (Admin > Anuncios). La ventana la dibuja app.vase.ar en un iframe que ocupa toda la
// pantalla; queda oculto y solo aparece si hay algo para mostrar.
export default function VaseAnnouncements({ vaseUrl, theme }) {
    const frameRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [closed, setClosed] = useState(false);
    const mode = theme === 'dark' ? 'dark' : 'light';
    const src = `${vaseUrl}/app/embed/announcements?surface=business&theme=${mode}`;

    useEffect(() => {
        const origin = new URL(vaseUrl).origin;
        const onMessage = (event) => {
            if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
            const data = event.data || {};
            if (data.type === 'vase-announcements') setVisible(Number(data.count) > 0);
            if (data.type === 'vase-announcements-close') {
                setVisible(false);
                setClosed(true);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [vaseUrl]);

    if (closed) return null;
    return (
        <iframe
            ref={frameRef}
            src={src}
            title="Novedades de Vase"
            aria-hidden={!visible}
            tabIndex={visible ? 0 : -1}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                zIndex: 2147483000,
                background: 'transparent',
                colorScheme: mode,
                display: visible ? 'block' : 'none',
            }}
        />
    );
}
