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

  it("de dónde sale cada cosa se elige en Mi negocio, una por una", () => {
    const content = read("apps/vase-app/src/app/(platform)/app/settings/settings-content.tsx");
    expect(content).toContain("<ConnectionsHub");
    expect(content).toContain("<ExternalConnection");
    const action = read("apps/vase-app/src/app/(platform)/app/settings/product-source-actions.ts");
    expect(action).toContain("requireTenantRole(tenantRoles.OWNER)");
    expect(action).toContain("prisma.tenantDataSource.upsert");
    const schema = read("apps/vase-app/prisma/schema.prisma");
    expect(schema).toContain("model TenantDataSource");
    const migration = read("apps/vase-app/prisma/migrations/20261113150000_tenant_data_sources/migration.sql");
    expect(migration).toContain("CREATE TABLE `TenantDataSource`");
    expect(migration).not.toMatch(/DROP|ALTER TABLE `Tenant`\s/);
    const business = read("apps/vase-editor/web/src/panel/screens/AjustesForms.jsx");
    expect(business).not.toContain("AjustesGestion");
    expect(read("apps/vase-editor/server/src/routes/integrations.js")).toContain("/internal/tenant/:tenantId/connection-status");
  });

  it("Ajustes de tu cuenta se ven adentro de Business y Labs", () => {
    expect(read("apps/vase-app/src/app/(platform)/app/embed/settings/page.tsx")).toContain("<SettingsBody");
    const config = read("apps/vase-app/next.config.ts");
    expect(config).toContain('source: "/app/embed/:path*"');
    expect(config).toContain("https://business.vase.ar");
    expect(read("apps/vase-editor/web/src/panel/sections.js")).toContain("id: 'negocio', label: 'Mi negocio'");
    expect(read("apps/vase-editor/web/src/panel/components/VaseSettingsFrame.jsx")).toContain("/app/embed/settings");
    expect(read("apps/vase-labs/app/app/owner/labs/settings/vase-settings-frame.tsx")).toContain("/app/embed/settings");
  });
});
