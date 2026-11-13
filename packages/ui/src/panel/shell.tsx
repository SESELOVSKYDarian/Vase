"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PanelSidebar } from "./sidebar";

// Marco del panel de Vase: menú lateral (se puede achicar), cuenta, barra de arriba y botón para subir.
// Lo usan app.vase.ar y los productos (Labs, ...) para que todo se vea igual.

export type PanelNavItem = { id: string; href: string; label: string; icon: ReactNode; badge?: ReactNode };
export type PanelNavGroup = { label?: string; items: PanelNavItem[] };
export type PanelLinkProps = { href: string; className: string; title?: string; onClick?: () => void; children: ReactNode };

type PanelShellProps = {
  /** Logo y nombre arriba del menú. */
  brand: ReactNode;
  groups: PanelNavGroup[];
  activeId?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Botones de la barra de arriba (nube, notificaciones, ayuda...). */
  actions?: ReactNode;
  account: { initial: ReactNode; name: string; detail?: ReactNode; label?: string };
  /** Opciones del menú de la cuenta. Recibe `close` para cerrarlo al elegir. */
  accountMenu: (close: () => void) => ReactNode;
  /** Cómo se arma cada link (Next Link, NavLink...). Por defecto, un <a>. */
  renderLink?: (props: PanelLinkProps) => ReactNode;
  /** Cajones y diálogos que se dibujan encima del panel. */
  overlays?: ReactNode;
  /** Sin márgenes ni scroll propio (pantallas tipo bandeja de mensajes). */
  flush?: boolean;
  /** Dónde se recuerda si el menú está achicado. */
  storageKey?: string;
  children: ReactNode;
};

const defaultLink = ({ href, className, title, onClick, children }: PanelLinkProps) => (
  <a href={href} className={className} title={title} onClick={onClick}>
    {children}
  </a>
);

export function PanelShell({
  brand,
  groups,
  activeId,
  title,
  subtitle,
  actions,
  account,
  accountMenu,
  renderLink = defaultLink,
  overlays,
  flush = false,
  storageKey = "vase-panel-mini",
  children,
}: PanelShellProps) {
  const [mini, setMini] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const bodyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      setMini(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // sin acceso al almacenamiento: queda grande
    }
  }, [storageKey]);

  // En pantallas anchas scrollea el contenido; en el celular, la página entera.
  useEffect(() => {
    const body = bodyRef.current;
    const update = () => setShowTop(Math.max(body?.scrollTop ?? 0, window.scrollY) > 400);
    body?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      body?.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  const toggleMini = () => {
    setMini((current) => {
      try {
        window.localStorage.setItem(storageKey, current ? "0" : "1");
      } catch {
        // no pasa nada
      }
      return !current;
    });
  };

  const scrollToTop = () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    bodyRef.current?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  };


  return (
    <div className="vpa">
      <PanelSidebar
        brand={brand}
        groups={groups}
        activeId={activeId}
        mini={mini}
        onToggleMini={toggleMini}
        renderLink={renderLink}
        account={{ avatar: account.initial, name: account.name, detail: account.detail, label: account.label }}
        accountMenu={accountMenu}
      />

      <div className="vpa-main">
        <header className="vpa-top">
          <div className="vpa-g1">
            <h1 className="vpa-ttl">{title}</h1>
            {subtitle ? <div className="vpa-sub">{subtitle}</div> : null}
          </div>
          {actions}
        </header>
        <main className={flush ? "vpa-body flush" : "vpa-body"} id="main-content" ref={bodyRef}>
          <div className="vpa-wrap">{children}</div>
        </main>
      </div>

      {showTop && !flush ? (
        <button type="button" className="vpa-totop" aria-label="Volver arriba" onClick={scrollToTop}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      ) : null}
      {overlays}
    </div>
  );
}
