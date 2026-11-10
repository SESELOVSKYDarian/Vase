export type PanelSectionId =
  | "inicio"
  | "productos"
  | "business"
  | "dominios"
  | "pagos"
  | "trabajos"
  | "equipo"
  | "ajustes"
  | "ayuda"
  | "otra";

export function resolvePanelSection(pathname: string): PanelSectionId {
  if (pathname === "/app" || pathname === "/app/manager" || pathname === "/app/member") return "inicio";
  if (pathname.startsWith("/app/products")) return "productos";
  if (pathname === "/app/business") return "business";
  if (/^\/app\/owner\/pages\/[^/]+\/domains$/.test(pathname)) return "dominios";
  if (pathname.startsWith("/app/billing")) return "pagos";
  if (pathname.startsWith("/app/owner/customizations")) return "trabajos";
  if (pathname.startsWith("/app/team")) return "equipo";
  if (pathname.startsWith("/app/settings")) return "ajustes";
  if (pathname.startsWith("/app/help")) return "ayuda";
  return "otra";
}

export type PanelHelp = {
  title: string;
  intro: string;
  steps: string[];
};

/** Lo que explica el botón "?" en cada sección. */
export const PANEL_HELP: Record<PanelSectionId, PanelHelp> = {
  inicio: {
    title: "Cómo usar Inicio",
    intro: "Desde acá entrás a todo lo que tenés con Vase.",
    steps: [
      "Si hay algo urgente, como una factura por vencer, aparece arriba de todo.",
      "Tocá Entrar en un producto para abrirlo.",
      "Abajo tenés los accesos a tu cuenta.",
    ],
  },
  productos: {
    title: "Cómo usar Mis productos",
    intro: "Acá ves lo que tenés contratado y lo que podés sumar.",
    steps: [
      "Tocá Entrar para abrir un producto que ya tenés.",
      "Tocá Ver detalle para saber qué incluye y ver los planes.",
      "Si querés sumar uno, tocá Conocer y hablá con Vase.",
    ],
  },
  business: {
    title: "Cómo usar Vase Business",
    intro: "Acá están todas las webs que tenés con Vase.",
    steps: [
      "Tocá Editar para cambiar lo que se ve en tu web.",
      "En los tres puntos conectás tu dominio o eliminás la web.",
      "Tocá Nueva web para hacer otra, con plantilla o a medida.",
    ],
  },
  dominios: {
    title: "Cómo conectar tu dominio",
    intro: "Tu web puede tener una dirección propia, como tunegocio.com.ar.",
    steps: [
      "Tocá Agregar dominio y escribilo.",
      "Cargá los dos datos que te mostramos donde compraste el dominio.",
      "Esperá: el estado cambia a Conectado y seguro cuando esté listo.",
    ],
  },
  pagos: {
    title: "Cómo usar Plan y pagos",
    intro: "Acá ves cuánto pagás, cuándo vence y qué tenés contratado.",
    steps: [
      "Arriba está tu próximo pago. Tocá Pagar ahora y elegí con qué pagar.",
      "Después, cada producto con su plan y hasta cuándo está activo.",
      "Abajo está el historial de lo que pagaste.",
    ],
  },
  trabajos: {
    title: "Cómo usar Trabajos a medida",
    intro: "Acá seguís lo que le pediste a Vase.",
    steps: [
      "Con el botón de arriba cambiás entre Trabajos y Reuniones.",
      "Usá los filtros para encontrar un pedido por tipo o por fecha.",
      "Cada pedido muestra en qué etapa está y qué sigue.",
      "En Ver detalle aceptás o rechazás el presupuesto y pedís una reunión.",
    ],
  },
  equipo: {
    title: "Cómo usar Equipo",
    intro: "Acá decidís quién entra a tu cuenta y a qué.",
    steps: [
      "Tocá Invitar persona y escribí su correo. Le llega un enlace que dura 7 días.",
      "Elegí su rol. Tocá la i al lado de Rol para ver qué puede hacer cada uno.",
      "En Productos tildá a cuáles puede entrar.",
    ],
  },
  ajustes: {
    title: "Cómo usar Ajustes",
    intro: "Acá cambiás tus datos y los de tu negocio.",
    steps: [
      "En Mi perfil cambiás tu nombre y elegís modo claro u oscuro.",
      "En Mi negocio cargás logo, contacto, sucursales y datos fiscales: los usan todos tus productos.",
      "En Facturación guardás tus tarjetas y los datos de tus facturas.",
    ],
  },
  ayuda: {
    title: "Cómo usar Ayuda y soporte",
    intro: "Acá le escribís al equipo de Vase.",
    steps: [
      "Tocá Nueva consulta y contanos qué pasa.",
      "En Mis consultas ves el estado de cada una.",
      "En el manual tenés guías y videos.",
    ],
  },
  otra: {
    title: "Ayuda",
    intro: "En el manual de Vase tenés guías y videos de cada producto.",
    steps: [],
  },
};

export type NotificationFilterId = "todas" | "sinleer" | "pagos" | "productos" | "vase";

export const NOTIFICATION_FILTERS: Array<{ id: NotificationFilterId; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "sinleer", label: "Sin leer" },
  { id: "pagos", label: "Pagos" },
  { id: "productos", label: "Productos" },
  { id: "vase", label: "Vase" },
];

type FilterableNotification = {
  category: "platform" | "business" | "labs" | "billing";
  isRead?: boolean;
};

export function matchesNotificationFilter(
  notification: FilterableNotification,
  filter: NotificationFilterId,
) {
  switch (filter) {
    case "sinleer":
      return !notification.isRead;
    case "pagos":
      return notification.category === "billing";
    case "productos":
      return notification.category === "business" || notification.category === "labs";
    case "vase":
      return notification.category === "platform";
    default:
      return true;
  }
}

function pathOf(href: string) {
  try {
    return new URL(href, "https://app.vase.ar");
  } catch {
    return null;
  }
}

/** Texto del enlace de una notificación, según a dónde lleva. Null si no lleva a ningún lado. */
export function notificationDestinationLabel(href: string | null | undefined) {
  if (!href || href === "#") return null;
  const url = pathOf(href);
  if (!url) return null;
  const path = url.pathname;

  if (url.hostname.startsWith("labs.") || path.startsWith("/app/labs") || path.startsWith("/app/owner/labs")) {
    return "Abrir Vase Labs";
  }
  if (url.hostname.startsWith("business.") || path.startsWith("/app/business")) return "Abrir Vase Business";
  if (path.startsWith("/app/billing")) return "Ir a Plan y pagos";
  if (path.startsWith("/app/owner/customizations")) return "Ir a Trabajos a medida";
  if (path.startsWith("/app/help") || path.startsWith("/app/support")) return "Ir a Ayuda y soporte";
  if (path.startsWith("/app/settings")) return "Ir a Ajustes";
  return "Abrir";
}

export const DISMISSED_NOTIFICATION_PREFIX = "dismissed:";
export const DISMISSED_NOTIFICATION_SOURCE = "dismissed";

export function buildDismissedNotificationKey(readKey: string) {
  return `${DISMISSED_NOTIFICATION_PREFIX}${readKey}`;
}
