"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const APP_URL = (process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Campana de notificaciones de tu cuenta de Vase: las mismas que en app.vase.ar y en el resto de los
 * productos (por ejemplo, cuando el asistente pasa una conversación a una persona).
 */
export function VaseNotificationsBell() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setSrc(`${APP_URL}/app/embed/notifications?theme=${theme}`);
  }, []);

  useEffect(() => {
    const origin = new URL(APP_URL).origin;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; count?: number } | null;
      if (data?.type === "vase-embed-unread") setUnread(Math.max(0, Number(data.count) || 0));
      if (data?.type === "vase-embed-close") setOpen(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="vpa-ib" onClick={() => setOpen(true)} aria-label={`Notificaciones: ${unread}`} title="Notificaciones">
        <Bell size={18} aria-hidden="true" />
        {unread ? <span className="n">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      <div className={open ? "lx-vnotif open" : "lx-vnotif"} onClick={() => setOpen(false)} aria-hidden={!open}>
        {src ? <iframe ref={frameRef} src={src} title="Notificaciones de tu cuenta de Vase" /> : null}
      </div>
    </>
  );
}
