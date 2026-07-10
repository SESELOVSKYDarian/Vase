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
    const styles = fs.readFileSync(
      path.resolve("apps/vase-labs/app/globals.css"),
      "utf8",
    );

    expect(page).toContain("resolveLabsRequestContext");
    expect(page).toContain("labsPrisma");
    expect(layout).toContain("labs-shell");
    expect(layout).toContain("labs-rail");
    expect(layout).toContain("brand-lockup");
    expect(page).toContain("Tu acceso a Labs, canales y tokens en una sola vista.");
    expect(page).toContain("hero-panel");
    expect(page).toContain("content-grid");
    expect(page).toContain("token-meter");
    expect(page).toContain("plans-grid");
    expect(page).toContain("getLabsPlanLimits");
    expect(page).toContain("calculateRemainingTokens");
    expect(page).toContain("canTenantUseChannel");
    expect(styles).toContain(".labs-shell");
    expect(styles).toContain(".labs-rail");
    expect(styles).toContain(".hero-panel");
    expect(styles).toContain(".content-grid");
    expect(styles).not.toContain(".labs-sidebar");
    expect(styles).not.toContain(".owner-labs-shell");
    expect(styles).not.toContain(".labs-owner-shell");
    expect(page).not.toContain('eyebrow="Operacion IA"');
    expect(page).not.toContain('title="Panel de control"');
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
