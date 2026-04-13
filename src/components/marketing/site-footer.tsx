import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";
import { getMarketingChromeCopy } from "@/config/public-site";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { FooterContactModal } from "./footer-contact-modal";

export async function SiteFooter() {
  const locale = await getRequestLocale();
  const copy = getMarketingChromeCopy(locale);

  const labels =
    locale === "es"
      ? {
          eyebrow: "Plataforma global para negocios reales",
          headline: "Vase conecta ecommerce, integraciones e inteligencia aplicada en una sola base operativa.",
          cta: "Contactar",
          product: "Producto",
          resources: "Recursos",
          company: "Compañía",
          legal: "Legal",
          businessNote: "Ecommerce editable, integraciones y crecimiento comercial ordenado.",
          labsNote: "IA, automatización y soporte conversacional para operaciones modernas.",
          apiNote: "Documentación real para conectar sistemas de gestión y procesos de negocio.",
          faq: "Preguntas frecuentes",
          integrations: "Integraciones",
          about: "Nosotros",
          pricing: "Planes",
          signin: "Iniciar sesión",
          register: "Registrarse",
          terms: "Términos",
          privacy: "Privacidad",
          security: "Seguridad",
          follow: "Seguinos",
          rights: "Todos los derechos reservados.",
          contactTitle: "Hablemos de tu negocio",
          contactDescription:
            "Dejanos tu consulta y te respondemos por email con el camino más adecuado para implementar Vase.",
          fullName: "Nombre y apellido",
          emailField: "Email de contacto",
          messageField: "Mensaje",
          close: "Cerrar modal de contacto",
          send: "Enviar consulta",
        }
      : {
          eyebrow: "A global platform for real businesses",
          headline: "Vase connects commerce, integrations and applied intelligence in one operational foundation.",
          cta: "Contact",
          product: "Product",
          resources: "Resources",
          company: "Company",
          legal: "Legal",
          businessNote: "Editable ecommerce, integrations and scalable commercial operations.",
          labsNote: "AI, automation and conversational support for modern operations.",
          apiNote: "Real documentation for connecting management systems and business processes.",
          faq: "FAQ",
          integrations: "Integraciones",
          about: "About",
          pricing: "Pricing",
          signin: "Log in",
          register: "Sign up",
          terms: "Terms",
          privacy: "Privacy",
          security: "Security",
          follow: "Follow",
          rights: "All rights reserved.",
          contactTitle: "Let’s talk about your business",
          contactDescription:
            "Send us your inquiry and we’ll reply by email with the best path to implement Vase.",
          fullName: "Full name",
          emailField: "Contact email",
          messageField: "Message",
          close: "Close contact modal",
          send: "Send inquiry",
        };

  return (
    <footer className="w-full bg-[rgba(255,255,255,0.48)] shadow-[0_24px_70px_rgba(47,48,48,0.06)] ring-1 ring-white/70 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[92rem] px-6 pb-8 pt-10 lg:px-10 lg:pb-10 lg:pt-12">
        <div className="py-6 lg:py-7">
          <div className="grid gap-8 border-b border-black/6 pb-8 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="max-w-2xl space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#739374]">
                {labels.eyebrow}
              </p>
              <h2 className="max-w-xl text-3xl leading-[1.05] tracking-[-0.05em] text-[#000202] sm:text-4xl lg:text-[3.3rem]">
                {labels.headline}
              </h2>
              <p className="max-w-xl text-[0.98rem] leading-7 text-[#2F3030]/72">{copy.footer.tagline}</p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 lg:items-center">
              <FooterContactModal
                buttonLabel={labels.cta}
                title={labels.contactTitle}
                description={labels.contactDescription}
                labels={{
                  fullName: labels.fullName,
                  email: labels.emailField,
                  message: labels.messageField,
                  close: labels.close,
                  submit: labels.send,
                }}
                emailPlaceholder={labels.emailField}
              />
            </div>
          </div>

          <div className="grid gap-8 py-8 lg:grid-cols-[0.95fr_0.8fr_0.8fr_0.7fr]">
            <div className="space-y-5">
              <Link href="/" className="inline-flex items-center gap-3 text-[#000202]" aria-label="Vase">
                <Image
                  src="/vasecolorlogo.png"
                  alt="Vase"
                  width={34}
                  height={34}
                  className="h-[34px] w-[34px] object-contain"
                />
                <span className="text-lg font-semibold tracking-[-0.04em]">Vase</span>
              </Link>
            </div>

            <div className="space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#739374]">
                {labels.product}
              </p>
              <div className="space-y-3 text-sm text-[#2F3030]">
                <Link href="/vase-business" className="group block">
                  <span className="inline-flex items-center gap-1 font-medium text-[#000202]">
                    {copy.nav.business}
                    <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <p className="mt-1 text-[#2F3030]/68">{labels.businessNote}</p>
                </Link>
                <Link href="/vaselabs" className="group block">
                  <span className="inline-flex items-center gap-1 font-medium text-[#000202]">
                    {copy.nav.labs}
                    <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <p className="mt-1 text-[#2F3030]/68">{labels.labsNote}</p>
                </Link>
                <Link href="/developers/api" className="group block">
                  <span className="inline-flex items-center gap-1 font-medium text-[#000202]">
                    API
                    <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <p className="mt-1 text-[#2F3030]/68">{labels.apiNote}</p>
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#739374]">
                  {labels.resources}
                </p>
                <div className="flex flex-col gap-2 text-sm text-[#2F3030]">
                  <Link href="/" className="transition hover:text-[#3B633D]">
                    {copy.nav.home}
                  </Link>
                  <Link href="/integraciones" className="transition hover:text-[#3B633D]">
                    {labels.integrations}
                  </Link>
                  <Link href="/preguntas-frecuentes" className="transition hover:text-[#3B633D]">
                    {labels.faq}
                  </Link>
                  <Link href="/precios" className="transition hover:text-[#3B633D]">
                    {labels.pricing}
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#739374]">
                  {labels.company}
                </p>
                <div className="flex flex-col gap-2 text-sm text-[#2F3030]">
                  <Link href="/que-es-vase" className="transition hover:text-[#3B633D]">
                    {labels.about}
                  </Link>
                  <Link href="/signin" className="transition hover:text-[#3B633D]">
                    {labels.signin}
                  </Link>
                  <Link href="/register" className="transition hover:text-[#3B633D]">
                    {labels.register}
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#739374]">
                {labels.legal}
              </p>
              <div className="flex flex-col gap-2 text-sm text-[#2F3030]">
                <Link href={"/terminos-y-condiciones" as Route} className="transition hover:text-[#3B633D]">
                  {labels.terms}
                </Link>
                <Link href={"/politica-de-privacidad" as Route} className="transition hover:text-[#3B633D]">
                  {labels.privacy}
                </Link>
                <Link href={"/seguridad" as Route} className="transition hover:text-[#3B633D]">
                  {labels.security}
                </Link>
              </div>

              <div className="space-y-3 pt-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#739374]">
                  {labels.follow}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-[#2F3030] transition hover:bg-white hover:text-[#3B633D]"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-[#2F3030] transition hover:bg-white hover:text-[#3B633D]"
                  >
                    LinkedIn
                  </a>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-[#2F3030] transition hover:bg-white hover:text-[#3B633D]"
                  >
                    X
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-black/6 pt-6 text-sm text-[#2F3030]/70 md:flex-row md:items-center md:justify-between">
            <p>© 2026 Vase. {labels.rights}</p>
            <p>{copy.footer.site}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
