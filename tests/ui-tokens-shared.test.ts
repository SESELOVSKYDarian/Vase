import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8").replace(/\r\n/g, "\n");

describe("colores y marca compartidos entre app, Labs y Business", () => {
  it("Business tiene la copia exacta de los tokens de packages/ui (correr scripts/sync-ui-to-business.mjs)", () => {
    expect(read("apps/vase-editor/web/src/panel/vase-tokens.css")).toBe(read("packages/ui/src/tokens.css"));
  });

  it("los tres paneles toman los colores de ese archivo y no los repiten", () => {
    const app = read("packages/ui/src/panel.css");
    const business = read("apps/vase-editor/web/src/panel/panel.css");
    expect(app).toContain('@import "./tokens.css";');
    expect(business).toContain('@import "./vase-tokens.css";');
    for (const css of [app, business]) expect(css).not.toContain("--page: #ffffff");
  });

  it("la marca es vase + el producto, con la misma pastilla", () => {
    expect(read("apps/vase-editor/web/src/panel/components/Shell.jsx")).toContain('<span className="vase-pill business">Business</span>');
    expect(read("apps/vase-labs/app/app/owner/labs/labs-shell.tsx")).toContain('<span className="vase-pill">Labs</span>');
  });
});
