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
    const inboxPage = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/inbox/page.tsx"),
      "utf8",
    );
    const integrationsPage = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/integrations/page.tsx"),
      "utf8",
    );
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

    expect(inboxPage).toContain('export const dynamic = "force-dynamic"');
    expect(integrationsPage).toContain('export const dynamic = "force-dynamic"');
    expect(inboxPage).not.toContain("{ default, dynamic }");
    expect(integrationsPage).not.toContain("{ default, dynamic }");
    expect(labsChannelsPage).toContain('redirect("/app/owner/labs/integrations")');
    expect(appChannelsPage).toContain('new URL("/app/owner/labs", productOrigins.labs).toString() as Route');
    expect(oauthCallback).toContain('new URL("/app/owner/labs", url.origin)');
  });

  it("keeps chart containers measurable during their first render", () => {
    const charts = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/labs-analytics-charts.tsx"),
      "utf8",
    );

    expect(charts).toContain("const chartInitialDimension = { width: 320, height: 256 }");
    expect(charts.match(/initialDimension=\{chartInitialDimension\}/g)).toHaveLength(3);
  });

  it("provides a valid setup entrypoint in the standalone Labs service", () => {
    const setupPath = path.resolve(
      "apps/vase-labs/app/app/owner/labs/setup/page.tsx",
    );

    expect(fs.existsSync(setupPath)).toBe(true);
    if (!fs.existsSync(setupPath)) return;

    const setup = fs.readFileSync(setupPath, "utf8");
    expect(setup).toContain("resolveLabsRequestContext");
    expect(setup).toContain('redirect("/app/owner/labs/chatbots")');
    expect(setup).toContain('redirect("/app/owner/labs/integrations")');
    expect(setup).toContain('redirect("/app/owner/labs/settings")');
  });

  it("registers an application icon instead of requesting a missing favicon", () => {
    const iconPath = path.resolve("apps/vase-labs/app/icon.svg");

    expect(fs.existsSync(iconPath)).toBe(true);
  });
});
