import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteStorefrontPagesSchema } from "@/lib/validators/business";

const prismaSchema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

function customPageRequestFieldDefinition(fieldName: string) {
  const modelMatch = prismaSchema.match(/model CustomPageRequest \{([\s\S]*?)\n\}/);
  const body = modelMatch?.[1] ?? "";
  return body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${fieldName} `));
}

function supportsAtLeast(fieldName: string, maxLength: number) {
  const definition = customPageRequestFieldDefinition(fieldName) ?? "";
  const varcharLength = definition.match(/@db\.VarChar\((\d+)\)/)?.[1];

  return definition.includes("@db.Text") || Number(varcharLength ?? 0) >= maxLength;
}

describe("business validators", () => {
  it("accepts multiple storefront page ids for bulk deletion", () => {
    const result = deleteStorefrontPagesSchema.safeParse({
      pageIds: ["clx8h1a2b0000abcde1234567", "clx8h1a2b0000abcde7654321"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects bulk deletion requests without selected pages", () => {
    const result = deleteStorefrontPagesSchema.safeParse({
      pageIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("keeps custom page request database columns aligned with form validator limits", () => {
    expect(supportsAtLeast("businessObjective", 400)).toBe(true);
    expect(supportsAtLeast("pageScope", 200)).toBe(true);
    expect(supportsAtLeast("businessDescription", 500)).toBe(true);
    expect(supportsAtLeast("desiredColors", 200)).toBe(true);
    expect(supportsAtLeast("brandStyle", 200)).toBe(true);
    expect(supportsAtLeast("desiredFeatures", 400)).toBe(true);
    expect(supportsAtLeast("visualReferences", 400)).toBe(true);
    expect(supportsAtLeast("observations", 500)).toBe(true);
    expect(supportsAtLeast("designReferences", 400)).toBe(true);
    expect(supportsAtLeast("requiredIntegrations", 300)).toBe(true);
    expect(supportsAtLeast("notes", 500)).toBe(true);
  });
});
