// Copia los tokens compartidos de packages/ui a Vase Business.
// Business se compila solo con apps/vase-editor (sin packages/), por eso lleva una copia exacta.
// Uso: node scripts/sync-ui-to-business.mjs
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SHARED_FILES = [
  ["packages/ui/src/tokens.css", "apps/vase-editor/web/src/panel/vase-tokens.css"],
  ["packages/ui/src/components.css", "apps/vase-editor/web/src/panel/shared/components.css"],
  ["packages/ui/src/panel/select.tsx", "apps/vase-editor/web/src/panel/shared/select.tsx"],
  ["packages/ui/src/panel/cloud-status.tsx", "apps/vase-editor/web/src/panel/shared/cloud-status.tsx"],
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [from, to] of SHARED_FILES) {
    mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
    copyFileSync(path.join(root, from), path.join(root, to));
    console.log(`${from} -> ${to}`);
  }
}
