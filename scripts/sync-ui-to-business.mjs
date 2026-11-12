// Copia los tokens compartidos de packages/ui a Vase Business.
// Business se compila solo con apps/vase-editor (sin packages/), por eso lleva una copia exacta.
// Uso: node scripts/sync-ui-to-business.mjs
import { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SHARED_FILES = [["packages/ui/src/tokens.css", "apps/vase-editor/web/src/panel/vase-tokens.css"]];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [from, to] of SHARED_FILES) {
    copyFileSync(path.join(root, from), path.join(root, to));
    console.log(`${from} -> ${to}`);
  }
}
