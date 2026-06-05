import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const socialSources = [
  "src/components/marketing/site-footer.tsx",
  "src/components/marketing/site-header-client.tsx",
].map((filePath) => readFileSync(path.resolve(filePath), "utf8"));

describe("marketing social links", () => {
  it("only links to the official Vase Instagram profile", () => {
    const combinedSource = socialSources.join("\n");

    expect(combinedSource.match(/https:\/\/www\.instagram\.com\/vasecorp\//g)).toHaveLength(2);
    expect(combinedSource).not.toMatch(/https:\/\/linkedin\.com/);
    expect(combinedSource).not.toMatch(/https:\/\/x\.com/);
    expect(combinedSource).not.toMatch(/https:\/\/instagram\.com["']/);
  });
});
