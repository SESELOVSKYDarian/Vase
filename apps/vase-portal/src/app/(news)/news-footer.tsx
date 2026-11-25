import { portalOrigins } from "@/config/origins";

/** Pie de página de Novedades. */
export function NewsFooter() {
  return (
    <footer className="vn-wrap vn-foot">
      <span>© {new Date().getFullYear()} Vase</span>
      <span className="sp" />
      <a href={portalOrigins.publicSite}>vase.ar</a>
      <a href="mailto:soporte@vase.ar">soporte@vase.ar</a>
    </footer>
  );
}
