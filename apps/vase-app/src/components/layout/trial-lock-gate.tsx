"use client";

// Cuando la prueba gratis terminó y la cuenta no pagó, el panel muestra este aviso en lugar de cada
// pantalla. Quedan abiertas solo las páginas para pagar, la cuenta y la ayuda.
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Páginas que se pueden usar aunque la prueba haya vencido. */
const OPEN_PATHS = ["/app/billing", "/app/settings", "/app/support", "/app/help"];

function isOpenPath(pathname: string) {
  return OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function TrialLockGate({ locked, children }: { locked: boolean; children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  if (!locked || isOpenPath(pathname)) return children;

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="vpa-card" style={{ maxWidth: 440, padding: 32, display: "grid", gap: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Tu prueba gratis terminó</h1>
        <p style={{ margin: 0, color: "var(--tx2, inherit)", lineHeight: 1.6 }}>
          Tus productos quedaron en pausa. No se borró nada: todo sigue como lo dejaste.
          Pagá tu plan y se habilitan al instante.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="vpa-btn acc" href={"/app/billing?prueba=vencida" as Route}>
            Pagar ahora
          </Link>
          <Link className="vpa-btn line" href={"/app/support" as Route}>
            Hablar con Vase
          </Link>
        </div>
      </div>
    </div>
  );
}
