"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "@vase/ui/panel.css";
import { SaveStatusProvider } from "@/components/layout/save-status";

/**
 * Marco de una página de app que se muestra adentro de otro producto de Vase (Business, Labs…).
 * Toma el modo claro u oscuro del producto y le avisa su alto para que no quede barra de scroll doble.
 */
export function EmbedFrame({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    document.body.style.background = "transparent";
  }, [theme]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return undefined;
    const send = () => window.parent.postMessage({ type: "vase-embed-height", height: Math.ceil(node.getBoundingClientRect().height) }, "*");
    const observer = new ResizeObserver(send);
    observer.observe(node);
    send();
    return () => observer.disconnect();
  }, []);

  return (
    <SaveStatusProvider>
      <div ref={rootRef} className="vpa vpa-embed">
        <div className="vpa-wrap">{children}</div>
      </div>
    </SaveStatusProvider>
  );
}
