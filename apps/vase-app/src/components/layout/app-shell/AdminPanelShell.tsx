"use client";

// Admin nuevo: el mismo marco que app.vase.ar (menú lateral, barra de arriba) con 7 secciones. Las pantallas que
// antes eran secciones sueltas ahora son pestañas arriba del contenido. Ver lib/navigation/admin-sections.ts.
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Columns3, FolderKanban, MessageCircle, Home, LayoutGrid, SlidersHorizontal, Users, Wallet } from "lucide-react";
import { PanelAccountMenu, PanelBrandLogo, PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { signOutAction } from "@/app/(auth)/actions";
import { NavLink } from "@/components/layout/nav-link";
import { NotificationsDrawer, PanelThemeContext, type PanelTheme } from "@/components/layout/client-shell/NotificationsDrawer";
import { ADMIN_SECTIONS, resolveAdminSection, type AdminSection } from "@/lib/navigation/admin-sections";
import { toInternalAdminPath, toPublicAdminPath } from "@/lib/security/admin-host-routing";
import type { AppShellProps } from "./infer-active-section";
import "@/components/admin/admin-legacy-bridge.css";
import "@/components/admin/admin-ui.css";

const labsUrl = (process.env.NEXT_PUBLIC_LABS_URL ?? "https://labs.vase.ar").replace(/\/+$/, "") + "/";
const workspaceUrl = process.env.NODE_ENV === "production" ? "https://workspace.vase.ar/" : "/app/workspace";

const ICONS: Record<AdminSection["id"], typeof Home> = {
  inicio: Home,
  clientes: Users,
  proyectos: FolderKanban,
  productos: LayoutGrid,
  finanzas: Wallet,
  ajustes: SlidersHorizontal,
};

export function AdminPanelShell({ title, subtitle, notifications = [], currentUserName, children }: AppShellProps & { children?: ReactNode }) {
  const pathname = usePathname() ?? "/app/admin";
  // En admin.vase.ar las rutas van sin /app/admin; en app.vase.ar/app/admin, con.
  const onAdminHost = !pathname.startsWith("/app/admin") && toInternalAdminPath(pathname) !== null;
  const internalPath = onAdminHost ? (toInternalAdminPath(pathname) ?? "/app/admin") : pathname;
  const href = (internal: string) => (onAdminHost ? (toPublicAdminPath(internal) ?? "/") : internal);
  const { section, tab } = resolveAdminSection(internalPath);

  const [theme, setTheme] = useState<PanelTheme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("vase-panel-theme") === "dark" ? "dark" : "light";
  });
  const [drawer, setDrawer] = useState<"notas" | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("vase-panel-theme", theme);
  }, [theme]);

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const unread = notifications.filter((notification) => !notification.isRead).length;
  const name = currentUserName?.trim() || "Admin Vase";

  const groups: PanelNavGroup[] = [];
  for (const item of ADMIN_SECTIONS) {
    const Icon = ICONS[item.id];
    const entry = { id: item.id, href: href(item.tabs[0].href), label: item.label, icon: <Icon size={18} aria-hidden="true" /> };
    const group = groups.find((existing) => existing.label === item.group);
    if (group) group.items.push(entry);
    else groups.push({ label: item.group, items: [entry] });
  }

  return (
    <PanelThemeContext.Provider value={themeValue}>
      <PanelShell
        brand={
          <>
            <PanelBrandLogo />
            <b>vase</b>
            <span className="vase-pill admin">Admin</span>
          </>
        }
        groups={groups}
        activeId={section.id}
        title={title}
        subtitle={subtitle}
        storageKey="vase-admin-sidebar"
        renderLink={({ href: to, className, title: hint, onClick, children: content }) => (
          <NavLink href={to} className={className} title={hint} onClick={onClick}>
            {content}
          </NavLink>
        )}
        account={{ initial: name.slice(0, 1).toUpperCase(), name: "Vase", detail: name }}
        accountMenu={(close) => (
          <PanelAccountMenu
            close={close}
            heading={name}
            settings={{ href: href("/app/admin/settings/account") }}
            help={{ href: href("/app/admin/wiki") }}
            backToVase={{ href: "https://app.vase.ar/app" }}
            signOut={{ onClick: () => setConfirmSignOut(true) }}
            renderLink={({ href: to, className, onClick, children: content }) => (
              <NavLink href={to} className={className} onClick={onClick}>
                {content}
              </NavLink>
            )}
          />
        )}
        actions={
          <>
          <a className="vpa-btn line sm" href={labsUrl} title="Labs de Vase: el WhatsApp de Vase y sus chats">
            <MessageCircle size={14} aria-hidden="true" />
            WhatsApp de Vase
          </a>
          <a className="vpa-btn line sm" href={workspaceUrl} title="Tablero de tickets y trabajos">
            <Columns3 size={14} aria-hidden="true" />
            Workspace
          </a>
          <button type="button" className="vpa-ib" aria-label="Notificaciones" onClick={() => setDrawer("notas")}>
            <Bell size={18} aria-hidden="true" />
            {unread > 0 ? <span className="n">{unread}</span> : null}
          </button>
          </>
        }
        overlays={
          <>
            {drawer === "notas" ? <NotificationsDrawer notifications={notifications} onClose={() => setDrawer(null)} /> : null}
            {confirmSignOut ? (
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
            ) : null}
          </>
        }
      >
        {section.tabs.length > 1 ? (
          <nav className="vpa-seg vpa-admin-tabs" aria-label={`Pestañas de ${section.label}`}>
            {section.tabs.map((item) => (
              <NavLink
                key={item.href}
                href={href(item.href) as Route}
                className={item.href === tab.href ? "on" : ""}
                aria-current={item.href === tab.href ? "page" : undefined}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
        <div className="vpa-admin-body">{children}</div>
      </PanelShell>
    </PanelThemeContext.Provider>
  );
}
