"use client";

// Parte de client-shell.tsx: SectionHelpDrawer, ClientShell.
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, CircleHelp, Home, X } from "lucide-react";
import { PanelBrandLogo, PanelShell, type PanelNavGroup } from "@vase/ui/panel";
import { signOutAction } from "@/app/(auth)/actions";
import { NavLink } from "@/components/layout/nav-link";
import { useTenantLogo } from "@/components/layout/tenant-logo";
import { CloudButton, SaveStatusProvider } from "@/components/layout/save-status";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { SupportChatProvider } from "@/components/support/support-chat-context";
import { PANEL_HELP, resolvePanelSection } from "@/lib/navigation/panel-sections";
import { ClientShellProps, NAV_CUENTA, NAV_PRINCIPAL, NotificationsDrawer, PanelTheme, PanelThemeContext, ROLE_WEIGHT } from "./NotificationsDrawer";

export function SectionHelpDrawer({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const help = PANEL_HELP[resolvePanelSection(pathname)];
  return (
    <div className="vpa-ov" onClick={onClose}>
      <div className="vpa-dr" role="dialog" aria-label={help.title} onClick={(event) => event.stopPropagation()}>
        <div className="vpa-mh">
          <div>
            <h3>{help.title}</h3>
            <p>{help.intro}</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="vpa-drb">
          {help.steps.length > 0 ? (
            <ol className="vpa-steps">
              {help.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          <a className="vpa-btn soft wide" href="https://help.vase.ar" target="_blank" rel="noreferrer">
            Ver guías y videos
          </a>
        </div>
      </div>
    </div>
  );
}

export function ClientShell({
  title,
  subtitle,
  tenantLabel,
  notifications = [],
  currentUserName,
  viewerRole = "OWNER",
  children,
}: ClientShellProps) {
  const pathname = usePathname() ?? "/app";
  const section = resolvePanelSection(pathname);
  const [theme, setTheme] = useState<PanelTheme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("vase-panel-theme") === "dark" ? "dark" : "light";
  });
  const [drawer, setDrawer] = useState<"notas" | "ayuda" | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("vase-panel-theme", theme);
    // Business y Labs viven en otro subdominio: la cookie compartida les dice qué modo eligió la persona.
    if (window.location.hostname.endsWith("vase.ar")) {
      document.cookie = `vase_theme=${theme}; domain=.vase.ar; path=/; max-age=31536000; SameSite=Lax; Secure`;
    }
  }, [theme]);

  const unread = notifications.filter((notification) => !notification.isRead).length;
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const accountName = tenantLabel?.trim() || "Tu cuenta";
  const tenantLogo = useTenantLogo();
  const activeId = section === "business" || section === "dominios" ? "productos" : section;
  const toItem = ({ id, href, label, icon: Icon }: { id: string; href: string; label: string; icon: typeof Home }) => ({
    id,
    href,
    label,
    icon: <Icon size={18} aria-hidden="true" />,
  });
  const groups: PanelNavGroup[] = [
    { label: "Principal", items: NAV_PRINCIPAL.filter(({ id }) => id === "inicio" || viewerRole === "OWNER").map(toItem) },
    { label: "Cuenta", items: NAV_CUENTA.filter((item) => ROLE_WEIGHT[viewerRole] >= ROLE_WEIGHT[item.minRole]).map(toItem) },
  ];

  return (
    <SupportChatProvider>
      <PanelThemeContext.Provider value={themeValue}>
        <SaveStatusProvider>
          <PanelShell
            brand={
              <>
                <PanelBrandLogo />
                <b>vase</b>
              </>
            }
            groups={groups}
            activeId={activeId}
            title={title}
            subtitle={subtitle}
            renderLink={({ href, className, title: hint, onClick, children: content }) => (
              <NavLink href={href} className={className} title={hint} onClick={onClick}>
                {content}
              </NavLink>
            )}
            account={{
              // eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente, de cualquier origen
              initial: tenantLogo ? <img src={tenantLogo} alt="" /> : accountName.slice(0, 1).toUpperCase(),
              name: accountName,
              detail: currentUserName,
            }}
            accountMenu={(close) => (
              <>
                <NavLink href="/app/settings" className="vpa-am" onClick={close}>
                  Ajustes
                </NavLink>
                <NavLink href="/app/help" className="vpa-am" onClick={close}>
                  Ayuda y soporte
                </NavLink>
                <button
                  type="button"
                  className="vpa-am out"
                  role="menuitem"
                  onClick={() => {
                    close();
                    setConfirmSignOut(true);
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            )}
            actions={
              <>
                <CloudButton />
                <button type="button" className="vpa-ib" aria-label="Notificaciones" onClick={() => setDrawer("notas")}>
                  <Bell size={18} aria-hidden="true" />
                  {unread > 0 ? <span className="n">{unread}</span> : null}
                </button>
                <button type="button" className="vpa-ib" aria-label="Cómo usar esta sección" onClick={() => setDrawer("ayuda")}>
                  <CircleHelp size={18} aria-hidden="true" />
                </button>
              </>
            }
            overlays={
              <>
                {drawer === "notas" ? <NotificationsDrawer notifications={notifications} onClose={() => setDrawer(null)} /> : null}
                {drawer === "ayuda" ? <SectionHelpDrawer pathname={pathname} onClose={() => setDrawer(null)} /> : null}
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
            {children}
          </PanelShell>
        </SaveStatusProvider>
        <DashboardSupportWidget hideLauncher />
      </PanelThemeContext.Provider>
    </SupportChatProvider>
  );
}
