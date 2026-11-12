"use client";

// Menú lateral de todos los paneles de Vase (app, Labs y Business): marca, secciones, subpáginas,
// cuenta con su menú, achicar el menú y, en el celular, cajón que se abre y se cierra.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

export type SidebarLinkProps = { href: string; className: string; title?: string; onClick?: () => void; children: ReactNode };
export type SidebarSubItem = { id: string; label: ReactNode; href?: string; onClick?: () => void };
export type SidebarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
  /** Link (usa renderLink) o botón (onClick). */
  href?: string;
  onClick?: () => void;
  /** Subpáginas que cuelgan del ítem (por ejemplo, Ajustes). Se muestran si open es true. */
  sub?: SidebarSubItem[];
  open?: boolean;
};
export type SidebarGroup = { label?: string; items: SidebarItem[] };

export type PanelSidebarProps = {
  brand: ReactNode;
  groups: SidebarGroup[];
  activeId?: string | null;
  activeSubId?: string | null;
  account: { avatar: ReactNode; name: ReactNode; detail?: ReactNode; label?: string };
  /** Opciones del menú de la cuenta. Recibe `close` para cerrarlo al elegir. */
  accountMenu: (close: () => void) => ReactNode;
  mini?: boolean;
  onToggleMini?: () => void;
  /** Celular: el menú es un cajón que se abre desde la barra de arriba. */
  phone?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  renderLink?: (props: SidebarLinkProps) => ReactNode;
  ariaLabel?: string;
};

const defaultLink = ({ href, className, title, onClick, children }: SidebarLinkProps) => (
  <a href={href} className={className} title={title} onClick={onClick}>
    {children}
  </a>
);

const svg = (d: string, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function PanelSidebar({
  brand,
  groups,
  activeId,
  activeSubId,
  account,
  accountMenu,
  mini = false,
  onToggleMini,
  phone = false,
  mobileOpen = false,
  onCloseMobile,
  renderLink = defaultLink,
  ariaLabel = "Menú",
}: PanelSidebarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return undefined;
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

  useEffect(() => {
    if (!phone || !mobileOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMobile?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phone, mobileOpen, onCloseMobile]);

  const closeAccount = () => setAccountOpen(false);
  const collLabel = mini ? "Agrandar el menú" : "Achicar el menú";
  const sideClass = ["vase-side", mini && !phone ? "mini" : "", phone ? "phone" : "", phone && mobileOpen ? "m-open" : ""].filter(Boolean).join(" ");

  const renderItem = (item: SidebarItem) => {
    const active = item.id === activeId;
    const className = active ? "vase-side-nb on" : "vase-side-nb";
    const title = mini ? item.label : undefined;
    const content = (
      <>
        {item.icon}
        <span className="vase-side-lbl">{item.label}</span>
        {item.badge ? <em className="vase-side-badge">{item.badge}</em> : null}
        {item.sub ? <span className={item.open ? "vase-side-chev open" : "vase-side-chev"} aria-hidden="true">{svg("m6 9 6 6 6-6")}</span> : null}
      </>
    );
    const button = item.href && !item.sub
      ? renderLink({ href: item.href, className, title, onClick: item.onClick, children: content })
      : (
        <button type="button" className={className} title={title} onClick={item.onClick} aria-current={active ? "page" : undefined} aria-expanded={item.sub ? Boolean(item.open) : undefined}>
          {content}
        </button>
      );
    return (
      <Fragment key={item.id}>
        {button}
        {item.sub && item.open ? (
          <div className="vase-side-sub">
            {item.sub.map((page) => {
              const subClass = active && page.id === activeSubId ? "vase-side-sn on" : "vase-side-sn";
              return page.href ? (
                <Fragment key={page.id}>{renderLink({ href: page.href, className: subClass, onClick: page.onClick, children: page.label })}</Fragment>
              ) : (
                <button key={page.id} type="button" className={subClass} onClick={page.onClick}>
                  {page.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </Fragment>
    );
  };

  return (
    <>
      {phone && mobileOpen ? <div className="vase-side-scrim" onClick={onCloseMobile} aria-hidden="true" /> : null}
      <aside className={sideClass} aria-label={ariaLabel} aria-hidden={phone && !mobileOpen ? true : undefined}>
        {phone ? (
          <button type="button" className="vase-side-close" onClick={onCloseMobile} aria-label="Cerrar el menú">×</button>
        ) : onToggleMini ? (
          <button type="button" className="vase-side-coll" onClick={onToggleMini} aria-label={collLabel} title={collLabel}>
            {svg(mini ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6")}
          </button>
        ) : null}
        <div className="vase-side-logo vase-brand">{brand}</div>
        <nav className="vase-side-nav">
          {groups.map((group, index) =>
            group.items.length ? (
              <Fragment key={group.label ?? index}>
                {group.label ? <div className="vase-side-grp">{group.label}</div> : null}
                {group.items.map(renderItem)}
              </Fragment>
            ) : null,
          )}
        </nav>
        <div className="vase-side-acc" ref={accountRef}>
          {accountOpen ? (
            <div className="vase-side-menu" role="menu">
              {accountMenu(closeAccount)}
            </div>
          ) : null}
          <button
            type="button"
            className="vase-side-accbtn"
            aria-label={account.label ?? "Tu cuenta"}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            onClick={() => setAccountOpen((open) => !open)}
          >
            <span className="vase-side-ava" aria-hidden="true">{account.avatar}</span>
            <span className="vase-side-ut">
              <b>{account.name}</b>
              {account.detail ? <small>{account.detail}</small> : null}
            </span>
            <span className="vase-side-chev acc" aria-hidden="true">{svg("m7 15 5 5 5-5M7 9l5-5 5 5", 15)}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
