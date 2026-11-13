import { describe, expect, it } from "vitest";
import { requestCustomPageSchema } from "@/lib/validators/business";
import { DEFAULT_BUSINESS_PLAN, canCreateStorefrontPage, resolveBusinessWebLimit } from "@/lib/business/plans";
import {
  CUSTOM_WEB_DEFAULTS,
  describeDomainState,
  describeWebState,
  webLimitText,
  webPalette,
  webRemainingText,
} from "@/lib/business/web-cards";

describe("web cards", () => {
  it("explains each status in plain words", () => {
    expect(describeWebState("ACTIVE").state).toBe("Publicada");
    expect(describeWebState("TEMPORARY").tone).toBe("y");
    expect(describeWebState("DRAFT").state).toBe("Borrador");
  });

  it("explains domain states", () => {
    expect(describeDomainState("CONNECTED").state).toBe("Conectado y seguro");
    expect(describeDomainState("NOT_CONFIGURED").state).toBe("Sin configurar");
  });

  it("limits webs by what the superadmin set, not by the plan", () => {
    const premium = { ...DEFAULT_BUSINESS_PLAN, plan: "PREMIUM" as const, businessProjectLimit: 2 };
    const start = { ...DEFAULT_BUSINESS_PLAN, businessProjectLimit: 8 };
    const pages = (count: number) => Array.from({ length: count }, () => ({ status: "ACTIVE" as const }));
    expect(canCreateStorefrontPage(pages(2), premium)).toBe(false);
    expect(canCreateStorefrontPage(pages(7), start)).toBe(true);
    expect(canCreateStorefrontPage([...pages(1), { status: "ARCHIVED" as const }], { ...start, businessProjectLimit: 2 })).toBe(true);
    expect(resolveBusinessWebLimit({ businessProjectLimit: 0 })).toBe(1);
  });

  it("cycles the palette", () => {
    expect(webPalette(0)).toEqual(webPalette(5));
    expect(webPalette(0)).not.toEqual(webPalette(1));
  });

  it("describes the plan limit", () => {
    expect(webLimitText(2, 5)).toBe("Tenés 2 de 5 webs de tu plan.");
    expect(webRemainingText(4, 5)).toBe("Te queda 1 en tu plan");
    expect(webRemainingText(5, 5)).toBe("Llegaste al límite de tu plan");
  });

  it("sends a custom request the existing validation accepts", () => {
    const result = requestCustomPageSchema.safeParse({
      ...CUSTOM_WEB_DEFAULTS,
      pageScope: "Una tienda solo para mayoristas",
      businessObjective: "Vender a clientes con cuenta",
      slotId: "cjld2cjxh0000qzrmn831i7rn",
    });
    expect(result.success).toBe(true);
  });
});
