"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CloudState = "saved" | "saving" | "error" | "offline";

const SaveStatusContext = createContext<{
  state: CloudState;
  message: string | null;
  report: (state: CloudState, message?: string | null) => void;
}>({ state: "saved", message: null, report: () => {} });

export function useSaveStatus() {
  return useContext(SaveStatusContext);
}

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CloudState>("saved");
  const [message, setMessage] = useState<string | null>(null);

  const report = useCallback((next: CloudState, nextMessage: string | null = null) => {
    setState(next);
    setMessage(nextMessage);
  }, []);

  useEffect(() => {
    const online = () => setState((current) => (current === "offline" ? "saved" : current));
    const offline = () => setState("offline");
    if (!navigator.onLine) offline();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const value = useMemo(() => ({ state, message, report }), [state, message, report]);
  return <SaveStatusContext.Provider value={value}>{children}</SaveStatusContext.Provider>;
}

const LABELS: Record<CloudState, string> = {
  saved: "Guardado en la nube",
  saving: "Guardando…",
  error: "No se pudo guardar",
  offline: "Sin conexión",
};

export function CloudButton() {
  const { state, message } = useSaveStatus();
  return (
    <span className={`vpa-cloud ${state}`}>
      <button type="button" className="vpa-ib" aria-label={`${LABELS[state]}. Los cambios se guardan solos.`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 18h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.4 9.1 4.5 4.5 0 0 0 7 18z" />
          {state === "saved" ? <path d="m9.5 13.5 2 2 3.5-4" /> : null}
          {state === "saving" ? <path d="M12 11v4m-2-2 2-2 2 2" /> : null}
          {state === "error" || state === "offline" ? <path d="M12 11v2.5m0 2.5h.01" /> : null}
        </svg>
      </button>
      <span className="vpa-cloud-tip" role="tooltip">
        <b>{LABELS[state]}</b>
        <span>{message ?? "Los cambios se guardan solos en la nube."}</span>
      </span>
    </span>
  );
}

/** Guarda solo, un momento después del último cambio, y avisa el estado a la nube. */
export function useAutosave<T>(save: (value: T) => Promise<{ ok: boolean; message?: string }>, delay = 900) {
  const { report } = useSaveStatus();
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Si la persona se va de la pantalla antes de que se guarde, se guarda igual.
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (pendingRef.current) void saveRef.current(pendingRef.current.value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      report("saving");
      pendingRef.current = { value };
      timerRef.current = window.setTimeout(async () => {
        pendingRef.current = null;
        try {
          const result = await save(value);
          report(result.ok ? "saved" : "error", result.ok ? null : result.message ?? null);
        } catch {
          report(navigator.onLine ? "error" : "offline");
        }
      }, delay);
    },
    [delay, report, save],
  );

  return schedule;
}
