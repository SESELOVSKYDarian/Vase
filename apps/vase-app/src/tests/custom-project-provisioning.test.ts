import { describe, expect, it } from "vitest";
import { resolveCustomProjectSlug, canAutoProvisionCustomProject } from "@/lib/business/custom-project";

describe("custom project provisioning", () => {
  it("uses tenant account name as primary slug", () => {
    expect(resolveCustomProjectSlug("Mi Usuario 2026", [])).toBe("mi-usuario-2026");
  });

  it("adds incremental suffix when slug already exists in tenant", () => {
    expect(resolveCustomProjectSlug("Mi Usuario", ["mi-usuario", "mi-usuario-2"]))
      .toBe("mi-usuario-3");
  });

  it("requires premium plan and premium request to auto provision", () => {
    expect(canAutoProvisionCustomProject({ plan: "PREMIUM", premiumEnabled: false }, true)).toBe(true);
    expect(canAutoProvisionCustomProject({ plan: "START", premiumEnabled: false }, true)).toBe(false);
    expect(canAutoProvisionCustomProject({ plan: "PREMIUM", premiumEnabled: true }, false)).toBe(false);
  });
});
