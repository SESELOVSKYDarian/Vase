import { ChevronRight } from "lucide-react";
import { NEWS_ORIGIN } from "@/config/news";
import { portalOrigins } from "@/config/origins";

// La barra de vase.ar, en pastillas, montada sobre la portada de cada página de novedades.
export function NewsNav() {
  const site = portalOrigins.publicSite;
  const links = [
    { label: "Inicio", href: site },
    { label: "Business", href: `${site}/vase-business` },
    { label: "Labs", href: `${site}/vaselabs` },
    { label: "Management", href: `${site}/vase-management` },
    { label: "Novedades", href: NEWS_ORIGIN, current: true },
  ];

  return (
    <header className="vn-nav">
      <a href={NEWS_ORIGIN} className="vn-logo" aria-label="Novedades de Vase">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/vase-logo-white.png" alt="" width={28} height={28} />
        vase
      </a>
      <nav aria-label="Principal" className="vn-pills">
        {links.map((link) => (
          <a key={link.label} href={link.href} className="vn-pill" aria-current={link.current ? "page" : undefined}>
            {link.label}
          </a>
        ))}
        <a href={`${site}/precios`} className="vn-pill">
          Precios
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </a>
      </nav>
      <span className="vn-line" aria-hidden="true" />
      <a href={`${portalOrigins.app}/signin`} className="vn-pill vn-hide-sm">
        Iniciar sesión
      </a>
      <a href={`${portalOrigins.app}/register`} className="vn-pill solid">
        Registrarse
      </a>
    </header>
  );
}
