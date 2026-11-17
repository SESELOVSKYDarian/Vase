"use client";

// Le avisa a la página que muestra esta pantalla (app.vase.ar) cuánto mide, para que no quede con scroll propio.
import { useEffect, useRef, type ReactNode } from "react";

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
    return () => observer.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}
