import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs standalone owner experience", () => {
  it("serves the owner Labs dashboard from the standalone Labs app", () => {
    const page = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/page.tsx"),
      "utf8",
    );
    const layout = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/layout.tsx"),
      "utf8",
    );
    const navigation = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx"),
      "utf8",
    );
    const styles = fs.readFileSync(
      path.resolve("apps/vase-labs/app/globals.css"),
      "utf8",
    );

    expect(page).toContain("resolveLabsRequestContext");
    expect(page).toContain("labsPrisma");
    expect(layout).toContain("labs-shell");
    expect(layout).toContain("labs-sidebar");
    expect(layout).toContain("Centro IA");
    expect(navigation).toContain("Gestion avanzada");
    expect(page).toContain('eyebrow="Operacion IA"');
    expect(page).toContain('title="Panel de control"');
    expect(page).toContain('title="Capacidad IA"');
    expect(page).toContain("getLabsPlanLimits");
    expect(page).toContain("calculateRemainingTokens");
    expect(page).toContain("canTenantUseChannel");
    expect(styles).toContain(".labs-shell");
    expect(styles).toContain(".labs-sidebar");
    expect(styles).toContain(".labs-panel");
    expect(styles).not.toContain(".labs-rail");
    expect(styles).not.toContain(".owner-labs-shell");
    expect(styles).not.toContain(".labs-owner-shell");
  });

  it("keeps old channel entrypoints pointed at the owner Labs dashboard", () => {
    const labsChannelsPage = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/channels/page.tsx"),
      "utf8",
    );
    const appChannelsPage = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/(platform)/app/channels/page.tsx"),
      "utf8",
    );
    const oauthCallback = fs.readFileSync(
      path.resolve("apps/vase-labs/app/api/v1/meta/oauth/callback/route.ts"),
      "utf8",
    );

    expect(labsChannelsPage).toContain('redirect("/app/owner/labs/integrations")');
    expect(appChannelsPage).toContain('new URL("/app/owner/labs", productOrigins.labs).toString() as Route');
    expect(oauthCallback).toContain('new URL("/app/owner/labs", url.origin)');
  });
});
