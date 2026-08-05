import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClientProductAccessEditor } from "@/components/admin/client-product-access-editor";
import { mergeBusinessFeatureOverride } from "@/components/admin/business-feature-editor";

const props = {
  owner: { name: "Ana Owner", email: "ana@example.com" },
  value: {
    business: null,
    labs: null,
    rest: null,
    management: null,
  },
  businessSubmodules: [
    {
      id: "business-template",
      key: "plantilla" as const,
      name: "Plantilla",
      features: [{
        id: "feature-pages",
        key: "pages",
        name: "Páginas publicadas",
        description: "Cantidad disponible",
        valueType: "INTEGER" as const,
        trialDefault: 1,
        activeDefault: 10,
        minValue: 1,
        maxValue: 20,
      }],
    },
    { id: "business-custom", key: "personalizado" as const, name: "Personalizado", features: [] },
  ],
  labsPlans: [
    { submoduleId: "labs-starter", plan: "STARTER" as const, label: "Starter" },
    { submoduleId: "labs-pro", plan: "PRO" as const, label: "Pro" },
    { submoduleId: "labs-growth", plan: "GROWTH" as const, label: "Growth" },
  ],
  restPricingVersions: [{
    id: "rest-v1",
    plan: "STARTER",
    version: 1,
    currency: "ARS",
    monthlyPrice: 12000,
    branchLimit: 1,
    localEmployeeLimit: 15,
    deviceLimit: 5,
    edgeLimit: 1,
  }],
  managementAvailable: true,
  onChange: vi.fn(),
};

describe("client product access editor", () => {
  it("stores only the changed Business feature as an override", () => {
    const features = props.businessSubmodules[0].features;
    expect(mergeBusinessFeatureOverride([], features, {
      featureId: "feature-pages",
      enabled: true,
      value: 7,
    })).toEqual([{ featureId: "feature-pages", enabled: true, value: 7 }]);
  });

  it("shows product-specific access without exposing tenant internals", () => {
    const html = renderToStaticMarkup(<ClientProductAccessEditor {...props} />);

    expect(html).toContain("Owner de la cuenta · configuración automática");
    expect(html).toContain("Ana Owner");
    expect(html).not.toContain("Slug del tenant");
    expect(html).not.toContain("Industria");
    expect(html).not.toContain("Rol en tenant");
    expect(html).not.toContain("Estado de membership");
    expect(html).toContain("Vase Business");
    expect(html).toContain("Vase Labs");
    expect(html).toContain("Vase Rest");
    expect(html.toLowerCase()).not.toContain("chatbots");
  });

  it("uses one Labs radio group and published Rest pricing options", () => {
    const html = renderToStaticMarkup(<ClientProductAccessEditor {...props} />);

    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html.match(/name="labs-plan"/g)).toHaveLength(3);
    expect(html).toContain("WhatsApp");
    expect(html).toContain("Instagram");
    expect(html).toContain("Facebook Messenger");
    expect(html).toContain('value="rest-v1"');
    expect(html).toContain("Starter · versión 1");
  });

  it("renders accessible product disclosures and pending feedback", () => {
    const html = renderToStaticMarkup(
      <ClientProductAccessEditor {...props} pending error="El plan cambió" />,
    );

    expect(html.match(/aria-expanded=/g)).toHaveLength(4);
    expect(html).toContain('role="alert"');
    expect(html).toContain("El plan cambió");
    expect(html).toContain("Guardando accesos…");
    expect(html).toContain("disabled");
  });
});
