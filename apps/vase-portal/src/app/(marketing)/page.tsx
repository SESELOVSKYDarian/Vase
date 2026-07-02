import Link from "next/link";
import { ArrowRight, ChartSpline, DatabaseZap, MessageSquareMore, Store } from "lucide-react";
import type { AppLocale } from "@/config/app";
import { buttonStyles } from "@/components/ui/button";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { TestimonialCarousel } from "@/components/marketing/testimonial-carousel";
import LogoLoop from "@/components/ui/logo-loop";
import { UnifiedFeatures } from "@/components/marketing/unified-features";
import { HeroEmphasisFontCycle } from "@/components/marketing/hero-emphasis-font-cycle";
import { SiNextdotjs, SiReact, SiTailwindcss, SiTypescript } from "react-icons/si";

const techLogos = [
  { node: <SiReact />, title: "React", href: "https://react.dev" },
  { node: <SiNextdotjs />, title: "Next.js", href: "https://nextjs.org" },
  { node: <SiTypescript />, title: "TypeScript", href: "https://www.typescriptlang.org" },
  { node: <SiTailwindcss />, title: "Tailwind CSS", href: "https://tailwindcss.com" },
];

const copy = {
  es: {
    heroTitle: "Moderniza tu negocio",
    heroEmphasis: "sin complejidad",
    heroEnding: "",
    heroBody:
      "Vase ayuda a negocios reales a vender, atender y conectar sus sistemas desde una sola plataforma clara, elegante y lista para crecer.",
    primaryCta: "Regístrate gratis",
    secondaryCta: "Iniciar sesión",
    trusted: "Elegido por más de 104 negocios",
    capabilities: "Equipamiento Superior",
    capabilitiesTitle: "Funcionalidades para la era",
    capabilitiesEmphasis: "moderna",
    capabilitiesBody:
      "Herramientas diseñadas para escalar negocios reales con una experiencia fluida e intuitiva, inspirada en lo mejor del diseño mundial.",
    labsTitle: "VaseLabs para atención automatizada y asistencia con IA",
    businessCards: [
      ["Base launch", "Ecommerce plantilla editable"],
      ["Costo adicional", "Ecommerce personalizado"],
      ["API-ready", "Operación conectada"],
    ],
    labsCards: [
      ["Base assist", "Chatbot entrenable"],
      ["Escalamiento", "Derivación a humano"],
      ["Canales", "WhatsApp, web e Instagram"],
    ],
    integrationsBadge: "Integraciones",
    integrationsTitle: "API para conectar con tu gestión actual",
    integrationsBody:
      "Productos, stock, precios, categorías, pedidos y clientes pueden sincronizarse con sistemas existentes sin romper la operación.",
    integrationsPrimary: "Ver API docs",
    integrationsSecondary: "Ver integraciones",
    testimonialsBadge: "Feedback",
    testimonialsTitle: "Confianza en cada",
    testimonialsEmphasis: "clic",
    featureCards: [
      ["Gestión", "Ecommerce Nativo", "Plantillas editables, operación comercial y control claro desde una sola base."],
      ["Datos", "Analítica Profunda", "Métricas útiles para entender ventas, soporte y rendimiento sin ruido innecesario."],
      ["Automatización", "Flujos y Automatización", "Procesos conectados para ahorrar tiempo, reducir fricción y crecer con orden."],
    ],
    testimonials: [
      ["Vase nos ayudó a ordenar ecommerce, atención e integraciones sin sumar una herramienta distinta.", "Elena Rodriguez", "COO en Luxia"],
      ["Lo que más valoro es la claridad visual. Mi equipo entendió el producto rápido y bajó mucha fricción.", "Samuel Park", "Fundador en Nova"],
      ["Las métricas y la capa API nos dieron orden para crecer sin perder control operativo.", "Anais Morel", "Marketing Lead"],
      ["El diseño es impecable y la arquitectura súper robusta. Nunca tuvimos tiempos de inactividad.", "Javier Costa", "CTO en Zenith"],
    ],
  },
  en: {
    heroTitle: "Modernize your business",
    heroEmphasis: "without complexity",
    heroEnding: "",
    heroBody:
      "Vase helps real businesses sell, support and connect their systems from one clear, elegant platform built to scale.",
    primaryCta: "Sign up free",
    secondaryCta: "Log in",
    trusted: "Trusted by 104+ businesses",
    capabilities: "Premium Toolkit",
    capabilitiesTitle: "Features for the",
    capabilitiesEmphasis: "modern era",
    capabilitiesBody:
      "Tools designed to scale real businesses through a clean, fluid and intuitive experience inspired by world-class design.",
    labsTitle: "VaseLabs for automated support and AI assistance",
    businessCards: [
      ["Base launch", "Editable ecommerce template"],
      ["Additional scope", "Custom ecommerce project"],
      ["API-ready", "Connected operations"],
    ],
    labsCards: [
      ["Base assist", "Trainable chatbot"],
      ["Escalation", "Human handoff"],
      ["Channels", "WhatsApp, web and Instagram"],
    ],
    integrationsBadge: "Integraciones",
    integrationsTitle: "API to connect with your current systems",
    integrationsBody:
      "Products, stock, prices, categories, orders and customers can be synced with existing systems without breaking operations.",
    integrationsPrimary: "View API docs",
    integrationsSecondary: "View integrations",
    testimonialsBadge: "Feedback",
    testimonialsTitle: "Trust in every",
    testimonialsEmphasis: "click",
    featureCards: [
      ["Management", "Native Ecommerce", "Editable storefronts, commercial operations and clear control from one foundation."],
      ["Data", "Deep Analytics", "Useful metrics to understand sales, support and performance without extra noise."],
      ["Automation", "Flows and Support", "Connected workflows that save time, reduce friction and help teams scale with order."],
    ],
    testimonials: [
      ["Vase helped us organize ecommerce, support and integrations without adding a different tool for every workflow.", "Elena Rodriguez", "COO at Luxia"],
      ["What I value most is the visual clarity. My team understood the product quickly and that reduced a lot of friction.", "Samuel Park", "Founder at Nova"],
      ["The metrics and API layer gave us the structure to grow without losing operational control.", "Anais Morel", "Marketing Lead"],
      ["The design is flawless and the architecture is robust. We never had any downtime.", "Javier Costa", "CTO at Zenith"],
    ],
  },
} satisfies Record<AppLocale, unknown>;

