// Admin nuevo: 7 secciones en el menú. Las pantallas que antes eran secciones sueltas ahora son pestañas adentro.
// Las rutas son las internas (/app/admin/...); en admin.vase.ar se muestran sin el prefijo.

export type AdminTab = { href: string; label: string };
export type AdminSection = {
  id: "inicio" | "clientes" | "proyectos" | "productos" | "finanzas" | "ajustes";
  label: string;
  group: "Principal" | "Trabajo" | "Negocio" | "Sistema";
  tabs: AdminTab[];
};

// Los tickets se trabajan en workspace.vase.ar (botón arriba). Lo que era Soporte (IA, respuestas, wiki) está en Ajustes.
export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "inicio", label: "Inicio", group: "Principal", tabs: [{ href: "/app/admin", label: "Resumen del día" }] },
  { id: "clientes", label: "Clientes", group: "Principal", tabs: [{ href: "/app/admin/clients", label: "Clientes" }] },
  {
    id: "proyectos",
    label: "Proyectos",
    group: "Trabajo",
    tabs: [
      { href: "/app/admin/customizations", label: "Pedidos" },
      { href: "/app/admin/development", label: "Trabajos" },
      { href: "/app/admin/meetings", label: "Agenda" },
    ],
  },
  { id: "productos", label: "Productos", group: "Negocio", tabs: [{ href: "/app/admin/modules", label: "Productos" }] },
  {
    id: "finanzas",
    label: "Finanzas",
    group: "Negocio",
    tabs: [
      { href: "/app/admin/finance", label: "Cobros" },
      { href: "/app/admin/expenses", label: "Gastos" },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    group: "Sistema",
    tabs: [
      { href: "/app/admin/settings/account", label: "Tu cuenta" },
      { href: "/app/admin/support", label: "Conocimiento de la IA" },
      { href: "/app/admin/faqs", label: "Respuestas guardadas" },
      { href: "/app/admin/wiki", label: "Ayuda y wiki" },
      { href: "/app/admin/audit", label: "Registro de cambios" },
    ],
  },
];

/** La sección y la pestaña de una ruta interna del Admin. La pestaña más específica gana. */
export function resolveAdminSection(internalPath: string) {
  const path = internalPath.replace(/\/+$/, "") || "/app/admin";
  let best: { section: AdminSection; tab: AdminTab } | null = null;
  for (const section of ADMIN_SECTIONS) {
    for (const tab of section.tabs) {
      const matches = tab.href === "/app/admin" ? path === "/app/admin" : path === tab.href || path.startsWith(`${tab.href}/`);
      if (matches && (!best || tab.href.length > best.tab.href.length)) best = { section, tab };
    }
  }
  return best ?? { section: ADMIN_SECTIONS[0], tab: ADMIN_SECTIONS[0].tabs[0] };
}
