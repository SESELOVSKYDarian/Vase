// @vitest-environment jsdom

import { act, useState, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ClientTeamCommercialAccessNotice,
  ClientProductAccessEditor,
  canEditOwnerCommercialAccess,
  serializeClientProductAccessEnvelope,
} from "@/components/admin/client-product-access-editor";
import { mergeBusinessFeatureOverride } from "@/components/admin/business-feature-editor";
import type { ClientProductAccess } from "@/lib/admin/client-product-access";

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
  businessGeneralFeatures: [{
    id: "feature-domains",
    key: "domains",
    name: "Dominios",
    description: "Dominios conectados",
    valueType: "INTEGER" as const,
    trialDefault: 1,
    activeDefault: 3,
    minValue: 1,
    maxValue: 5,
  }],
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
    status: "PUBLISHED" as const,
  }],
  managementAvailable: true,
  onChange: vi.fn(),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(element: HTMLElement) {
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function renderInteractive(
  initial: ClientProductAccess = props.value as ClientProductAccess,
  extra: Partial<ComponentProps<typeof ClientProductAccessEditor>> = {},
) {
  let latest = initial;
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <ClientProductAccessEditor
        {...props}
        {...extra}
        value={value}
        onChange={(next) => {
          latest = next;
          setValue(next);
        }}
      />
    );
  }
  act(() => root?.render(<Harness />));
  return { getLatest: () => latest };
}

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

  it("enables, changes, and disables Business independently", () => {
    const state = renderInteractive();
    const businessStatus = container!.querySelector<HTMLSelectElement>('[aria-label="Estado de Plantilla"]')!;

    change(businessStatus, "TRIAL");
    expect(state.getLatest().business?.submodules[0]).toMatchObject({ id: "business-template", status: "TRIAL" });
    change(businessStatus, "ACTIVE");
    expect(state.getLatest().business?.submodules[0].status).toBe("ACTIVE");
    change(businessStatus, "OFF");
    expect(state.getLatest().business).toBeNull();
  });

  it("orders Labs by plan key, enables STARTER by default, and changes the selected plan", () => {
    const state = renderInteractive(props.value, {
      labsPlans: [props.labsPlans[2], props.labsPlans[0], props.labsPlans[1]],
    });
    click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-labs"]')!);
    const labsStatus = container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Labs"]')!;

    change(labsStatus, "TRIAL");
    expect(state.getLatest().labs).toEqual({ submoduleId: "labs-starter", plan: "STARTER", status: "TRIAL" });
    const radios = [...container!.querySelectorAll<HTMLInputElement>('input[name="labs-plan"]')];
    expect(radios.map((radio) => radio.value)).toEqual(["STARTER", "PRO", "GROWTH"]);
    click(radios.find((radio) => radio.value === "PRO")!);
    expect(state.getLatest().labs).toEqual({ submoduleId: "labs-pro", plan: "PRO", status: "TRIAL" });
  });

  it("explains a missing STARTER plan and enables the first available canonical plan", () => {
    const state = renderInteractive(props.value, {
      labsPlans: [props.labsPlans[2], props.labsPlans[1]],
    });
    click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-labs"]')!);

    expect(container!.textContent).toContain("Starter no está disponible");
    expect([...container!.querySelectorAll<HTMLInputElement>('input[name="labs-plan"]')]
      .map((radio) => radio.value)).toEqual(["PRO", "GROWTH"]);
    change(container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Labs"]')!, "ACTIVE");
    expect(state.getLatest().labs).toEqual({ submoduleId: "labs-pro", plan: "PRO", status: "ACTIVE" });
  });

  it("enables Rest with a published version and changes that version", () => {
    const secondVersion = { ...props.restPricingVersions[0], id: "rest-v2", version: 2 };
    const state = renderInteractive(props.value, { restPricingVersions: [...props.restPricingVersions, secondVersion] });
    click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-rest"]')!);
    const status = container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Rest"]')!;
    const version = container!.querySelector<HTMLSelectElement>('[aria-label="Plan publicado de Vase Rest"]')!;

    change(status, "ACTIVE");
    expect(state.getLatest().rest).toEqual({ pricingVersionId: "rest-v1", status: "ACTIVE" });
    change(version, "rest-v2");
    expect(state.getLatest().rest).toEqual({ pricingVersionId: "rest-v2", status: "ACTIVE" });
  });

  it("keeps the current archived Rest version visible and disables other archived versions", () => {
    const archivedCurrent = { ...props.restPricingVersions[0], id: "rest-archived", version: 6, status: "ARCHIVED" as const };
    const archivedOther = { ...props.restPricingVersions[0], id: "rest-other", version: 5, status: "ARCHIVED" as const };
    renderInteractive({
      ...props.value,
      rest: { pricingVersionId: "rest-archived", status: "ACTIVE" },
    }, { restPricingVersions: [archivedCurrent, archivedOther] });
    click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-rest"]')!);

    const current = container!.querySelector<HTMLOptionElement>('option[value="rest-archived"]')!;
    const other = container!.querySelector<HTMLOptionElement>('option[value="rest-other"]')!;
    expect(current.textContent).toContain("Actual · no disponible");
    expect(current.disabled).toBe(false);
    expect(other.disabled).toBe(true);
    expect(container!.querySelector<HTMLSelectElement>('[aria-label="Plan publicado de Vase Rest"]')?.value).toBe("rest-archived");
  });

  it("does not select an archived Rest version for a new entitlement", () => {
    const archived = { ...props.restPricingVersions[0], id: "rest-archived", status: "ARCHIVED" as const };
    const state = renderInteractive(props.value, { restPricingVersions: [archived] });
    click(container!.querySelector<HTMLButtonElement>('[aria-controls$="-rest"]')!);
    change(container!.querySelector<HTMLSelectElement>('[aria-label="Estado comercial de Vase Rest"]')!, "ACTIVE");

    expect(state.getLatest().rest).toBeNull();
    expect(container!.textContent).toContain("No hay planes publicados");
  });

  it("renders a team access notice without an Owner header", () => {
    const html = renderToStaticMarkup(<ClientTeamCommercialAccessNotice tenantName="Cuenta Norte" />);
    expect(html).toContain("miembro del equipo");
    expect(html).toContain("Cuenta Norte");
    expect(html).toContain("Ver equipo");
    expect(html).not.toContain("Owner de la cuenta");
  });

  it("opens the Owner editor only for new clients or existing Owners", () => {
    expect(canEditOwnerCommercialAccess("", "UNASSIGNED")).toBe(true);
    expect(canEditOwnerCommercialAccess("user-owner", "OWNER")).toBe(true);
    expect(canEditOwnerCommercialAccess("user-member", "TEAM")).toBe(false);
    expect(canEditOwnerCommercialAccess("user-orphan", "UNASSIGNED")).toBe(false);
  });

  it("shows module-wide Business features under Generales and emits bounded numeric overrides", () => {
    const state = renderInteractive({
      ...props.value,
      business: { submodules: [{ id: "business-template", key: "plantilla", status: "ACTIVE", features: [] }] },
    });
    const generalInput = container!.querySelector<HTMLInputElement>('#business-feature-feature-domains')!;

    expect(container!.textContent).toContain("Generales");
    expect(generalInput.min).toBe("1");
    expect(generalInput.max).toBe("5");
    change(generalInput, "4");
    expect(state.getLatest().business?.submodules[0].features).toContainEqual({
      featureId: "feature-domains",
      enabled: true,
      value: 4,
    });
  });

  it("serializes the exact v2 envelope", () => {
    const access: ClientProductAccess = {
      business: null,
      labs: { submoduleId: "labs-starter", plan: "STARTER", status: "ACTIVE" },
      rest: null,
      management: null,
    };
    expect(JSON.parse(serializeClientProductAccessEnvelope(access))).toEqual({ version: 2, productAccess: access });
  });

  it("retains edited local state while showing a server error and disabling pending submit", () => {
    const initial: ClientProductAccess = {
      ...props.value,
      labs: { submoduleId: "labs-starter", plan: "STARTER", status: "TRIAL" },
    };
    renderInteractive(initial, { pending: true, error: "No se pudo guardar" });

    click(container!.querySelector<HTMLInputElement>('input[value="PRO"]')!);
    expect(container!.textContent).toContain("No se pudo guardar");
    expect(container!.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(container!.querySelector<HTMLInputElement>('input[value="PRO"]')?.checked).toBe(true);
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
