"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CloudStatus, type CloudState } from "@vase/ui/panel";

export type { CloudState };

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

export function CloudButton() {
  const { state, message } = useSaveStatus();
  return <CloudStatus state={state} note={message} />;
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
