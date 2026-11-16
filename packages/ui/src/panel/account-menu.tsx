"use client";

// Menú de la cuenta (el que se abre al tocar tu usuario, abajo a la izquierda). Es el mismo en todos
// los productos de Vase: quién sos, Ajustes, Ayuda y soporte, Volver a Vase y Cerrar sesión.
// En app.vase.ar no se pasa `backToVase`, porque ya estás en Vase.
import type { ReactNode } from "react";

/** Cada opción es un link (href) o una acción (onClick). */
export type AccountMenuAction = { href?: string; onClick?: () => void; newTab?: boolean };
type LinkRenderer = (props: { href: string; className: string; onClick?: () => void; children: ReactNode }) => ReactNode;

export type PanelAccountMenuProps = {
  /** Correo o nombre de quien está usando el panel. */
  heading?: ReactNode;
  settings: AccountMenuAction;
  help: AccountMenuAction;
  backToVase?: AccountMenuAction;
  signOut: AccountMenuAction;
  /** Cierra el menú al elegir una opción. */
  close: () => void;
  /** Para links internos con el router de cada app (Next Link, NavLink). Por defecto, un <a>. */
  renderLink?: LinkRenderer;
};

export function PanelAccountMenu({ heading, settings, help, backToVase, signOut, close, renderLink }: PanelAccountMenuProps) {
  const option = (label: ReactNode, action: AccountMenuAction, className = "vase-am") => {
    const onClick = () => {
      close();
      action.onClick?.();
    };
    if (!action.href) {
      return (
        <button type="button" className={className} role="menuitem" onClick={onClick}>
          {label}
        </button>
      );
    }
    // Los links a otro sitio (otro producto, la ayuda) siempre van como <a> común.
    const external = action.newTab || /^https?:\/\//i.test(action.href);
    if (renderLink && !external) return renderLink({ href: action.href, className, onClick, children: label });
    return (
      <a href={action.href} className={className} role="menuitem" onClick={onClick} target={action.newTab ? "_blank" : undefined} rel={action.newTab ? "noreferrer" : undefined}>
        {label}
      </a>
    );
  };

  return (
    <>
      {heading ? <div className="vase-am-h">{heading}</div> : null}
      {option("Ajustes", settings)}
      {option("Ayuda y soporte", help)}
      {backToVase ? option("← Volver a Vase", backToVase) : null}
      {option("Cerrar sesión", signOut, "vase-am out")}
    </>
  );
}
