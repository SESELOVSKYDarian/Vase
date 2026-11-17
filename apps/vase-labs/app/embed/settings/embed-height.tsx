"use client";

// Le avisa a la página que muestra esta pantalla (app.vase.ar) cuánto mide, para que no quede con scroll propio.
// Cuando se abre un modal (por ejemplo, Administrar canal), le pide a esa página que muestre esta pantalla a
// pantalla completa por un rato: así el modal queda centrado en lo que ve la persona y lo de atrás no se mueve.
import { useEffect, useRef, type ReactNode } from "react";

const MODAL = ".labs-modal-backdrop";

export function EmbedHeight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.parent === window) return undefined;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const send = () => window.parent.postMessage({ type: "vase-embed-height", height: Math.ceil(node.getBoundingClientRect().height) }, "*");
    const observer = new ResizeObserver(send);
    observer.observe(node);
    send();

    // Aviso de modal abierto o cerrado.
    let modalOpen = false;
    const watch = new MutationObserver(() => {
      const open = Boolean(document.querySelector(MODAL));
      if (open === modalOpen) return;
      modalOpen = open;
      // Al cerrarse, el contenido vuelve a ocupar el recuadro normal.
      if (!open) Object.assign(node.style, { marginLeft: "", width: "" });
      window.parent.postMessage({ type: "vase-embed-modal", open }, "*");
    });
    watch.observe(document.body, { childList: true, subtree: true });

    // La página de afuera dice dónde estaba mirando la persona, para que el contenido no salte.
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = event.data as { type?: string; y?: number; left?: number; width?: number } | null;
      if (data?.type !== "vase-embed-scroll" || !Number.isFinite(data.y)) return;
      // A pantalla completa, el contenido se queda en el mismo lugar y del mismo ancho que antes.
      if (Number(data.width) > 0) Object.assign(node.style, { marginLeft: `${Number(data.left) || 0}px`, width: `${Number(data.width)}px` });
      window.scrollTo(0, Math.max(0, Number(data.y)));
    };
    window.addEventListener("message", onMessage);
    return () => {
      observer.disconnect();
      watch.disconnect();
      window.removeEventListener("message", onMessage);
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}
