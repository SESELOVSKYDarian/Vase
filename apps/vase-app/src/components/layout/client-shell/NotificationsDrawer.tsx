"use client";

// Parte de client-shell.tsx: PanelTheme, PanelThemeContext, usePanelTheme, ClientShellProps, NAV_PRINCIPAL, NAV_CUENTA y más.
import { useRouter } from "next/navigation";
import { createContext, type PropsWithChildren, useContext, useState, useTransition } from "react";
import { Check, ClipboardCheck, CreditCard, Home, LayoutGrid, Package, ShoppingBag, Store, UserRound, Users, X } from "lucide-react";
import { dismissNotificationsAction, markAllNotificationsAsReadAction } from "@/app/(platform)/app/notifications-actions";
import { NavLink } from "@/components/layout/nav-link";
import { NOTIFICATION_FILTERS, matchesNotificationFilter, notificationDestinationLabel, type NotificationFilterId } from "@/lib/navigation/panel-sections";
import { type ShellNotification } from "@/server/services/labs-notifications";

export type PanelTheme = "light" | "dark";

export const PanelThemeContext = createContext<{ theme: PanelTheme; setTheme: (theme: PanelTheme) => void }>({
  theme: "light",
  setTheme: () => {},
});

export function usePanelTheme() {
  return useContext(PanelThemeContext);
}

export type ClientShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  tenantLabel?: string;
  notifications?: ShellNotification[];
  currentUserName?: string;
  viewerRole?: "OWNER" | "MANAGER" | "MEMBER";
}>;

export const NAV_PRINCIPAL = [
  { id: "inicio", href: "/app", label: "Inicio", icon: Home },
  { id: "productos", href: "/app/products", label: "Mis productos", icon: LayoutGrid },
  { id: "negocio", href: "/app/negocio", label: "Mi negocio", icon: Store },
] as const;

// Lo que comparten tus productos. Solo aparece si la cuenta tiene más de un producto.
export const NAV_COMPARTIDO = [
  { id: "catalogo", href: "/app/catalogo", label: "Catálogo", icon: Package },
  { id: "clientes", href: "/app/clientes", label: "Clientes", icon: UserRound },
  { id: "pedidos", href: "/app/pedidos", label: "Pedidos", icon: ShoppingBag },
] as const;

export const NAV_CUENTA = [
  { id: "pagos", href: "/app/billing", label: "Plan y pagos", icon: CreditCard, minRole: "OWNER" },
  { id: "trabajos", href: "/app/owner/customizations", label: "Trabajos a medida", icon: ClipboardCheck, minRole: "MANAGER" },
  { id: "equipo", href: "/app/team", label: "Equipo", icon: Users, minRole: "OWNER" },
] as const;

export const ROLE_WEIGHT = { OWNER: 3, MANAGER: 2, MEMBER: 1 } as const;

export function relativeDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(value));
}

export function selectionPayload(items: ShellNotification[]) {
  return {
    platformUpdateIds: items.filter((n) => n.notificationType === "platform_update").map((n) => n.id),
    adminNotificationIds: items.filter((n) => n.notificationType === "admin_notification").map((n) => n.id),
    systemNotifications: items
      .filter((n) => n.notificationType === "system_hint" || n.notificationType === "labs_system")
      .map((n) => ({ id: n.id, notificationType: n.notificationType as "system_hint" | "labs_system" })),
  };
}

export function CheckMark() {
  return <Check size={12} strokeWidth={3.5} aria-hidden="true" />;
}

/**
 * Notificaciones de tu cuenta de Vase. Son las mismas en app, Business, Labs y el resto: los productos
 * muestran esta misma pantalla adentro (embedded), en /app/embed/notifications.
 */
export function NotificationsDrawer({
  notifications,
  onClose,
  embedded = false,
}: {
  notifications: ShellNotification[];
  onClose: () => void;
  /** Adentro de otro producto: sin fondo oscuro y los links abren la ventana entera. */
  embedded?: boolean;
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

  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");
  const absolute = (href: string) => (/^https?:\/\//.test(href) ? href : `${appOrigin}${href.startsWith("/") ? "" : "/"}${href}`);

  return (
    <div className={embedded ? "vpa-ov embedded" : "vpa-ov"} onClick={onClose}>
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
                {destination && notification.href && embedded ? (
                  <a
                    href={absolute(notification.href)}
                    target="_top"
                    className={className}
                    onClick={() => {
                      if (!notification.isRead) void markAllNotificationsAsReadAction(selectionPayload([notification]));
                    }}
                  >
                    {body}
                  </a>
                ) : destination && notification.href ? (
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
