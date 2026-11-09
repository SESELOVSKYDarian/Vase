"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type PropsWithChildren,
} from "react";
import { Bell, Check, CircleHelp, ClipboardCheck, CreditCard, Home, LayoutGrid, Users, X } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import {
  dismissNotificationsAction,
  markAllNotificationsAsReadAction,
} from "@/app/(platform)/app/notifications-actions";
import { NavLink } from "@/components/layout/nav-link";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { SupportChatProvider } from "@/components/support/support-chat-context";
import {
  NOTIFICATION_FILTERS,
  PANEL_HELP,
  matchesNotificationFilter,
  notificationDestinationLabel,
  resolvePanelSection,
  type NotificationFilterId,
} from "@/lib/navigation/panel-sections";
import type { ShellNotification } from "@/server/services/labs-notifications";
import "@/components/panel/panel.css";

type PanelTheme = "light" | "dark";

const PanelThemeContext = createContext<{ theme: PanelTheme; setTheme: (theme: PanelTheme) => void }>({
  theme: "light",
  setTheme: () => {},
});

export function usePanelTheme() {
  return useContext(PanelThemeContext);
}

type ClientShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  tenantLabel?: string;
  notifications?: ShellNotification[];
  currentUserName?: string;
  viewerRole?: "OWNER" | "MANAGER" | "MEMBER";
}>;

const NAV_PRINCIPAL = [
  { id: "inicio", href: "/app", label: "Inicio", icon: Home },
  { id: "productos", href: "/app/products", label: "Mis productos", icon: LayoutGrid },
] as const;

const NAV_CUENTA = [
  { id: "pagos", href: "/app/billing", label: "Plan y pagos", icon: CreditCard, minRole: "OWNER" },
  { id: "trabajos", href: "/app/owner/customizations", label: "Trabajos a medida", icon: ClipboardCheck, minRole: "MANAGER" },
  { id: "equipo", href: "/app/team", label: "Equipo", icon: Users, minRole: "OWNER" },
] as const;

const ROLE_WEIGHT = { OWNER: 3, MANAGER: 2, MEMBER: 1 } as const;

function relativeDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

function selectionPayload(items: ShellNotification[]) {
  return {
    platformUpdateIds: items.filter((n) => n.notificationType === "platform_update").map((n) => n.id),
    adminNotificationIds: items.filter((n) => n.notificationType === "admin_notification").map((n) => n.id),
    systemNotifications: items
      .filter((n) => n.notificationType === "system_hint" || n.notificationType === "labs_system")
      .map((n) => ({ id: n.id, notificationType: n.notificationType as "system_hint" | "labs_system" })),
  };
}

function CheckMark() {
  return <Check size={12} strokeWidth={3.5} aria-hidden="true" />;
}

