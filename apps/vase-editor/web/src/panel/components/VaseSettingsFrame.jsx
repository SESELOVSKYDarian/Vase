import { useEffect, useMemo, useRef, useState } from 'react';

// Ajustes de tu cuenta de Vase (Mi negocio, Mi perfil, Facturación) adentro del panel de Business.
// Es la misma pantalla que en app.vase.ar: se carga desde allá con tu sesión de Vase, así no hay
// que salir de Business ni cargar los datos dos veces.
export default function VaseSettingsFrame({ tab, vaseUrl, tenantSlug, theme }) {
    const frameRef = useRef(null);
    const [height, setHeight] = useState(640);
    const [loaded, setLoaded] = useState(false);

    const src = useMemo(() => {
        const params = new URLSearchParams({ tab, theme: theme === 'dark' ? 'dark' : 'light' });
        if (tenantSlug) params.set('tenant', tenantSlug);
        return `${vaseUrl}/app/embed/settings?${params.toString()}`;
    }, [tab, tenantSlug, theme, vaseUrl]);

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
            const value = Number(event.data?.type === 'vase-embed-height' ? event.data.height : NaN);
            if (Number.isFinite(value) && value > 0) setHeight(Math.min(Math.max(value + 4, 240), 20000));
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [origin]);

    useEffect(() => setLoaded(false), [src]);

    return (
        <div className="vp-vaseset">
            {!loaded ? <p className="vp-mut">Cargando…</p> : null}
            <iframe
                ref={frameRef}
                key={src}
                src={src}
                title="Ajustes de tu cuenta de Vase"
                className="vp-vaseset-frame"
                style={{ height, visibility: loaded ? 'visible' : 'hidden' }}
                onLoad={() => setLoaded(true)}
            />
            <p className="vp-note">
                Lo cargás una vez y lo usan todos tus productos de Vase. ¿No se ve? <a href={`${vaseUrl}/app/settings?tab=${encodeURIComponent(tab)}`} target="_blank" rel="noreferrer">Abrilo en Vase ↗</a>
            </p>
        </div>
    );
}
