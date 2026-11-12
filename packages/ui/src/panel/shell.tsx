"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

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

function Chevron({ right }: { right: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={right ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
    </svg>
  );
}

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
  const [accountOpen, setAccountOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const bodyRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

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

  const closeAccount = () => setAccountOpen(false);
  const collLabel = mini ? "Agrandar el menú" : "Achicar el menú";

  return (
    <div className="vpa">
      <aside className={mini ? "vpa-side mini" : "vpa-side"} aria-label="Menú">
        <button type="button" className="vpa-coll" onClick={toggleMini} aria-label={collLabel} title={collLabel}>
          <Chevron right={mini} />
        </button>
        <div className="vpa-logo">{brand}</div>
        <nav className="vpa-nav">
          {groups.map((group, index) =>
            group.items.length ? (
              <Fragment key={group.label ?? index}>
                {group.label ? <div className="vpa-grp">{group.label}</div> : null}
                {group.items.map((item) => (
                  <Fragment key={item.id}>
                    {renderLink({
                      href: item.href,
                      className: item.id === activeId ? "vpa-nb on" : "vpa-nb",
                      title: mini ? item.label : undefined,
                      children: (
                        <>
                          {item.icon}
                          <span>{item.label}</span>
                          {item.badge ? <em className="vpa-nbadge">{item.badge}</em> : null}
                        </>
                      ),
                    })}
                  </Fragment>
                ))}
              </Fragment>
            ) : null,
          )}
        </nav>
        <div className="vpa-acc" ref={accountRef}>
          {accountOpen ? (
            <div className="vpa-menu" role="menu">
              {accountMenu(closeAccount)}
            </div>
          ) : null}
          <button
            type="button"
            className="vpa-accbtn"
            aria-label={account.label ?? "Tu cuenta"}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            <i aria-hidden="true">{account.initial}</i>
            <span className="vpa-ut">
              <b>{account.name}</b>
              {account.detail ? <span>{account.detail}</span> : null}
            </span>
          </button>
        </div>
      </aside>

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
