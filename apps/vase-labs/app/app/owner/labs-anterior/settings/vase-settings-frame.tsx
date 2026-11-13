"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const APP_URL = (process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Mi perfil, Mi negocio y Facturación adentro de Labs: es la misma pantalla de app.vase.ar,
 * cargada con tu sesión de Vase, así no hay que salir de Labs ni cargar los datos dos veces.
 */
export function VaseSettingsFrame({ tab, theme }: { tab: "perfil" | "negocio" | "facturacion"; theme: "light" | "dark" }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);
  const [loaded, setLoaded] = useState(false);
  const src = useMemo(() => `${APP_URL}/app/embed/settings?${new URLSearchParams({ tab, theme }).toString()}`, [tab, theme]);
  const origin = useMemo(() => new URL(APP_URL).origin, []);

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
      {!loaded ? <p className="vpa-mut">Cargando…</p> : null}
      <iframe
        key={src}
        ref={frameRef}
        src={src}
        title="Ajustes de tu cuenta de Vase"
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height, border: 0, display: "block", background: "transparent", visibility: loaded ? "visible" : "hidden" }}
      />
      <p className="vpa-mut" style={{ margin: 0, fontSize: 12 }}>
        Lo cargás una vez y lo usan todos tus productos de Vase. ¿No se ve?{" "}
        <a href={`${APP_URL}/app/settings?tab=${tab}`} target="_blank" rel="noreferrer">
          Abrilo en Vase ↗
        </a>
      </p>
    </div>
  );
}
