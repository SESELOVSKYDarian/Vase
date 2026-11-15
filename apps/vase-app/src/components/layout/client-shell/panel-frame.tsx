"use client";

// Marco fijo del panel. Vive en el layout, así que el menú lateral y la barra de arriba se dibujan una sola
// vez y quedan quietos mientras cambiás de sección. Cada página le avisa su título y sus datos.
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { resolvePanelSection } from "@/lib/navigation/panel-sections";
import { PanelChrome } from "./ClientShell";
import type { ClientShellProps } from "./NotificationsDrawer";

/** Lo que una página le pasa al marco: título, subtítulo, cuenta y notificaciones. */
type PageMeta = Omit<ClientShellProps, "children">;

/** Datos de la cuenta que el servidor ya conoce al abrir el panel, para dibujar el marco sin esperar a la página. */
export type PanelFrameAccount = Pick<ClientShellProps, "tenantLabel" | "currentUserName" | "viewerRole">;

type FrameApi = { register: (id: string, meta: PageMeta) => void; unregister: (id: string) => void };

const FrameContext = createContext<FrameApi | null>(null);

/** Devuelve el marco del layout, o null si la página se está mostrando sin él. */
export function usePanelFrame() {
  return useContext(FrameContext);
}

// Título que se muestra un instante al abrir el panel de cero, hasta que la página avisa el suyo.
const FALLBACK_TITLES: Record<string, string> = {
  productos: "Mis productos",
  business: "Mis productos",
  pagos: "Plan y pagos",
  trabajos: "Trabajos a medida",
  equipo: "Equipo",
  ajustes: "Ajustes",
  ayuda: "Ayuda y soporte",
};

// Rutas de /app que no llevan el marco del cliente: administración, páginas embebidas en otros productos,
// el editor y las que solo redirigen. Sirve para decidir bien el primer dibujo, antes de que la página avise.
function looksLikeClientPanel(pathname: string) {
  if (!pathname.startsWith("/app")) return false;
  if (/^\/app\/(admin|embed|channels|management|labs)(\/|$)/.test(pathname)) return false;
  if (pathname === "/app/owner" || pathname.endsWith("/editor")) return false;
  return true;
}

// useLayoutEffect solo existe en el navegador; en el servidor no hace falta avisar nada.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Dice si el navegador ya tomó el control de la página (falso en el servidor y en el primer dibujo).
const noSubscription = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}

export function PanelFrame({ account, children }: { account: PanelFrameAccount | null; children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const [meta, setMeta] = useState<PageMeta | null>(null);
  // Después del primer dibujo, manda lo que diga la página: si ninguna avisó, no hay marco.
  const ready = useHydrated();
  const owner = useRef<string | null>(null);

  const register = useCallback((id: string, next: PageMeta) => {
    owner.current = id;
    setMeta(next);
  }, []);
  // Solo borra los datos la página que los puso, por si otra ya avisó los suyos.
  const unregister = useCallback((id: string) => {
    if (owner.current !== id) return;
    owner.current = null;
    setMeta(null);
  }, []);
  const api = useMemo(() => ({ register, unregister }), [register, unregister]);

  const framed = meta !== null || (!ready && account !== null && looksLikeClientPanel(pathname));
  const shown: PageMeta = meta ?? {
    title: FALLBACK_TITLES[resolvePanelSection(pathname)] ?? "",
    subtitle: "",
    ...(account ?? {}),
  };

  return (
    <FrameContext.Provider value={api}>
      <PanelChrome {...shown} bare={!framed}>
        {children}
      </PanelChrome>
    </FrameContext.Provider>
  );
}

/** La página, cuando ya hay marco: avisa sus datos y muestra solo su contenido. */
export function RegisteredPanelPage({ children, ...meta }: ClientShellProps) {
  const frame = usePanelFrame();
  const id = useId();
  const { title, subtitle, tenantLabel, notifications, currentUserName, viewerRole } = meta;

  // Antes de pintar: así el título cambia junto con el contenido, sin un parpadeo intermedio.
  useBrowserLayoutEffect(() => {
    frame?.register(id, { title, subtitle, tenantLabel, notifications, currentUserName, viewerRole });
  }, [frame, id, title, subtitle, tenantLabel, notifications, currentUserName, viewerRole]);

  useBrowserLayoutEffect(() => {
    return () => frame?.unregister(id);
  }, [frame, id]);

  return <>{children}</>;
}
