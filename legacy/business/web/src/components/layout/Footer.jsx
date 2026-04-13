import React from "react";
import { useTenant } from "../../context/TenantContext";
import { isExternalPath, navigate, normalizeInternalPath } from "../../utils/navigation";

export default function Footer() {
  const { tenant, settings } = useTenant();
  const brandName = settings?.branding?.name || tenant?.name || "El Teflon";
  const showWhatsappFooter = settings?.branding?.footer?.whatsapp_enabled !== false;
  const footerDescription =
    settings?.branding?.footer?.description ||
    "Soluciones integrales en sanitarios y griferia. Calidad y confianza en cada proyecto.";
  const whatsappNumber =
    settings?.branding?.footer?.socials?.whatsapp ||
    settings?.commerce?.whatsapp_number ||
    "";
  const instagramUrl = settings?.branding?.footer?.socials?.instagram || "#";
  const address =
    settings?.branding?.footer?.contact?.address ||
    "Av. Juan B. Justo 1234, Mar del Plata";
  const phone = settings?.branding?.footer?.contact?.phone || "+54 223 123-4567";
  const email =
    settings?.branding?.footer?.contact?.email || "ventas@elteflon.com";
  const quickLinks = settings?.branding?.footer?.quickLinks || [
    { label: "Productos", href: "/catalog" },
    { label: "Sobre nosotros", href: "#" },
  ];
  const resolvedQuickLinks = quickLinks.map((link) => {
    const rawHref = String(link?.href || "").trim();
    const seed = rawHref && rawHref !== "#" ? rawHref : link?.label || "/";
    return {
      ...link,
      href: normalizeInternalPath(seed, "/"),
    };
  });

  const whatsappCleaned = String(whatsappNumber).replace(/\D/g, "");

  const openWhatsapp = () => {
    if (!whatsappCleaned) return;
    window.open(`https://wa.me/${whatsappCleaned}`, "_blank", "noopener,noreferrer");
  };

  return (
    <footer id="contacto" className="bg-[#181411] text-white pt-16 pb-8">
      <div className="mx-auto max-w-[1280px] px-10">
        <div className={`grid grid-cols-1 ${showWhatsappFooter ? "md:grid-cols-4" : "md:grid-cols-3"} gap-12 border-b border-white/10 pb-12 mb-8 text-left`}>
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-primary mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a8 8 0 0 1-10 10Z"></path>
                <path d="M7 21a4 4 0 0 1-4-4"></path>
              </svg>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{brandName}</h2>
            </div>

            <p className="text-white/60 mb-6 leading-relaxed">{footerDescription}</p>

            <div className="flex gap-4">
              {instagramUrl ? (
                <a
                  className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-primary transition-colors"
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Enlaces Rapidos</h4>
            <ul className="space-y-4 text-white/60">
              {resolvedQuickLinks.map((link, idx) => (
                <li key={idx}>
                  <a
                    className="hover:text-primary transition-colors"
                    href={link.href}
                    onClick={(event) => {
                      if (isExternalPath(link.href)) return;
                      event.preventDefault();
                      navigate(link.href);
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Contacto</h4>
            <ul className="space-y-4 text-white/60">
              <li className="flex gap-3 text-left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary shrink-0"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>{address}</span>
              </li>
              <li className="flex gap-3 text-left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{phone}</span>
              </li>
              <li className="flex gap-3 text-left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>{email}</span>
              </li>
            </ul>
          </div>

          {showWhatsappFooter ? (
            <div>
              <h4 className="text-lg font-bold mb-6">Atencion WhatsApp</h4>
              <p className="text-white/60 mb-4">Contactanos directamente para presupuestos rapidos.</p>
              <button
                type="button"
                onClick={openWhatsapp}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#25D366] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                disabled={!whatsappCleaned}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Enviar mensaje
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center text-white/40 text-sm">
          <p>(c) {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
