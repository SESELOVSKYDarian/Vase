"use client";

// Paso de un producto de Vase a otro (app, Labs, Business...). Cada producto es un sitio distinto,
// así que el navegador carga una página nueva. Para que no se sienta como una recarga, el marco
// (menú y barra de arriba) se queda quieto y solo el contenido se va con un movimiento corto;
// al llegar, el contenido del otro producto entra igual (eso lo hace el CSS, sin código).
import { useEffect } from "react";

const LEAVE_MS = 170;
// Si el otro producto no llega a cargar (sin conexión, descarga), la pantalla vuelve a verse.
const GIVE_UP_MS = 6000;
// Direcciones de este mismo sitio que en realidad llevan a otro producto.
const JUMP_PATHS = ["/app/business/launch", "/api/management/sso/start"];

/** ¿Este link lleva a otro producto de Vase (otro dominio)? Así se muestra la transición al saltar. */
function isProductJump(link: HTMLAnchorElement) {
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return false;
  let url: URL;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.origin !== window.location.origin) return /(^|\.)vase\.ar$/i.test(url.hostname);
  return JUMP_PATHS.includes(url.pathname);
}

/** Saca la marca de "saliendo" de la página (fin de la transición). */
const stopLeaving = () => document.documentElement.removeAttribute("data-vase-leaving");

/** Se usa una sola vez por panel (lo llama el menú lateral). */
export function useProductJump() {
  useEffect(() => {
    let timer: number | undefined;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || !isProductJump(link)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      document.documentElement.setAttribute("data-vase-leaving", "");
      window.setTimeout(() => window.location.assign(link.href), LEAVE_MS);
      window.clearTimeout(timer);
      timer = window.setTimeout(stopLeaving, GIVE_UP_MS);
    };
    // Al volver con "atrás" el navegador muestra la página guardada: hay que sacarle el estado de salida.
    window.addEventListener("pageshow", stopLeaving);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pageshow", stopLeaving);
      document.removeEventListener("click", onClick);
      window.clearTimeout(timer);
    };
  }, []);
}
