import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contactInquirySchema } from "@/lib/validators/contact";

const validInquiry = {
  fullName: "Alexis Vallejos",
  company: "Sanitarios El Teflon",
  email: "alexis@example.com",
  phone: "+54 9 223 449-6403",
  message: "Quiero conocer que solucion de Vase corresponde a mi empresa.",
};

describe("Portal contact validation", () => {
  it("accepts the complete commercial inquiry", () => {
    expect(contactInquirySchema.safeParse(validInquiry).success).toBe(true);
  });

  it("requires a company and a real phone number", () => {
    expect(contactInquirySchema.safeParse({ ...validInquiry, company: "" }).success).toBe(false);
    expect(contactInquirySchema.safeParse({ ...validInquiry, phone: "123" }).success).toBe(false);
  });

  it("forwards the complete contract to Vase App", () => {
    const client = fs.readFileSync(path.resolve("src/lib/app-client.ts"), "utf8");

    expect(client).toMatch(/type ContactPayload = \{[\s\S]*company: string;/);
    expect(client).toMatch(/type ContactPayload = \{[\s\S]*phone: string;/);
  });
});
