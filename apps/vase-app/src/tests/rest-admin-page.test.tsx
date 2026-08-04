import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RestAdminWorkspace } from "@/components/admin/rest-admin-workspace";

describe("Rest Super Admin workspace", () => {
  it("renders real controls while isolating an operational outage", () => {
    const html = renderToStaticMarkup(
      <RestAdminWorkspace
        initialVersions={[]}
        initialContractTenants={[]}
        initialOperations={{ health: "unavailable", tenants: [], edges: [] }}
      />,
    );
    expect(html).toContain("Precios y capacidad");
    expect(html).toContain("Crear borrador");
    expect(html).toContain("Asignar Vase Rest");
    expect(html).toContain("Servicio Rest no disponible");
  });
});
