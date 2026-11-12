// Nube de guardado de todos los paneles de Vase. Al pasar el mouse muestra una pastilla oscura con el estado.
// Fuente única: Business recibe una copia exacta (scripts/sync-ui-to-business.mjs).

export type CloudState = "saved" | "saving" | "error" | "offline";

export const CLOUD_LABELS: Record<CloudState, string> = {
  saved: "Guardado en la nube",
  saving: "Guardando…",
  error: "No se pudo guardar",
  offline: "Sin conexión",
};

function CloudIcon({ state }: { state: CloudState }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 18h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.4 9.1 4.5 4.5 0 0 0 7 18z" />
      {state === "saved" ? <path d="m9.5 13.5 2 2 3.5-4" /> : null}
      {state === "saving" ? <path d="M12 11v4m-2-2 2-2 2 2" /> : null}
      {state === "error" || state === "offline" ? <path d="M12 11v2.5m0 2.5h.01" /> : null}
    </svg>
  );
}

/**
 * state: cómo está el guardado. note: una línea extra opcional (por ejemplo, "Falta publicar" o el error).
 * dot: puntito naranja (por ejemplo, cambios sin publicar).
 */
export function CloudStatus({ state = "saved", note, dot = false }: { state?: CloudState; note?: string | null; dot?: boolean }) {
  const label = CLOUD_LABELS[state] ?? CLOUD_LABELS.saved;
  const tip = note ? `${label} · ${note}` : label;
  return (
    <span className={`vase-cloud ${state}`}>
      <button type="button" className="vase-cloud-btn" aria-label={tip}>
        <CloudIcon state={state} />
        {dot ? <i className="dot" aria-hidden="true" /> : null}
      </button>
      <span className="vase-cloud-tip" role="tooltip">{tip}</span>
    </span>
  );
}