function Serif({ children, italic = false }: { children: React.ReactNode; italic?: boolean }) {
  return (
    <span className={`font-[family-name:var(--font-newsreader)] ${italic ? "italic font-normal" : "font-medium"}`}>
      {children}
    </span>
  );
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const t = copy[locale];
  const sectionShell = "mx-auto w-full max-w-[92rem] px-6 lg:px-10";

  return (
    <div className="space-y-12 pb-16 lg:space-y-14">
      <section className="relative flex min-h-screen items-center py-24">
        <ScrollReveal className={`relative flex flex-col items-center justify-center text-center ${sectionShell}`}>
          <h1 className="mx-auto max-w-5xl text-balance text-4xl font-semibold tracking-[-0.04em] text-black sm:text-7xl lg:text-[6rem] lg:leading-[1.05]">
            {t.heroTitle} <HeroEmphasisFontCycle text={t.heroEmphasis} />
            {t.heroEnding ? ` ${t.heroEnding}` : null}
          </h1>

          <p className="mt-8 max-w-2xl text-balance text-lg leading-relaxed text-[#555] sm:text-xl">{t.heroBody}</p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className={buttonStyles({
                tone: "primary",
                size: "md",
                className:
                  "h-14 rounded-full bg-[var(--accent)] px-8 text-base font-medium text-white shadow-[0_8px_20px_rgba(59,99,61,0.3)] transition-all hover:bg-[#2d4b2e] hover:shadow-[0_12px_28px_rgba(59,99,61,0.4)]",
              })}
            >
              {t.primaryCta} <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              href="/signin"
              className={buttonStyles({
                tone: "secondary",
                size: "md",
                className:
                  "h-14 rounded-full border border-[rgba(59,99,61,0.15)] bg-white px-8 text-base font-medium text-black shadow-[0_4px_12px_rgba(59,99,61,0.06)] transition-all hover:bg-[#F0F5F1]",
              })}
            >
              {t.secondaryCta}
            </Link>
          </div>
        </ScrollReveal>

      </section>

      <ScrollReveal>
        <section className={sectionShell}>
          <p className="mb-12 text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{t.trusted}</p>
          <div className="relative h-[112px] w-full overflow-hidden text-[#2E5331] sm:h-[124px]">
            <LogoLoop
              logos={techLogos}
              speed={40}
              direction="left"
              logoHeight={58}
              gap={92}
              hoverSpeed={0}
              fadeOut
              fadeOutColor="#EFF3F4"
            />
          </div>
        </section>
      </ScrollReveal>

      <section className={`${sectionShell} space-y-10`}>
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center justify-center">
            <span className="bg-gradient-to-r from-[var(--accent)] to-emerald-600 bg-clip-text text-[11px] font-bold uppercase tracking-[0.2em] text-transparent">
              {t.capabilities}
            </span>
          </div>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-black sm:text-6xl">
            {t.capabilitiesTitle} <Serif italic>{t.capabilitiesEmphasis}</Serif>
          </h2>
          <p className="mt-6 text-xl leading-relaxed text-[#555]">{t.capabilitiesBody}</p>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {t.featureCards.map((item, index) => {
            const Icon = index === 0 ? Store : index === 1 ? ChartSpline : MessageSquareMore;

            return (
              <ScrollReveal key={item[1]} delay={index * 0.1}>
                <article className="group relative min-h-[18rem] overflow-hidden rounded-[2rem] bg-white/84 p-8 shadow-[0_12px_30px_rgba(59,99,61,0.06)] ring-1 ring-[rgba(59,99,61,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(59,99,61,0.12)] lg:h-[21rem] lg:rounded-[2.5rem]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(115,147,116,0.14),transparent_45%)] opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute right-[-2rem] top-[-2rem] size-32 rounded-full bg-[rgba(59,99,61,0.06)] blur-2xl transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-5">
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">{item[0]}</p>
                        <h3 className="max-w-[12ch] text-3xl font-semibold leading-tight tracking-tight text-black">{item[1]}</h3>
                      </div>

                      <div className="grid size-18 shrink-0 place-items-center rounded-[24px] bg-[#F7FAF7] text-[var(--accent)] shadow-[0_12px_24px_rgba(59,99,61,0.08)] ring-1 ring-[rgba(59,99,61,0.08)] transition-all duration-500 group-hover:translate-y-1 group-hover:scale-95">
                        <Icon className="size-7" strokeWidth={1.45} />
                      </div>
                    </div>

                    <div className="mt-auto overflow-hidden rounded-[2rem] bg-[rgba(247,250,247,0.88)] ring-1 ring-[rgba(59,99,61,0.08)] backdrop-blur-sm transition-all duration-500 group-hover:bg-[rgba(245,250,245,0.98)]">
                      <div className="px-6 py-6">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#51605B]">
                            {locale === "es" ? "Ver detalle" : "View detail"}
                          </span>
                          <ArrowRight className="size-4 text-[var(--accent)] transition-transform duration-500 group-hover:translate-x-1" />
                        </div>
                      </div>

                      <div className="grid transition-[grid-template-rows] duration-500 ease-out [grid-template-rows:0fr] group-hover:[grid-template-rows:1fr]">
                        <div className="overflow-hidden">
                          <div className="border-t border-[rgba(59,99,61,0.08)] px-6 pb-7 pt-5">
                            <p className="text-[0.98rem] leading-7 text-[#44514D]">{item[2]}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <div className="-mt-2">
        <UnifiedFeatures locale={locale} t={t} />
      </div>

      <section className={`${sectionShell} mt-14 lg:mt-16`}>
        <div className="grid h-full gap-12 rounded-[3rem] border border-[rgba(59,99,61,0.1)] bg-white p-8 shadow-[0_20px_60px_rgba(59,99,61,0.08)] lg:grid-cols-[1fr_1fr] lg:items-center lg:p-16">
          <ScrollReveal>
            <div className="space-y-8">
              <div className="inline-flex size-16 items-center justify-center rounded-[24px] border border-[rgba(59,99,61,0.05)] bg-[rgba(59,99,61,0.1)] text-[var(--accent)] shadow-sm">
                <DatabaseZap className="size-7" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{t.integrationsBadge}</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-black sm:text-5xl">{t.integrationsTitle}</h2>
                <p className="mt-6 text-lg leading-relaxed text-[#555] xl:text-xl">{t.integrationsBody}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/developers/api"
                  className={buttonStyles({
                    tone: "primary",
                    size: "md",
                    className:
                      "rounded-full bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(59,99,61,0.3)] hover:bg-[#2d4b2e]",
                  })}
                >
                  {t.integrationsPrimary}
                </Link>
                <Link href="/integraciones" className="inline-flex items-center text-sm font-semibold tracking-tight text-black transition-colors hover:text-[var(--accent)]">
                  {t.integrationsSecondary} <ArrowRight className="ml-1 size-4" />
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                locale === "es" ? "ERP y gestión" : "ERP and operations",
                locale === "es" ? "Logística" : "Logistics",
                locale === "es" ? "CRM y atención" : "CRM and support",
                locale === "es" ? "BI y reporting" : "BI and reporting",
              ].map((item) => (
                <div key={item} className="group rounded-3xl border border-[rgba(59,99,61,0.1)] bg-white p-6 shadow-[0_8px_20px_rgba(59,99,61,0.04)] transition-all hover:shadow-[0_16px_32px_rgba(59,99,61,0.08)]">
                  <div className="inline-flex rounded-2xl border border-[rgba(59,99,61,0.05)] bg-[#F5FAF5] p-3 text-[var(--accent)] transition-all duration-300 group-hover:scale-110">
                    <DatabaseZap className="size-5" />
                  </div>
                  <p className="mt-5 text-lg font-medium tracking-tight text-black">{item}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="overflow-hidden">
        <ScrollReveal className={`${sectionShell} text-center`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">{t.testimonialsBadge}</p>
          <h2 className="mt-6 text-5xl font-semibold tracking-[-0.03em] text-black">
            {t.testimonialsTitle} <Serif italic>{t.testimonialsEmphasis}</Serif>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="mt-12 w-full">
          <TestimonialCarousel items={t.testimonials} />
        </ScrollReveal>
      </section>
    </div>
  );
}
