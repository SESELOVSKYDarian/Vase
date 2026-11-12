import type { RestStaffRole } from "@vase/contracts";

// Estructura del panel de Vase Rest: grupos del menú, ícono, título y subtítulo de cada sección.
// Igual que el panel nuevo de Vase Business: Principal → operación → gestión → Cuenta.

export type NavigationGroup = "Principal" | "Servicio" | "Gestión" | "Cuenta";

export type NavigationIcon =
  | "home" | "chart" | "salon" | "orders" | "calendar" | "kitchen" | "delivery"
  | "cash" | "catalog" | "promo" | "inventory" | "team" | "settings" | "support";

export type NavigationChild = { key: string; label: string; href: string; subtitle: string };

export type NavigationItem = {
  key: string;
  label: string;
  href: string;
  roles: RestStaffRole[];
  group: NavigationGroup;
  icon: NavigationIcon;
  subtitle: string;
  children?: NavigationChild[];
};

const ALL: RestStaffRole[] = ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "STOCK", "DELIVERY"];

export const NAVIGATION_GROUPS: NavigationGroup[] = ["Principal", "Servicio", "Gestión", "Cuenta"];

const navigation: NavigationItem[] = [
  { key: "home", label: "Inicio", href: "/staff", roles: ALL, group: "Principal", icon: "home", subtitle: "Lo que pasa hoy en tu sucursal" },
  { key: "analytics", label: "Analítica", href: "/owner/analytics", roles: ["OWNER", "MANAGER"], group: "Principal", icon: "chart", subtitle: "Ventas, facturación y estado por sucursal" },
  { key: "salon", label: "Salón", href: "/waiter/salon", roles: ["MANAGER", "WAITER"], group: "Servicio", icon: "salon", subtitle: "Mesas en vivo: abrir, unir y liberar" },
  { key: "orders", label: "Pedidos", href: "/waiter/orders", roles: ["MANAGER", "CASHIER", "WAITER"], group: "Servicio", icon: "orders", subtitle: "Comandas abiertas de la sucursal" },
  { key: "reservations", label: "Reservas", href: "/waiter/reservations", roles: ["MANAGER", "WAITER"], group: "Servicio", icon: "calendar", subtitle: "Agenda del día y llegadas" },
  { key: "kds", label: "Cocina", href: "/kitchen", roles: ["MANAGER", "KITCHEN"], group: "Servicio", icon: "kitchen", subtitle: "Lo que hay que preparar, en orden" },
  { key: "delivery", label: "Delivery", href: "/delivery", roles: ["MANAGER", "DELIVERY"], group: "Servicio", icon: "delivery", subtitle: "Pedidos de apps y envíos propios" },
  {
    key: "cash", label: "Caja", href: "/cash", roles: ["MANAGER", "CASHIER"], group: "Servicio", icon: "cash", subtitle: "Turno, cobros y comprobantes",
    children: [
      { key: "cash-shift", label: "Turno de caja", href: "/cash", subtitle: "Turno, cobros y comprobantes" },
      { key: "cash-accounts", label: "Cuentas corrientes", href: "/cash/accounts", subtitle: "Clientes que pagan después" },
      { key: "cash-reconciliation", label: "Conciliación", href: "/cash/reconciliation", subtitle: "Diferencias entre la sucursal y la nube" },
    ],
  },
  { key: "catalog", label: "Catálogo", href: "/owner/catalog", roles: ["OWNER"], group: "Gestión", icon: "catalog", subtitle: "Productos, recetas y precios" },
  { key: "promotions", label: "Promociones", href: "/owner/promotions", roles: ["OWNER"], group: "Gestión", icon: "promo", subtitle: "Descuentos por día, producto o medio de pago" },
  { key: "inventory", label: "Inventario", href: "/stock", roles: ["MANAGER", "STOCK"], group: "Gestión", icon: "inventory", subtitle: "Stock de la sucursal y cupos sin conexión" },
  { key: "owner-inventory", label: "Inventario", href: "/owner/inventory", roles: ["OWNER"], group: "Gestión", icon: "inventory", subtitle: "Depósitos, movimientos y cupos sin conexión" },
  { key: "staff", label: "Equipo", href: "/owner/staff", roles: ["OWNER", "MANAGER"], group: "Gestión", icon: "team", subtitle: "Quién trabaja, en qué sucursal y con qué permisos" },
  {
    key: "settings", label: "Configuración", href: "/owner/settings", roles: ["OWNER"], group: "Cuenta", icon: "settings", subtitle: "Lo que se configura una vez",
    children: [
      { key: "settings-salon", label: "Salón y cocina", href: "/owner/settings/salon", subtitle: "Pisos, mesas y estaciones de cocina" },
      { key: "settings-devices", label: "Dispositivos y Edge", href: "/owner/settings/devices", subtitle: "Equipos de la sucursal y servidor local" },
      { key: "settings-printers", label: "Impresoras", href: "/owner/settings/printers", subtitle: "Comanderas y tickets" },
      { key: "settings-payments", label: "Pagos", href: "/owner/settings/payments", subtitle: "Mercado Pago Point y QR" },
      { key: "settings-fiscal", label: "Facturación", href: "/owner/settings/fiscal", subtitle: "ARCA, certificados y puntos de venta" },
      { key: "settings-delivery", label: "Delivery", href: "/owner/settings/delivery", subtitle: "Apps de delivery conectadas" },
      { key: "settings-scopes", label: "Sucursales", href: "/owner/settings/scopes", subtitle: "Qué se comparte entre sucursales" },
    ],
  },
  { key: "support", label: "Ayuda y soporte", href: "/support", roles: ALL, group: "Cuenta", icon: "support", subtitle: "Escribinos y te ayudamos" },
];

export function navigationForRole(role: RestStaffRole) {
  return navigation.filter((item) => item.roles.includes(role)).map((item) =>
    role === "OWNER" && item.key === "home"
      ? { ...item, href: "/owner", subtitle: "Así está tu negocio hoy" }
      : item);
}

// Sección (y subsección) que corresponde a una ruta: gana el href más largo que la contiene.
export function activeNavigation(items: NavigationItem[], pathname: string) {
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  let section: NavigationItem | null = null;
  let child: NavigationChild | null = null;
  let best = -1;
  for (const item of items) {
    if (matches(item.href) && item.href.length > best) {
      section = item;
      child = null;
      best = item.href.length;
    }
    for (const sub of item.children ?? []) {
      if (matches(sub.href) && sub.href.length >= best) {
        section = item;
        child = sub;
        best = sub.href.length;
      }
    }
  }
  return { section, child };
}
