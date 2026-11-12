import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8").replace(/\r\n/g, "\n");
const exists = (file: string) => fs.existsSync(path.resolve(file));

describe("colores y marca compartidos entre app, Labs y Business", () => {
  it("Business se compila desde la raíz y lee packages/ui directo, sin copias", () => {
    const docker = read("apps/vase-editor/Dockerfile");
    expect(docker).toContain("COPY packages/ui/ /app/packages/ui/");
    expect(docker).toContain("WORKDIR /app/apps/vase-editor/web");
    expect(read("apps/vase-editor/web/vite.config.js")).toContain("'@vase/ui': path.resolve(__dirname, '../../../packages/ui/src')");
    expect(exists("apps/vase-editor/web/src/panel/vase-tokens.css")).toBe(false);
    expect(exists("apps/vase-editor/web/src/panel/shared")).toBe(false);
    expect(exists("scripts/sync-ui-to-business.mjs")).toBe(false);
  });

  it("Business usa el selector y la nube compartidos, sin estilos propios repetidos", () => {
    expect(read("apps/vase-editor/web/src/panel/components/Select.jsx")).toContain("from '@vase/ui/panel/select'");
    expect(read("apps/vase-editor/web/src/panel/components/CloudStatus.jsx")).toContain("from '@vase/ui/panel/cloud-status'");
    const business = read("apps/vase-editor/web/src/panel/panel.css");
    expect(business).toContain('@import "@vase/ui/components.css";');
    expect(business).not.toMatch(/^\.vp-sel /m);
    expect(business).not.toMatch(/^\.vp-cloud/m);
    expect(read("apps/vase-app/src/components/layout/save-status.tsx")).toContain("<CloudStatus");
    expect(read("packages/ui/src/panel.css")).not.toContain(".vpa-cloud");
  });

  it("los tres paneles toman los colores de ese archivo y no los repiten", () => {
    const app = read("packages/ui/src/panel.css");
    const business = read("apps/vase-editor/web/src/panel/panel.css");
    expect(app).toContain('@import "./tokens.css";');
    expect(business).toContain('@import "@vase/ui/tokens.css";');
    for (const css of [app, business]) expect(css).not.toContain("--page: #ffffff");
  });

  it("la marca es vase + el producto, con la misma pastilla", () => {
    expect(read("apps/vase-editor/web/src/panel/components/Shell.jsx")).toContain('<span className="vase-pill business">Business</span>');
    expect(read("apps/vase-labs/app/app/owner/labs/labs-shell.tsx")).toContain('<span className="vase-pill">Labs</span>');
  });
});
