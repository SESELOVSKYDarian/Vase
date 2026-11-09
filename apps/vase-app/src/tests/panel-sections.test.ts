import { describe, expect, it } from "vitest";
import {
  PANEL_HELP,
  buildDismissedNotificationKey,
  matchesNotificationFilter,
  notificationDestinationLabel,
  resolvePanelSection,
} from "@/lib/navigation/panel-sections";

describe("panel sections", () => {
  it.each([
    ["/app", "inicio"],
    ["/app/products", "productos"],
    ["/app/billing", "pagos"],
    ["/app/owner/customizations", "trabajos"],
    ["/app/team", "equipo"],
    ["/app/manager", "inicio"],
    ["/app/settings", "ajustes"],
    ["/app/help", "ayuda"],
    ["/app/analytics", "otra"],
  ] as const)("maps %s to %s", (path, section) => {
    expect(resolvePanelSection(path)).toBe(section);
    expect(PANEL_HELP[section].title).toBeTruthy();
  });

  it("does not treat a section prefix inside the home path as home", () => {
    expect(resolvePanelSection("/app/billing/old")).toBe("pagos");
  });
});

describe("notification filters", () => {
  const billing = { category: "billing", isRead: true } as const;
  const labs = { category: "labs", isRead: false } as const;
  const platform = { category: "platform", isRead: true } as const;

  it("filters by unread", () => {
    expect(matchesNotificationFilter(labs, "sinleer")).toBe(true);
    expect(matchesNotificationFilter(billing, "sinleer")).toBe(false);
  });

  it("filters by category", () => {
    expect(matchesNotificationFilter(billing, "pagos")).toBe(true);
    expect(matchesNotificationFilter(labs, "productos")).toBe(true);
    expect(matchesNotificationFilter(platform, "vase")).toBe(true);
    expect(matchesNotificationFilter(platform, "productos")).toBe(false);
  });
});

describe("notification destinations", () => {
  it.each([
    ["/app/billing", "Ir a Plan y pagos"],
    ["/app/owner/labs/inbox?conversationId=1", "Abrir Vase Labs"],
    ["https://labs.vase.ar/inbox", "Abrir Vase Labs"],
    ["/app/owner/customizations", "Ir a Trabajos a medida"],
    ["/app/help", "Ir a Ayuda y soporte"],
  ])("labels %s", (href, label) => {
    expect(notificationDestinationLabel(href)).toBe(label);
  });

  it("has no link for empty destinations", () => {
    expect(notificationDestinationLabel(null)).toBeNull();
    expect(notificationDestinationLabel("#")).toBeNull();
  });

  it("namespaces dismissed keys so they never count as read keys", () => {
    expect(buildDismissedNotificationKey("labs_system:x")).toBe("dismissed:labs_system:x");
  });
});
