"use client";

// Pestaña "Labs" de Ajustes: los ajustes de Labs (plan de uso, canales, motor de IA, puntaje de interés)
// se ven y se editan acá mismo, sin salir de app.vase.ar. Los sirve labs.vase.ar/embed/settings con tu sesión.
import { useEffect, useMemo, useRef, useState } from "react";

const LABS_URL = (process.env.NEXT_PUBLIC_LABS_URL ?? "https://labs.vase.ar").replace(/\/+$/, "");

export function LabsSettingsFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(720);
  const [loaded, setLoaded] = useState(false);
  const origin = useMemo(() => new URL(LABS_URL).origin, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      const value = Number(data?.type === "vase-embed-height" ? data.height : NaN);
      if (Number.isFinite(value) && value > 0) setHeight(Math.min(Math.max(value + 4, 240), 20000));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!loaded ? <p className="vpa-tp-note">Cargando los ajustes de Labs…</p> : null}
      <iframe
        ref={frameRef}
        src={`${LABS_URL}/embed/settings`}
        title="Ajustes de Vase Labs"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height, border: 0, display: "block", background: "transparent", visibility: loaded ? "visible" : "hidden" }}
      />
    </div>
  );
}
