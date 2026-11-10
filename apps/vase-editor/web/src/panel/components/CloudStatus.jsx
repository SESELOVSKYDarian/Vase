// Nube del panel: dice si los cambios ya quedaron guardados. Al pasar el mouse explica que se guardan solos
// y si falta Publicar para que se vean en la tienda.

const LABELS = {
    saved: 'Guardado en la nube',
    saving: 'Guardando…',
    error: 'No se pudo guardar',
    offline: 'Sin conexión',
};

function CloudIcon({ state }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 18h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.4 9.1 4.5 4.5 0 0 0 7 18z" />
            {state === 'saved' ? <path d="m9.5 13.5 2 2 3.5-4" /> : null}
            {state === 'saving' ? <path d="M12 11v4m-2-2 2-2 2 2" /> : null}
            {state === 'error' || state === 'offline' ? <path d="M12 11v2.5m0 2.5h.01" /> : null}
        </svg>
    );
}

export default function CloudStatus({ cloud = 'saved', unpublished = false }) {
    const label = LABELS[cloud] || LABELS.saved;
    return (
        <span className={`vp-cloud ${cloud}`}>
            <button type="button" className="vp-ibtn" aria-label={`${label}. ${unpublished ? 'Tenés cambios sin publicar.' : 'Todo publicado.'}`}>
                <CloudIcon state={cloud} />
                {unpublished ? <i className="dot" aria-hidden="true" /> : null}
            </button>
            <span className="vp-cloud-tip" role="tooltip">
                <b>{label}</b>
                <span>Los cambios se guardan solos en la nube.</span>
                <span>{unpublished ? 'Tocá Publicar para que se vean en la tienda.' : 'La tienda ya muestra todo lo que guardaste.'}</span>
            </span>
        </span>
    );
}
