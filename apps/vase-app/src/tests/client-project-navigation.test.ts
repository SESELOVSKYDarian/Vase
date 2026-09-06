import { describe, expect, it } from "vitest";
import { buildClientProjectNavigation } from "@/lib/navigation/client-project-navigation";

describe("client project navigation", () => {
  it("includes Vase Management when the tenant has active Management access", () => {
    const navigation = buildClientProjectNavigation(
      [
        { key: "business", isActive: true },
        { key: "labs", isActive: true },
        { key: "management", isActive: true },
        { key: "rest", isActive: false },
      ],
      {
        businessHref: "/app/business",
        labsHref: "/app/labs",
        managementHref: "/api/management/sso/start",
        restHref: "https://rest.vase.ar",
      },
    );

    expect(navigation.children).toEqual([
      { id: "projects-business", href: "/app/business", label: "Vase Business" },
      { id: "projects-labs", href: "/app/labs", label: "Vase Labs", forceDocumentNavigation: true },
      { id: "projects-management", href: "/api/management/sso/start", label: "Vase Management", forceDocumentNavigation: true },
    ]);
    expect(navigation.href).toBe("/app/business");
  });
});
