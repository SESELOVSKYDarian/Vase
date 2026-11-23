"use client";

// Marco de workspace.vase.ar: el mismo panel de Vase (menú lateral y barra), con su propio menú.
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Columns3, List, UserRound } from "lucide-react";
import { PanelAccountMenu, PanelBrandLogo, PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { signOutAction } from "@/app/(auth)/actions";
import "./workspace.css";

export type WorkspaceNavId = "tablero" | "lista" | "mios";

export function WorkspaceShell({
  base,
  active,
  title,
  subtitle,
  userName,
  adminUrl,
  actions,
  children,
}: {
  base: string;
  active: WorkspaceNavId | null;
  title: ReactNode;
  subtitle?: ReactNode;
  userName: string;
  adminUrl: string | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const href = (path: string) => `${base}${path === "/" && base ? "" : path}` || "/";

  useEffect(() => {
    const theme = window.localStorage.getItem("vase-panel-theme") === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const groups: PanelNavGroup[] = [
    {
      label: "Trabajo",
      items: [
        { id: "tablero", href: href("/"), label: "Tablero", icon: <Columns3 size={18} aria-hidden="true" /> },
        { id: "lista", href: href("/lista"), label: "Lista", icon: <List size={18} aria-hidden="true" /> },
        { id: "mios", href: href("/?ver=mios"), label: "Lo mío", icon: <UserRound size={18} aria-hidden="true" /> },
      ],
    },
  ];

  return (
    <PanelShell
      brand={
        <>
          <PanelBrandLogo />
          <b>vase</b>
          <span className="vase-pill admin">Workspace</span>
        </>
      }
      groups={groups}
      activeId={active}
      title={title}
      subtitle={subtitle}
      actions={actions}
      storageKey="vase-workspace-sidebar"
      renderLink={({ href: to, className, title: hint, onClick, children: content }) => (
        <Link href={to as Route} className={className} title={hint} onClick={onClick}>
          {content}
        </Link>
      )}
      account={{ initial: userName.slice(0, 1).toUpperCase(), name: "Workspace", detail: userName }}
      accountMenu={(close) => (
        <PanelAccountMenu
          close={close}
          heading={userName}
          settings={{ href: adminUrl ?? "https://app.vase.ar/app" }}
          help={{ href: "https://help.vase.ar" }}
          backToVase={{ href: "https://app.vase.ar/app" }}
          signOut={{ onClick: () => setConfirmSignOut(true) }}
        />
      )}
      overlays={
        confirmSignOut ? (
          <div className="vpa-dialog">
            <div role="dialog" aria-label="Cerrar sesión">
              <h3>¿Cerrar sesión?</h3>
              <p>Vas a volver a la pantalla de ingreso.</p>
              <div className="row">
                <button type="button" className="vpa-btn soft" onClick={() => setConfirmSignOut(false)}>
                  Cancelar
                </button>
                <form action={signOutAction}>
                  <button type="submit" className="vpa-btn ink">
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className="wsp">{children}</div>
    </PanelShell>
  );
}
