"use client";

import { useEffect, useRef, useState } from "react";

const APP_URL = (process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Anuncios de Vase (los que el equipo publica en Admin › Anuncios). La ventana la dibuja app.vase.ar en un
 * iframe que ocupa toda la pantalla; queda oculto y solo aparece si hay algo para mostrar.
 */
export function VaseAnnouncements({ surface }: { surface: "labs" | "management" | "rest" | "business" }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || root.classList.contains("dark");
    setTheme(dark ? "dark" : "light");
    setSrc(`${APP_URL}/app/embed/announcements?surface=${surface}&theme=${dark ? "dark" : "light"}`);
  }, [surface]);

  useEffect(() => {
    const origin = new URL(APP_URL).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; count?: number } | null;
      if (data?.type === "vase-announcements") setVisible(Number(data.count) > 0);
      if (data?.type === "vase-announcements-close") {
        setVisible(false);
        setClosed(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (closed || !src) return null;
  return (
    <iframe
      ref={frameRef}
      src={src}
      title="Novedades de Vase"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        zIndex: 2147483000,
        background: "transparent",
        colorScheme: theme,
        display: visible ? "block" : "none",
      }}
    />
  );
}
