import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_DATA_WITH_IMAGE_ROUTES_SQL,
  PUBLIC_PRODUCT_DATA_SQL,
  restoreProductImageRoutes,
} from "../apps/vase-editor/server/src/services/publicMedia.js";

const PRODUCT_ID = "305852a9-eb9c-49c7-84a0-79c0cb3ae7b4";
const BASE64 = "data:image/png;base64," + "A".repeat(4000);

describe("panel admin: lista de productos liviana", () => {
  it("la lista del panel manda las fotos embebidas como rutas cortas, solo para productos que la ruta publica sirve", () => {
    const source = readFileSync("apps/vase-editor/server/src/routes/tenant.js", "utf8");
    const route = source.slice(source.indexOf("tenantRouter.get('/products'"), source.indexOf("tenantRouter.get('/price-lists'"));
    expect(route).toContain("case when ${PUBLIC_IMAGE_ROUTE_VISIBLE_SQL} then ${PRODUCT_DATA_WITH_IMAGE_ROUTES_SQL} else p.data end as data");
    expect(route).not.toMatch(/p\.brand, p\.data,/);
    expect(PUBLIC_PRODUCT_DATA_SQL).toBe(`${PRODUCT_DATA_WITH_IMAGE_ROUTES_SQL} as data`);
  });

  it("al guardar, una ruta corta de este mismo producto vuelve a ser la foto original", () => {
    const existing = [{ url: BASE64, alt: "Foto 1" }, "data:image/jpeg;base64,BBBB", { url: "https://cdn.example.com/3.jpg" }];
    const restored = restoreProductImageRoutes(
      [
        { url: `/public/products/${PRODUCT_ID}/images/0?v=1793600000`, alt: "Nueva alt", primary: true },
        `/public/products/${PRODUCT_ID}/images/1?v=1793600000`,
        { url: "https://uploads.vase.ar/nueva.webp" },
      ],
      existing,
      PRODUCT_ID,
    );
    expect(restored).toEqual([
      { url: BASE64, alt: "Nueva alt", primary: true },
      "data:image/jpeg;base64,BBBB",
      { url: "https://uploads.vase.ar/nueva.webp" },
    ]);
  });

  it("no toca rutas de otro producto, descarta rutas a fotos que ya no existen y deja todo lo demas igual", () => {
    const other = "11111111-2222-4333-8444-555555555555";
    expect(
      restoreProductImageRoutes(
        [`/public/products/${other}/images/0`, `/public/products/${PRODUCT_ID}/images/7`, { src: BASE64 }],
        [BASE64],
        PRODUCT_ID,
      ),
    ).toEqual([`/public/products/${other}/images/0`, { src: BASE64 }]);
    expect(restoreProductImageRoutes(undefined, [BASE64], PRODUCT_ID)).toBeUndefined();
    expect(restoreProductImageRoutes("texto", [BASE64], PRODUCT_ID)).toBe("texto");
  });

  it("el guardado del producto recupera las fotos antes de procesarlas", () => {
    const source = readFileSync("apps/vase-editor/server/src/routes/tenant.js", "utf8");
    expect(source).toContain("restoreProductImageRoutes(req.body?.images, existingData.images, productId)");
  });
});
