import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs standalone owner experience", () => {
  it("serves the authenticated 05c3cb8 owner dashboard from the standalone Labs app", () => {
    const root = fs.readFileSync(
      path.resolve("apps/vase-labs/app/page.tsx"),
      "utf8",
    );
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
    const nav = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx"),
      "utf8",
    );

    expect(root).toContain('redirect("/app/owner/labs")');
    expect(root).not.toContain("tenant_demo");
    expect(page).toContain("resolveLabsRequestContext");
    expect(page).toContain("labsPrisma");
    expect(layout).toContain("labs-shell");
    expect(layout).toContain("labs-sidebar");
    expect(layout).toContain("LabsOwnerMobileNav");
    expect(page).toContain('eyebrow="Operacion IA"');
    expect(page).toContain('title="Panel de control"');
    expect(page).toContain("LabsMetricCard");
    expect(page).toContain("LabsConversationTrendChart");
    expect(page).toContain("LabsIntentDistributionChart");
    for (const destination of ["inbox", "activity", "chatbots", "integrations", "settings"]) {
      expect(nav).toContain(`/app/owner/labs/${destination}`);
    }
    expect(styles).toContain(".labs-shell");
    expect(styles).toContain(".labs-sidebar");
    expect(styles).toContain(".labs-panel");
    expect(styles).not.toContain(".labs-rail");
    expect(page).not.toContain("Tu acceso a Labs, canales y tokens en una sola vista.");
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
