"use client";

// Pestaña "Labs" de Ajustes: los ajustes de Labs (plan de uso, canales, motor de IA, puntaje de interés)
// se ven y se editan acá mismo, sin salir de app.vase.ar. Los sirve labs.vase.ar/embed/settings con tu sesión.
// Cuando Labs abre un modal, el recuadro pasa a pantalla completa mientras dure, así el modal queda centrado.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const LABS_URL = (process.env.NEXT_PUBLIC_LABS_URL ?? "https://labs.vase.ar").replace(/\/+$/, "");

const FULL: CSSProperties = { position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: 1000 };

export function LabsSettingsFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(720);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(false);
  const lookingAt = useRef(0);
  const origin = useMemo(() => new URL(LABS_URL).origin, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (event.origin !== origin || !frame || event.source !== frame.contentWindow) return;
      const data = event.data as { type?: string; height?: number; open?: boolean } | null;
      if (data?.type === "vase-embed-height") {
        const value = Number(data.height);
        if (Number.isFinite(value) && value > 0) setHeight(Math.min(Math.max(value + 4, 240), 20000));
      }
      if (data?.type === "vase-embed-modal") {
        // Lo que la persona estaba mirando adentro del recuadro, para que al agrandarlo no salte.
        if (data.open) lookingAt.current = -frame.getBoundingClientRect().top;
        setModal(Boolean(data.open));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  // Ya a pantalla completa, el recuadro vuelve a mostrar lo que la persona estaba mirando.
  useEffect(() => {
    if (!modal) return;
    const id = window.requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage({ type: "vase-embed-scroll", y: lookingAt.current }, origin));
    return () => window.cancelAnimationFrame(id);
  }, [modal, origin]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: modal ? height : undefined }}>
      {!loaded ? <p className="vpa-tp-note">Cargando los ajustes de Labs…</p> : null}
      <iframe
        ref={frameRef}
        src={`${LABS_URL}/embed/settings`}
        title="Ajustes de Vase Labs"
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height,
          border: 0,
          display: "block",
          background: "transparent",
          visibility: loaded ? "visible" : "hidden",
          ...(modal ? FULL : null),
        }}
      />
    </div>
  );
}
