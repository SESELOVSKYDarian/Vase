import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve("src/app/(marketing)/que-es-vase/page.tsx");
const pageSource = readFileSync(pagePath, "utf8");

describe("what is Vase marketing page", () => {
  it("references local images from the public URL root", () => {
    const localImagePaths = [...pageSource.matchAll(/["'](\/[^"']+\.(?:jpe?g|png))["']/gi)].map(
      ([, imagePath]) => imagePath,
    );

    expect(localImagePaths).not.toContain("/public/alexis.jpeg");
    expect(localImagePaths).not.toContain("/public/daran.png");
    expect(localImagePaths).not.toContain("/public/dos.jpeg");

    for (const imagePath of localImagePaths) {
      expect(path.resolve("public", imagePath.slice(1))).toSatisfy((assetPath: string) => {
        try {
          readFileSync(assetPath);
          return true;
        } catch {
          return false;
        }
      });
    }
  });

  it("shows the founders in both supported languages", () => {
    expect(pageSource.match(/Alexis Vallejos/g)).toHaveLength(2);
    expect(pageSource.match(/Darian Seselovsky/g)).toHaveLength(2);
  });
});
