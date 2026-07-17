import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs standalone owner experience", () => {
  it("offers the guided five-source knowledge flow without leaking credentials", () => {
    const page = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/page.tsx"), "utf8");
    const modalPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx");
    const groupsPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx");

    expect(fs.existsSync(modalPath)).toBe(true);
    expect(fs.existsSync(groupsPath)).toBe(true);
    if (!fs.existsSync(modalPath) || !fs.existsSync(groupsPath)) return;

    const modal = fs.readFileSync(modalPath, "utf8");
    const groups = fs.readFileSync(groupsPath, "utf8");
    expect(page).toContain("data.items.length === 0");
    const emptyBranch = page.split("data.items.length === 0 ? (")[1]?.split(") : (")[0] ?? "";
    expect(emptyBranch).toContain("Todavía no agregaste conocimiento");
    expect(emptyBranch).toContain("<KnowledgeAddModal />");
    expect(emptyBranch).not.toContain("fuentes cargadas");
    expect(emptyBranch).not.toContain("KnowledgeGroups");
    expect(emptyBranch).not.toContain("LabsSection");
    expect(modal).toContain("Agregar conocimiento");
    expect(page).toContain("groupKnowledgeItems(data.items)");
    expect(page).toContain("<KnowledgeGroups");
    expect(page).not.toContain("type shortcuts");
    for (const label of ["Documento o archivo", "URL", "FAQ manual", "Vase Management", "Sistema de gestión externo"]) {
      expect(modal).toContain(label);
    }
    expect(modal).toContain('accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"');
    for (const label of ["business.vase.ar", "Tenant UUID", "Consumer Key"]) expect(modal).toContain(label);
    expect(modal).not.toContain("Consumer Secret");
    expect(modal).not.toContain("OAuth");
    expect(modal).toContain('role="dialog"');
    expect(modal).toContain("data-step-focus");
    expect(modal).toContain("stepHeading.current?.focus()");
    expect(modal).toContain("function backToSources()");
    expect(modal).toContain("onClick={backToSources}");
    expect(modal).toContain("router.refresh()");
    expect(groups).toContain("Vase Management");
    expect(groups).toContain("Sistema de gestión externo");
  });

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

    expect(root).toContain('redirect("/owner")');
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
    for (const destination of ["inbox", "activity", "knowledge", "channels", "settings"]) {
      expect(nav).toContain(`/owner/${destination}`);
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
    expect(labsChannelsPage).toContain('redirect("/owner/channels")');
    expect(appChannelsPage).toContain('new URL("/owner", productOrigins.labs).toString() as Route');
    expect(oauthCallback).toContain('new URL("/owner", url.origin)');
  });

  it("keeps Inbox operationally distinct from Activity", () => {
    const inbox = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/inbox/page.tsx"),
      "utf8",
    );
    const activity = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/activity/page.tsx"),
      "utf8",
    );

    expect(inbox).not.toContain('export { default } from "../activity/page"');
    expect(inbox).toContain('title="Inbox"');
    expect(inbox).toContain('status: { in: ["OPEN", "ESCALATED"] }');
    expect(inbox).toContain('messages: { orderBy: { createdAt: "desc" }, take: 1 }');
    expect(inbox).toContain("handoffs: {");
    expect(inbox).toContain('status: { in: ["PENDING", "ASSIGNED"] }');
    expect(activity).toContain('title="Analisis"');
    expect(activity).not.toContain('title="Inbox"');
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
    expect(setup).toContain('redirect("/owner/knowledge")');
    expect(setup).toContain('redirect("/owner/channels")');
    expect(setup).toContain('redirect("/owner/settings")');
  });

  it("registers an application icon instead of requesting a missing favicon", () => {
    const iconPath = path.resolve("apps/vase-labs/app/icon.svg");

    expect(fs.existsSync(iconPath)).toBe(true);
  });
});
