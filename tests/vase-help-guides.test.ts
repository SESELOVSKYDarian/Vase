import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, SECTIONS, guideByTitle, searchGuides, sectionByName } from "../apps/vase-help/lib/guides";

// Copia de HELP y HELP_SECTIONS del panel nuevo (apps/vase-editor/web/src/panel/sections.js).
// El panel linkea a help.vase.ar/?q=<título> y /?seccion=<nombre>: cada uno tiene que abrir una página.
const PANEL_HELP: Record<string, string[]> = {
  resumen: ["Entender el resumen", "Confirmar un pago"],
  pedidos: ["Cambiar el estado de un pedido", "Ver el comprobante", "Pedidos por WhatsApp"],
  clientes: ["Aprobar un cliente", "Pasar un cliente a mayorista", "Bloquear un cliente"],
  catalogo: ["Cambiar precio o stock", "Crear una oferta", "Subir precios de un rubro", "¿Por qué volvió a cambiar un precio?"],
  imagenes: ["Subir y reemplazar imágenes", "Liberar espacio"],
  envios: ["Cobrar el envío por distancia", "Zonas especiales"],
  diseno: ["Cambiar la portada", "Agregar u ordenar bloques", "Editar el pie de página"],
  ajustes: ["Pedido por WhatsApp", "Configurar el correo", "Conectar tu dominio"],
};
const PANEL_SECTIONS = ["Resumen y pedidos", "Clientes", "Catálogo, ofertas y precios", "Envíos", "Diseño de la tienda", "Ajustes", "programadores"];

describe("help.vase.ar", () => {
  it("cada guía que nombra el panel abre su página", () => {
    for (const title of Object.values(PANEL_HELP).flat()) {
      expect(guideByTitle(title), title).toBeTruthy();
    }
  });

  it("cada sección que nombra el panel existe", () => {
    for (const name of PANEL_SECTIONS) expect(sectionByName(name), name).toBeTruthy();
  });

  it("slugs únicos y cada guía apunta a una sección real", () => {
    expect(new Set(GUIDES.map((guide) => guide.slug)).size).toBe(GUIDES.length);
    const sections = new Set(SECTIONS.map((section) => section.slug));
    for (const guide of GUIDES) expect(sections.has(guide.section), guide.slug).toBe(true);
  });

  it("las guías listas tienen contenido y su video existe", () => {
    for (const guide of GUIDES.filter((item) => item.status === "listo")) {
      expect(guide.body.length, guide.slug).toBeGreaterThan(0);
      if (guide.video) {
        expect(existsSync(path.join(__dirname, "../apps/vase-help/public", guide.video.src)), guide.video.src).toBe(true);
        expect(existsSync(path.join(__dirname, "../apps/vase-help/public", guide.video.poster)), guide.video.poster).toBe(true);
        expect(existsSync(path.join(__dirname, "../apps/vase-help/public", guide.video.srcLight)), guide.video.srcLight).toBe(true);
        expect(existsSync(path.join(__dirname, "../apps/vase-help/public", guide.video.posterLight)), guide.video.posterLight).toBe(true);
      }
    }
  });

  it("la búsqueda encuentra por palabras sueltas y sin tildes", () => {
    expect(searchGuides("oferta")[0]?.slug).toBe("crear-una-oferta");
    expect(searchGuides("catalogo stock").map((guide) => guide.slug)).toContain("cambiar-precio-o-stock");
    expect(searchGuides("x")).toEqual([]);
  });
});
