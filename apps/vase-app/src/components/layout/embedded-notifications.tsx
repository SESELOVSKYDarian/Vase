"use client";

import { useEffect } from "react";
import type { ShellNotification } from "@/server/services/labs-notifications";
import { NotificationsDrawer } from "@/components/layout/client-shell";

/**
 * Notificaciones adentro de Business, Labs y el resto de los productos. Le avisa al producto cuántas
 * hay sin leer (para el número de la campana) y cuándo cerrar el panel.
 */
export function EmbeddedNotifications({ notifications }: { notifications: ShellNotification[] }) {
  const unread = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ type: "vase-embed-unread", count: unread }, "*");
  }, [unread]);

  return (
    <NotificationsDrawer
      embedded
      notifications={notifications}
      onClose={() => {
        if (window.parent !== window) window.parent.postMessage({ type: "vase-embed-close" }, "*");
      }}
    />
  );
}
