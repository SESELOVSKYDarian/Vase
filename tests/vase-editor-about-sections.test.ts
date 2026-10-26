import { describe, expect, it } from "vitest";
import { normalizeAboutSectionsForBrand } from "../apps/vase-editor/web/src/utils/aboutSections.js";
import { PIQUIM_ABOUT_SECTIONS, DEFAULT_ABOUT_SECTIONS } from "../apps/vase-editor/web/src/data/defaultSections.js";

const piquimSettings = { branding: { design_preset: "piquim", name: "PIQUIM" } };
const piquimTenant = { name: "PIQUIM", external_tenant_slug: "piquim" };
const otherTenant = { name: "Sanitarios El Teflon" };

describe("about sections shown by the admin panel and the storefront", () => {
  it("uses the Piquim template when nothing was saved", () => {
    expect(normalizeAboutSectionsForBrand(piquimSettings, piquimTenant, [])).toBe(PIQUIM_ABOUT_SECTIONS);
    expect(normalizeAboutSectionsForBrand({}, otherTenant, null)).toBe(DEFAULT_ABOUT_SECTIONS);
  });

  it("keeps what was saved and fills only the missing values from the template", () => {
    const saved = [{ id: "x", type: "AboutMission", enabled: true, props: { title: "Mi titulo" } }];
    const result = normalizeAboutSectionsForBrand(piquimSettings, piquimTenant, saved);

    expect(result).toHaveLength(1);
    expect(result[0].props.title).toBe("Mi titulo");
    expect(result[0].props.eyebrow).toBe("Como trabajamos");
    expect(result[0].props.styles).toBeTruthy();
  });

  it("drops sections of another brand's home layout", () => {
    const saved = [
      { type: "PiquimHero", props: {} },
      { type: "AboutHero", props: { title: "Hola" } },
    ];
    expect(normalizeAboutSectionsForBrand(piquimSettings, piquimTenant, saved).map((s: { type: string }) => s.type)).toEqual(["AboutHero"]);
    expect(normalizeAboutSectionsForBrand({}, otherTenant, saved).map((s: { type: string }) => s.type)).toEqual(["AboutHero"]);
  });

  it("does not mutate the saved sections", () => {
    const saved = [{ type: "AboutHero", enabled: true, props: { title: "Hola" } }];
    const copy = JSON.parse(JSON.stringify(saved));
    normalizeAboutSectionsForBrand(piquimSettings, piquimTenant, saved);
    expect(saved).toEqual(copy);
  });
});
