import { describe, expect, it } from "vitest";
import { branchSchema, businessProfileSchema } from "@/lib/business/business-profile";
import { isVaseUploadUrl } from "@/lib/storage/vase-uploads";

const base = {
  name: "Piquim",
  industry: "Heladería",
  tagline: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  legalName: "",
  taxId: "",
  taxCondition: "",
  fiscalAddress: "",
};

describe("business profile", () => {
  it("turns empty optional fields into null", () => {
    const parsed = businessProfileSchema.parse(base);
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
  });

  it("rejects a bad email and a missing name", () => {
    expect(businessProfileSchema.safeParse({ ...base, email: "no-es-correo" }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("validates a branch", () => {
    expect(branchSchema.safeParse({ name: "Local", address: "Honduras 4500", phone: "", hours: "", isMain: true }).success).toBe(true);
    expect(branchSchema.safeParse({ name: "L", address: "", phone: "", hours: "", isMain: false }).success).toBe(false);
  });
});

describe("vase uploads", () => {
  it("only accepts https files from the uploads service", () => {
    expect(isVaseUploadUrl("https://uploads.vase.ar/p/abc.webp", "https://uploads.vase.ar")).toBe(true);
    expect(isVaseUploadUrl("https://evil.example/abc.webp", "https://uploads.vase.ar")).toBe(false);
    expect(isVaseUploadUrl("javascript:alert(1)", "https://uploads.vase.ar")).toBe(false);
    expect(isVaseUploadUrl("http://uploads.vase.ar/p/abc.webp", "https://uploads.vase.ar")).toBe(false);
  });
});
