import { describe, expect, it } from "vitest";
import { requestCustomPageSchema } from "@/lib/validators/business";
import {
  CUSTOM_WEB_DEFAULTS,
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

  it("cycles the palette", () => {
    expect(webPalette(0)).toEqual(webPalette(5));
    expect(webPalette(0)).not.toEqual(webPalette(1));
  });

  it("describes the plan limit", () => {
    expect(webLimitText(2, 5)).toBe("Tenés 2 de 5 webs de tu plan.");
    expect(webLimitText(1, null)).toBe("Tenés 1 web.");
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
