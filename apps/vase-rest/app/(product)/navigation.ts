import type { RestStaffRole } from "@vase/contracts";

export type NavigationItem = {
  key: string;
  label: string;
  href: string;
  roles: RestStaffRole[];
};

const navigation: NavigationItem[] = [
  { key: "home", label: "Inicio", href: "/staff", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "STOCK", "DELIVERY"] },
  { key: "salon", label: "Salón", href: "/waiter/salon", roles: ["MANAGER", "WAITER"] },
  { key: "orders", label: "Pedidos", href: "/waiter/orders", roles: ["MANAGER", "CASHIER", "WAITER"] },
  { key: "reservations", label: "Reservas", href: "/waiter/reservations", roles: ["MANAGER", "WAITER"] },
  { key: "kds", label: "Cocina", href: "/kitchen", roles: ["MANAGER", "KITCHEN"] },
  { key: "cash", label: "Caja", href: "/cash", roles: ["MANAGER", "CASHIER"] },
  { key: "inventory", label: "Inventario", href: "/stock", roles: ["MANAGER", "STOCK"] },
  { key: "delivery", label: "Delivery", href: "/delivery", roles: ["MANAGER", "DELIVERY"] },
  { key: "analytics", label: "Analítica", href: "/owner/analytics", roles: ["OWNER", "MANAGER"] },
  { key: "staff", label: "Equipo", href: "/owner/staff", roles: ["OWNER", "MANAGER"] },
  { key: "settings", label: "Configuración", href: "/owner/settings", roles: ["OWNER"] },
  { key: "support", label: "Soporte", href: "/support", roles: ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "STOCK", "DELIVERY"] },
];

export function navigationForRole(role: RestStaffRole) {
  return navigation.filter((item) => item.roles.includes(role)).map((item) =>
    role === "OWNER" && item.key === "home"
      ? { ...item, href: "/owner" }
      : item);
}
