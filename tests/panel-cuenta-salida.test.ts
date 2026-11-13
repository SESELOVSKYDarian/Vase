import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8").replace(/\r\n/g, "\n");

describe("cuenta, salida y sistema de gestión entre app y Business", () => {
  it("cerrar sesión en Business cierra la sesión de Vase", () => {
    const auth = read("apps/vase-editor/web/src/utils/vaseAuth.js");
    expect(auth).toContain("/api/auth/central-logout");
    expect(auth).toContain("form.method = 'POST'");
    expect(read("apps/vase-editor/web/src/panel/PanelApp.jsx")).toContain("submitCentralLogout()");
    expect(read("apps/vase-app/src/app/api/auth/central-logout/route.ts")).toContain('"https://business.vase.ar"');
  });

  it("la cuenta muestra lo mismo en los dos paneles", () => {
    expect(read("apps/vase-editor/server/src/services/vaseBridge.js")).toContain("display_name: payload.displayName || null");
    expect(read("apps/vase-editor/web/src/panel/PanelApp.jsx")).toContain("user?.full_name || store.name");
    expect(read("apps/vase-app/src/components/layout/client-shell.tsx")).toContain("useTenantLogo()");
    expect(read("apps/vase-app/src/app/(platform)/app/layout.tsx")).toContain("TenantLogoProvider");
  });

  it("de dónde vienen los productos se elige en Mi negocio", () => {
    expect(read("apps/vase-app/src/app/(platform)/app/settings/page.tsx")).toContain("<ProductSourceCard");
    const action = read("apps/vase-app/src/app/(platform)/app/settings/product-source-actions.ts");
    expect(action).toContain("requireTenantRole(tenantRoles.OWNER)");
    expect(action).toContain('moduleId: "vase_management"');
    const business = read("apps/vase-editor/web/src/panel/screens/AjustesForms.jsx");
    expect(business).toContain("Cambiar en Mi negocio");
    expect(business).not.toContain("setIntegrationProvider");
  });
});
