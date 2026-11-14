import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { requireTenantAccess } from "../apps/vase-labs/app/lib/tenant-route-guard";

const root = join(__dirname, "..");
const request = (cookie?: string) =>
  new Request("https://labs.vase.ar/api/v1/inbox/acme/conversations", cookie ? { headers: { cookie } } : undefined);

describe("Labs: las rutas por cuenta piden sesión de esa cuenta", () => {
  it("sin sesión responde 401", async () => {
    const result = await requireTenantAccess(request(), "acme", {
      resolveContext: async () => {
        throw new Error("LABS_SESSION_REQUIRED");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("con sesión de otra cuenta responde 403", async () => {
    const result = await requireTenantAccess(request("s=1"), "acme", {
      resolveContext: async () => ({ context: { tenantSlug: "otra", globalTenantId: "t_otra" } }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("con sesión de la cuenta deja pasar y devuelve su id", async () => {
    const result = await requireTenantAccess(request("s=1"), "acme", {
      resolveContext: async () => ({ context: { tenantSlug: "acme", globalTenantId: "t_acme" } }),
    });
    expect(result).toEqual({ ok: true, globalTenantId: "t_acme" });
  });

  it("todas las rutas con [tenantSlug] usan el control", () => {
    const routes = [
      "inbox/[tenantSlug]/conversations/route.ts",
      "inbox/[tenantSlug]/conversations/[conversationId]/route.ts",
      "inbox/[tenantSlug]/handoffs/[handoffId]/assign/route.ts",
      "inbox/[tenantSlug]/handoffs/[handoffId]/resolve/route.ts",
      "inbox/[tenantSlug]/events/route.ts",
      "analytics/[tenantSlug]/channels/route.ts",
      "analytics/[tenantSlug]/summary/route.ts",
      "billing/[tenantSlug]/usage/route.ts",
    ];
    for (const route of routes) {
      const source = readFileSync(join(root, "apps/vase-labs/app/api/v1", route), "utf8");
      expect(source, route).toContain("requireTenantAccess(request, tenantSlug)");
    }
  });

  it("la cola de soporte de app exige el token interno", () => {
    const source = readFileSync(join(root, "apps/vase-app/src/app/api/internal/support-queue/route.ts"), "utf8");
    expect(source).toContain("assertServiceToken(");
  });
});
