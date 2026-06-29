import { describe, expect, it } from "vitest";
import { getPostRegistrationRedirect, getProductPanelCopy } from "@/lib/auth/redirects";

describe("auth redirects", () => {
  it("maps onboarding selections to owner redirect paths", () => {
    expect(getPostRegistrationRedirect("BUSINESS")).toBe("/app/owner?product=business");
    expect(getPostRegistrationRedirect("LABS")).toBe("/app/owner/labs/setup");
    expect(getPostRegistrationRedirect("BOTH")).toBe("/app/owner/labs/setup");
  });

  it("returns contextual copy for each onboarding selection", () => {
    expect(getProductPanelCopy("LABS").title).toContain("VaseLabs");
    expect(getProductPanelCopy("BOTH").title).toContain("Business + Labs");
  });
});
