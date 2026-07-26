import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs standalone owner experience", () => {
  it("describes Vase Management as active with background catalog sync", () => {
    const modal = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx"), "utf8");
    expect(modal).toContain("La conexión con Vase Management queda activa");
    expect(modal).toContain("sincronización del catálogo se gestiona en segundo plano");
    expect(modal).not.toContain("fuente quedará en cola");
  });

  it("renders only real channel records and uses the hybrid Meta connection flow", () => {
    const page = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/channels/page.tsx"), "utf8");
    const modal = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/channels/channel-connect-modal.tsx"), "utf8");

    expect(page).toContain("data.channels.length === 0 ? (");
    const emptyBranch = page.split("data.channels.length === 0 ? (")[1]?.split(") : (")[0] ?? "";
    expect(emptyBranch).toContain("Todavía no agregaste ningún canal");
    expect(emptyBranch).toContain("<ChannelConnectModal capacity={capacity} />");
    for (const hidden of ["labs-channel-overview", "Webhook base", "labs-channel-grid", "LabsSection", "labs-channel-endpoints"]) {
      expect(emptyBranch).not.toContain(hidden);
    }

    expect(page).toContain("data.channels.map((channel)");
    expect(page).not.toContain("channelOrder.map((channelType)");
    expect(page).not.toContain("labs-channel-webhook");
    expect(page).not.toContain("labs-channel-endpoints");
    expect(page).toContain("channel.accountLabel ?? channel.externalHandle ?? \"Cuenta sin nombre\"");
    expect(page).toContain("channel.lastError");

    for (const label of ["WhatsApp", "Instagram", "Facebook", "Webhook URL", "Webhook Key", "Comprobar conexión"]) {
      expect(modal).toContain(label);
    }
    expect(modal).toContain('fetch("/api/labs/channels/setup"');
    expect(modal).toContain("buildChannelSetupRequest(selected)");
    expect(modal).toContain('fetch("/api/labs/channels/verify"');
    expect(modal).toContain("buildChannelVerifyRequest(setup.channelId)");
    expect(modal).toContain("createChannelUiFlow");
    expect(modal).toContain("data-step-focus");
    expect(modal).toContain("aria-live=\"polite\"");
    expect(modal).toContain("/api/v1/meta/connections/start");
    expect(modal).toContain("authorizationUrl");
    expect(modal).toContain("window.location.assign");
    expect(modal).toContain("Conectar con Meta");
  });

  it("offers the guided five-source knowledge flow without leaking credentials", () => {
    const page = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/page.tsx"), "utf8");
    const selectorPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/model-selector.tsx");
    const keyCardPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/openai-key-card.tsx");
    const promptCardPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/assistant-prompt-card.tsx");
    const modalPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-add-modal.tsx");
    const groupsPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx");

    expect(fs.existsSync(selectorPath)).toBe(true);
    expect(fs.existsSync(keyCardPath)).toBe(true);
    expect(fs.existsSync(promptCardPath)).toBe(true);
    expect(fs.existsSync(modalPath)).toBe(true);
    expect(fs.existsSync(groupsPath)).toBe(true);
    if (!fs.existsSync(selectorPath) || !fs.existsSync(keyCardPath) || !fs.existsSync(promptCardPath) || !fs.existsSync(modalPath) || !fs.existsSync(groupsPath)) return;

    const selector = fs.readFileSync(selectorPath, "utf8");
    const keyCard = fs.readFileSync(keyCardPath, "utf8");
    const promptCard = fs.readFileSync(promptCardPath, "utf8");
    const modal = fs.readFileSync(modalPath, "utf8");
    const groups = fs.readFileSync(groupsPath, "utf8");
    expect(page).toContain("getOpenAiModelProfiles");
    expect(page).toContain("<AssistantPromptCard initialPrompt={data.assistant.systemPrompt} />");
    expect(page).toContain("<ModelSelector");
    expect(page).toContain("currentModel={data.assistant.model}");
    expect(page).toContain("<OpenAiKeyCard configured={data.openAiKeyConfigured} />");
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
    expect(selector).toContain('"use client"');
    expect(selector).toContain('fetch("/api/labs/assistant/model"');
    expect(selector).toContain("profileId");
    expect(selector).toContain("router.refresh()");
    expect(keyCard).toContain('"use client"');
    expect(keyCard).toContain('fetch("/api/labs/assistant/openai-key"');
    expect(keyCard).toContain("apiKey");
    expect(keyCard).toContain("router.refresh()");
    expect(keyCard).not.toContain("Ver o copiar");
    expect(keyCard).not.toContain("reveal");
    expect(promptCard).toContain('fetch("/api/labs/assistant/prompt"');
    expect(promptCard).toContain("systemPrompt");
    expect(promptCard).toContain("Guardar prompt");
    expect(groups).toContain("Vase Management");
    expect(groups).toContain("Sistema de gestión externo");
  });

  it("presents knowledge as a complete operational workspace", () => {
    const page = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/page.tsx"), "utf8");
    const keyCard = fs.readFileSync(path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/openai-key-card.tsx"), "utf8");
    const testPanelPath = path.resolve("apps/vase-labs/app/app/owner/labs/chatbots/assistant-test-panel.tsx");
    const styles = fs.readFileSync(path.resolve("apps/vase-labs/app/globals.css"), "utf8");

    expect(fs.existsSync(testPanelPath)).toBe(true);
    if (!fs.existsSync(testPanelPath)) return;
    const testPanel = fs.readFileSync(testPanelPath, "utf8");

    expect(page).toContain("labs-knowledge-status");
    expect(page).toContain("<AssistantTestPanel");
    expect(page).toContain("Fuentes listas");
    expect(page).toContain("Canales activos");
    expect(testPanel).toContain('fetch("/api/labs/assistant/test"');
    expect(testPanel).toContain('aria-live="polite"');
    expect(testPanel).toContain("Probar chatbot");
    expect(keyCard).toContain("aria-label={showKey");
    expect(keyCard).toContain('autoComplete="new-password"');
    expect(styles).toContain(".labs-knowledge-workspace");
    expect(styles).toContain(".labs-knowledge-status");
    expect(styles).toContain("@media (max-width: 760px)");
  });

  it("serves the authenticated 05c3cb8 owner dashboard from the standalone Labs app", () => {
    const root = fs.readFileSync(
      path.resolve("apps/vase-labs/app/page.tsx"),
      "utf8",
    );
    const rootLayout = fs.readFileSync(
      path.resolve("apps/vase-labs/app/layout.tsx"),
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
    expect(rootLayout).toContain('className="light h-full scroll-smooth antialiased"');
    expect(styles).toContain("--font-manrope: Manrope");
    expect(styles).toContain("--font-newsreader: Newsreader");
    expect(styles).toContain("--font-ibm-plex-mono");
    expect(root).not.toContain("tenant_demo");
    expect(page).toContain("resolveLabsRequestContext");
    expect(page).toContain("labsPrisma");
    const settings = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/settings/page.tsx"),
      "utf8",
    );
    expect(layout).toContain("labs-shell");
    expect(layout).toContain("labs-sidebar");
    expect(layout).toContain("labs-sidebar-brand");
    expect(layout).toContain("font-[family-name:var(--font-newsreader)]");
    expect(layout).toContain("labs-sidebar-tenant");
    expect(layout).toContain("LabsOwnerMobileNav");
    expect(page).toContain('eyebrow="Operacion IA"');
    expect(page).toContain('title="Panel de control"');
    expect(page).toContain("LabsMetricCard");
    expect(page).toContain("LabsConversationTrendChart");
    expect(page).toContain("LabsIntentDistributionChart");
    for (const destination of ["inbox", "activity", "orders", "knowledge", "channels", "settings"]) {
      expect(nav).toContain(`/owner/${destination}`);
    }
    expect(nav).toContain("labs-owner-nav-link");
    expect(nav).toContain("labs-owner-mobile-nav-link");
    expect(styles).toContain(".labs-shell");
    expect(styles).toContain(".labs-sidebar");
    expect(styles).toContain(".labs-sidebar-brand");
    expect(styles).toContain(".labs-sidebar-tenant");
    expect(styles).toContain(".labs-owner-nav-link");
    expect(styles).toContain(".labs-panel");
    expect(styles).not.toContain(".labs-rail");
    expect(page).not.toContain("Tu acceso a Labs, canales y tokens en una sola vista.");
    expect(settings).toContain("Presupuesto IA");
    expect(settings).toContain("calculateAiBudget");
    expect(settings).toContain("estimateRemainingAiReplies");
    expect(settings).toContain("currentModel");
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
    expect(oauthCallback).toContain('new URL("/owner/channels", url.origin)');
  });

  it("keeps Inbox operationally distinct from Activity", () => {
    const inbox = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/inbox/page.tsx"),
      "utf8",
    );
    const workstationPath = path.resolve("apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx");
    const activity = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/activity/page.tsx"),
      "utf8",
    );
    const activityWorkspace = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/activity/activity-workspace.tsx"),
      "utf8",
    );

    expect(fs.existsSync(workstationPath)).toBe(true);
    if (!fs.existsSync(workstationPath)) return;
    const workstation = fs.readFileSync(workstationPath, "utf8");

    expect(inbox).not.toContain('export { default } from "../activity/page"');
    expect(inbox).toContain('title="Inbox"');
    expect(inbox).toContain('status: { in: ["OPEN", "ESCALATED"] }');
    expect(inbox).toContain('messages: { orderBy: { createdAt: "asc" }, take: 80 }');
    expect(inbox).toContain("handoffs: {");
    expect(inbox).toContain('status: { in: ["PENDING", "ASSIGNED"] }');
    expect(inbox).toContain("<InboxWorkstation");
    expect(workstation).toContain('"use client"');
    expect(workstation).toContain("setInterval");
    expect(workstation).toContain("refreshConversationList");
    expect(workstation).toContain("fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}`");
    expect(workstation).toContain("fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}/reply`");
    expect(workstation).toContain("fetch(`/api/v1/inbox/${tenantSlug}/conversations/${activeId}/handoff`");
    expect(workstation).toContain("Respuesta humana");
    expect(workstation).toContain("Pausar IA");
    expect(workstation).toContain("Reactivar IA");
    expect(workstation).toContain("/reactivate");
    expect(workstation).toContain("labs-inbox-alert");
    expect(workstation).toContain("labs-inbox-shell");
    expect(workstation).toContain("labs-inbox-workstation");
    expect(activity).toContain('title="Inteligencia comercial"');
    expect(activity).toContain("<ActivityWorkspace");
    expect(activityWorkspace).toContain("aiReplyError");
    expect(activityWorkspace).toContain("Esperando respuesta IA");
    expect(activity).not.toContain('title="Inbox"');
  });

  it("ports the main Vase app visual language into the Labs Inbox", () => {
    const page = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/inbox/page.tsx"),
      "utf8",
    );
    const workstation = fs.readFileSync(
      path.resolve("apps/vase-labs/app/app/owner/labs/inbox/inbox-workstation.tsx"),
      "utf8",
    );
    const styles = fs.readFileSync(
      path.resolve("apps/vase-labs/app/globals.css"),
      "utf8",
    );

    expect(page).toContain('className="labs-inbox-page');
    expect(page).toContain("labs-inbox-summary-grid");
    expect(workstation).toContain("labs-inbox-hero");
    expect(workstation).toContain("labs-inbox-stat-card");
    expect(workstation).toContain("labs-inbox-thread-card");
    expect(workstation).toContain("labs-inbox-bubble-meta");
    expect(workstation).toContain("labs-inbox-composer-field");
    expect(workstation).toContain("Respuesta humana");
    expect(workstation).toContain("Mensaje enviado al cliente por el canal oficial.");
    expect(workstation).not.toContain("El mensaje se envia al cliente real y queda auditado en el historial.");
    expect(styles).toContain(".labs-inbox-hero");
    expect(styles).toContain(".labs-inbox-stat-card");
    expect(styles).toContain(".labs-inbox-thread-card");
    expect(styles).toContain(".labs-inbox-bubble-meta");
    expect(styles).toContain(".labs-inbox-composer-field");
    expect(styles).not.toContain(".labs-inbox-composer > div");
    expect(styles).toContain("backdrop-filter: blur(26px) saturate(150%)");
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