function NotificationsDrawer({
  notifications,
  onClose,
}: {
  notifications: ShellNotification[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilterId>("todas");
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const shown = notifications.filter((notification) => matchesNotificationFilter(notification, filter));
  const shownSelected = shown.filter((notification) => selected.includes(notification.id));
  const allSelected = shown.length > 0 && shownSelected.length === shown.length;
  const unread = notifications.filter((notification) => !notification.isRead).length;

  const run = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      await action();
      setSelected([]);
      router.refresh();
    });
  };

  return (
    <div className="vpa-ov" onClick={onClose}>
      <div className="vpa-dr" role="dialog" aria-label="Notificaciones" onClick={(event) => event.stopPropagation()}>
        <div className="vpa-mh">
          <div>
            <h3>Notificaciones</h3>
            <p>{unread === 0 ? "Estás al día" : unread === 1 ? "1 sin leer" : `${unread} sin leer`}</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="vpa-nthead">
          <div className="vpa-chips">
            {NOTIFICATION_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? "vpa-chip on" : "vpa-chip"}
                aria-pressed={filter === item.id}
                onClick={() => {
                  setFilter(item.id);
                  setSelected([]);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="vpa-nbar">
            <button
              type="button"
              className="vpa-nall"
              role="checkbox"
              aria-checked={allSelected}
              onClick={() => setSelected(allSelected ? [] : shown.map((notification) => notification.id))}
            >
              <span className={allSelected ? "vpa-cbx on" : "vpa-cbx"} aria-hidden="true">
                <CheckMark />
              </span>
              {shownSelected.length === 0
                ? "Seleccionar todas"
                : shownSelected.length === 1
                  ? "1 seleccionada"
                  : `${shownSelected.length} seleccionadas`}
            </button>
            <div className="vpa-sp" />
            {shownSelected.length > 0 ? (
              <>
                <button
                  type="button"
                  className="vpa-btn line sm"
                  disabled={isPending}
                  onClick={() => run(() => markAllNotificationsAsReadAction(selectionPayload(shownSelected)))}
                >
                  Marcar como leídas
                </button>
                <button
                  type="button"
                  className="vpa-btn soft sm danger"
                  disabled={isPending}
                  onClick={() =>
                    run(() =>
                      dismissNotificationsAction(
                        shownSelected.map((n) => ({ id: n.id, notificationType: n.notificationType })),
                      ),
                    )
                  }
                >
                  Borrar
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="vpa-nlist">
          {shown.length === 0 ? <div className="vpa-empty" style={{ marginTop: 14 }}>No hay notificaciones acá.</div> : null}
          {shown.map((notification) => {
            const isSelected = selected.includes(notification.id);
            const destination = notificationDestinationLabel(notification.href);
            const body = (
              <>
                <span className="vpa-g1">
                  <b>{notification.title}</b>
                  <span>
                    {notification.sourceLabel} · {relativeDate(notification.createdAt)}
                  </span>
                  {destination ? <span className="vpa-ndest">{destination}</span> : null}
                </span>
                {!notification.isRead ? <span className="vpa-udot" aria-label="Sin leer" /> : null}
              </>
            );
            const className = notification.isRead ? "vpa-nrow" : "vpa-nrow unread";

            return (
              <div className="vpa-nit" key={`${notification.notificationType}:${notification.id}`}>
                <button
                  type="button"
                  className={isSelected ? "vpa-cbx on" : "vpa-cbx"}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Seleccionar: ${notification.title}`}
                  onClick={() =>
                    setSelected(
                      isSelected ? selected.filter((id) => id !== notification.id) : [...selected, notification.id],
                    )
                  }
                >
                  <CheckMark />
                </button>
                {destination && notification.href ? (
                  <NavLink
                    href={notification.href}
                    className={className}
                    onClick={() => {
                      if (!notification.isRead) void markAllNotificationsAsReadAction(selectionPayload([notification]));
                      onClose();
                    }}
                  >
                    {body}
                  </NavLink>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionHelpDrawer({ pathname, onClose }: { pathname: string; onClose: () => void }) {
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawer, setDrawer] = useState<"notas" | "ayuda" | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("vase-panel-theme", theme);
  }, [theme]);

  const unread = notifications.filter((notification) => !notification.isRead).length;
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
  const accountName = tenantLabel?.trim() || "Tu cuenta";
  const navClass = (id: string) => (section === id || (id === "productos" && (section === "business" || section === "dominios")) ? "vpa-nb on" : "vpa-nb");
  const accountNav = NAV_CUENTA.filter((item) => ROLE_WEIGHT[viewerRole] >= ROLE_WEIGHT[item.minRole]);

  return (
    <SupportChatProvider>
      <PanelThemeContext.Provider value={themeValue}>
        <div className="vpa">
          <aside className="vpa-side" aria-label="Menú">
            <div className="vpa-logo">
              <Image src="/vasecolorlogo.png" alt="Vase" width={26} height={26} />
              <b>vase</b>
            </div>
            <nav className="vpa-nav">
              <div className="vpa-grp">Principal</div>
              {NAV_PRINCIPAL.filter(({ id }) => id === "inicio" || viewerRole === "OWNER").map(({ id, href, label, icon: Icon }) => (
                <NavLink key={id} href={href} className={navClass(id)}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
              {accountNav.length > 0 ? <div className="vpa-grp">Cuenta</div> : null}
              {accountNav.map(({ id, href, label, icon: Icon }) => (
                <NavLink key={id} href={href} className={navClass(id)}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="vpa-acc">
              {accountOpen ? (
                <div className="vpa-menu" role="menu">
                  <NavLink href="/app/settings" className="vpa-am" onClick={() => setAccountOpen(false)}>
                    Ajustes
                  </NavLink>
                  <NavLink href="/app/help" className="vpa-am" onClick={() => setAccountOpen(false)}>
                    Ayuda y soporte
                  </NavLink>
                  <button
                    type="button"
                    className="vpa-am out"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      setConfirmSignOut(true);
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="vpa-accbtn"
                aria-label="Tu cuenta"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <i aria-hidden="true">{accountName.slice(0, 1).toUpperCase()}</i>
                <span className="vpa-ut">
                  <b>{accountName}</b>
                  <span>{currentUserName}</span>
                </span>
              </button>
            </div>
          </aside>

          <div className="vpa-main">
            <header className="vpa-top">
              <div>
                <h1 className="vpa-ttl">{title}</h1>
                <div className="vpa-sub">{subtitle}</div>
              </div>
              <div className="vpa-sp" />
              <button type="button" className="vpa-ib" aria-label="Notificaciones" onClick={() => setDrawer("notas")}>
                <Bell size={18} aria-hidden="true" />
                {unread > 0 ? <span className="n">{unread}</span> : null}
              </button>
              <button
                type="button"
                className="vpa-ib"
                aria-label="Cómo usar esta sección"
                onClick={() => setDrawer("ayuda")}
              >
                <CircleHelp size={18} aria-hidden="true" />
              </button>
            </header>
            <main className="vpa-body" id="main-content">
              <div className="vpa-wrap">{children}</div>
            </main>
          </div>

          {drawer === "notas" ? (
            <NotificationsDrawer notifications={notifications} onClose={() => setDrawer(null)} />
          ) : null}
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
        </div>
        <DashboardSupportWidget hideLauncher />
      </PanelThemeContext.Provider>
    </SupportChatProvider>
  );
}
