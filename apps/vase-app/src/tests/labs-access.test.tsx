import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireTenantRole: vi.fn(),
  tenantRoles: { OWNER: "OWNER" },
}));

vi.mock("@/server/queries/modules", () => ({
  getTenantModulesAccess: vi.fn(),
}));

import { LabsRequiredNotice } from "@/components/labs/labs-required-notice";
import { buildLabsRequiredUrl } from "@/lib/labs/access";

describe("Labs access fallback", () => {
  it("returns clients without Labs to the App dashboard", () => {
    expect(buildLabsRequiredUrl("https://app.vase.ar")).toBe(
      "https://app.vase.ar/app?labs=required",
    );
  });

  it("renders the activation notice", () => {
    const html = renderToStaticMarkup(<LabsRequiredNotice />);

    expect(html).toContain("Vase Labs no está activo");
    expect(html).toContain("/app/billing");
  });
});
