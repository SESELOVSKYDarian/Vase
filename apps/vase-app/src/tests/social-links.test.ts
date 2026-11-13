import { describe, expect, it } from "vitest";
import {
  legacySocialLinks,
  normalizeSocialUrl,
  socialColumns,
  socialLinksSchema,
} from "@/lib/business/social-links";

const allowIcons = (value: string) => value.startsWith("https://uploads.vase.ar/");

describe("social links", () => {
  it("adds https and rejects non-web links", () => {
    expect(normalizeSocialUrl("instagram.com/piquim")).toBe("https://instagram.com/piquim");
    expect(normalizeSocialUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeSocialUrl("piquim")).toBeNull();
  });

  it("keeps custom icons only from the uploads service", () => {
    const parsed = socialLinksSchema(allowIcons).parse([
      { id: "1", network: "custom", url: "https://mired.com", label: "Mi red", iconUrl: "https://evil.example/x.png" },
      { id: "2", network: "custom", url: "https://otra.com", label: "", iconUrl: "https://uploads.vase.ar/a.webp" },
    ]);
    expect(parsed[0].iconUrl).toBeNull();
    expect(parsed[1].iconUrl).toBe("https://uploads.vase.ar/a.webp");
    expect(parsed[1].label).toBe("Mi red");
  });

  it("rejects a bad link and unknown networks", () => {
    expect(socialLinksSchema(allowIcons).safeParse([{ id: "1", network: "instagram", url: "nada" }]).success).toBe(false);
    expect(socialLinksSchema(allowIcons).safeParse([{ id: "1", network: "myspace", url: "https://a.com" }]).success).toBe(false);
  });

  it("moves old columns to the list and back", () => {
    const links = legacySocialLinks({ instagram: "https://instagram.com/p", tiktok: " " });
    expect(links.map((link) => link.network)).toEqual(["instagram"]);
    expect(socialColumns(links)).toEqual({ instagram: "https://instagram.com/p", facebook: null, tiktok: null, youtube: null });
  });
});
