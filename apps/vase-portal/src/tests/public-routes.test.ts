import { describe, expect, it } from "vitest";
import { PUBLIC_ROUTES } from "@/config/redirects";

describe("Portal public routes", () => {
  it("publishes the current production route set", () => {
    expect(PUBLIC_ROUTES).toEqual([
      "/",
      "/demo",
      "/developers/api",
      "/developers/docs",
      "/integraciones",
      "/politica-de-privacidad",
      "/precios",
      "/preguntas-frecuentes",
      "/que-es-vase",
      "/seguridad",
      "/terminos-y-condiciones",
      "/vase-business",
      "/vaselabs",
    ]);
  });
});
