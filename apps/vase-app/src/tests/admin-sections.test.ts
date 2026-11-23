import { describe, expect, it } from "vitest";
import { ADMIN_SECTIONS, resolveAdminSection } from "@/lib/navigation/admin-sections";

describe("Admin nuevo: 7 secciones", () => {
  it("tiene las 7 secciones del mapa aprobado", () => {
    expect(ADMIN_SECTIONS.map((section) => section.label)).toEqual(["Inicio", "Clientes", "Soporte", "Proyectos", "Productos", "Finanzas", "Ajustes"]);
  });

  it("cada pantalla vieja queda como pestaña de una sección", () => {
    const tabs = ADMIN_SECTIONS.flatMap((section) => section.tabs.map((tab) => tab.href));
    for (const old of ["users", "tickets", "support", "faqs", "wiki", "customizations", "development", "meetings", "modules", "labs", "management", "rest", "finance", "expenses", "settings", "audit"]) {
      expect(tabs).toContain(`/app/admin/${old}`);
    }
  });

  it("ubica cada ruta en su sección y pestaña", () => {
    expect(resolveAdminSection("/app/admin").section.id).toBe("inicio");
    expect(resolveAdminSection("/app/admin/clients/abc123").tab.label).toBe("Clientes");
    expect(resolveAdminSection("/app/admin/users").section.id).toBe("clientes");
    expect(resolveAdminSection("/app/admin/expenses").section.id).toBe("finanzas");
    expect(resolveAdminSection("/app/admin/audit/").tab.label).toBe("Registro de cambios");
    expect(resolveAdminSection("/app/admin/no-existe").section.id).toBe("inicio");
  });
});
