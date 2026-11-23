import { describe, expect, it } from "vitest";
import { ADMIN_SECTIONS, resolveAdminSection } from "@/lib/navigation/admin-sections";

describe("Admin nuevo: 6 secciones", () => {
  it("tiene las secciones del mapa aprobado (Soporte vive en workspace.vase.ar)", () => {
    expect(ADMIN_SECTIONS.map((section) => section.label)).toEqual(["Inicio", "Clientes", "Proyectos", "Productos", "Finanzas", "Ajustes"]);
  });

  it("las pantallas que quedan son pestañas de una sección", () => {
    const tabs = ADMIN_SECTIONS.flatMap((section) => section.tabs.map((tab) => tab.href));
    for (const page of ["clients", "support", "faqs", "wiki", "customizations", "development", "meetings", "modules", "finance", "expenses", "settings/account", "audit"]) {
      expect(tabs).toContain(`/app/admin/${page}`);
    }
    for (const gone of ["users", "labs", "management", "rest", "settings", "tickets"]) {
      expect(tabs).not.toContain(`/app/admin/${gone}`);
    }
  });

  it("ubica cada ruta en su sección y pestaña", () => {
    expect(resolveAdminSection("/app/admin").section.id).toBe("inicio");
    expect(resolveAdminSection("/app/admin/clients/abc123").tab.label).toBe("Clientes");
    expect(resolveAdminSection("/app/admin/modules/labs").section.id).toBe("productos");
    expect(resolveAdminSection("/app/admin/expenses").section.id).toBe("finanzas");
    expect(resolveAdminSection("/app/admin/audit/").tab.label).toBe("Registro de cambios");
    expect(resolveAdminSection("/app/admin/settings/account").tab.label).toBe("Tu cuenta");
    expect(resolveAdminSection("/app/admin/no-existe").section.id).toBe("inicio");
  });
});
