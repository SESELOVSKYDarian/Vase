import { readFileSync } from "node:fs";
import { join } from "node:path";

const routesDir = "apps/vase-editor/server/src/routes";

/**
 * Las rutas del panel de Business viven en varios archivos (routes/tenant/*.js).
 * Devuelve todo el código junto, en el orden en que se cargan, para las pruebas que lo leen como texto.
 */
export function readTenantRoutesSource(): string {
  const index = readFileSync(join(routesDir, "tenant.js"), "utf8");
  const files = [...index.matchAll(/import '\.\/(tenant\/[\w-]+\.js)';/g)].map((match) => match[1]);
  return files.map((file) => readFileSync(join(routesDir, file), "utf8")).join("\n");
}
