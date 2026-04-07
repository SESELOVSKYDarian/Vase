import Link from "next/link";
import { ArrowRight, Sparkles, Bolt, Globe2, Brain } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { AboutSectionNav } from "@/components/marketing/about-section-nav";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const content = {
  en: {
    nav: ["Our story", "Mission", "Philosophy", "Team"],
    heroTitleA: "Vase began as ",
    heroTitleB: "a shared idea",
    heroTitleC: " between two friends who wanted to build together.",
    heroBody:
      "What started in technical school is now growing into a platform that aims to become a global technology standard for companies.",
    genesisEyebrow: "The beginning",
    genesisTitle: "From a school project to a real technology vision.",
    genesisParagraphs: [
      "Vase started as an idea between two friends while they were studying at a technical school. They wanted to build something together, and the name came from combining the first letters of their last names.",
      "From there, working alongside OpenSystemSoft and its management system, they began connecting clients with custom ecommerce projects and chatbots for those businesses. That early collaboration became the foundation for a larger technological ambition.",
    ],
    genesisCta: "See our technology direction",
    philosophyTitle: "Why Vase exists",
    philosophyBody:
      "Vase exists to connect ecommerce, management, clients and AI in one clear ecosystem that companies can rely on today and scale globally tomorrow.",
    bento: [
      {
        title: "Born from real work",
        body: "Vase did not emerge from theory alone. It grew through real implementations, practical collaboration and business needs that demanded better digital operations.",
        tone: "wide",
      },
      {
        title: "Commerce + operations",
        body: "Working with OpenSystemSoft shaped a clear challenge for Vase: connecting management systems with custom ecommerce without breaking operations.",
        tone: "accent",
      },
      {
        title: "Useful AI",
        body: "The chatbot layer is not decorative. It is part of the core vision: helping companies respond better, assist clients faster and scale support through useful automation.",
        tone: "square",
      },
      {
        title: "Global standard",
        body: "Vase aims to become a technology standard for companies that need commerce, integration and intelligence in one place.",
        tone: "split",
      },
    ],
    teamTitle: "The people behind Vase",
    teamBody:
      "What began between two friends now grows through product, engineering and operational vision focused on building technology companies can adopt at scale.",
    team: [
      ["Founding team", "Origin and product vision"],
      ["Engineering", "Platform and integrations"],
      ["Operations", "Implementation, deployment and scale"],
      ["Design", "Experience and clarity"],
    ],
    ctaTitle: "Build what comes next.",
    ctaBody:
      "If your company needs ecommerce, integrations and AI connected by real business logic, Vase is building that future.",
    ctaPrimary: "Get started",
    ctaSecondary: "View pricing",
  },
  es: {
    nav: ["Nuestra historia", "Misión", "Filosofía", "Equipo"],
    heroTitleA: "Vase nació como ",
    heroTitleB: "una idea compartida",
    heroTitleC: " entre dos amigos que querían construir juntos.",
    heroBody:
      "Lo que empezó en una técnica hoy busca convertirse en un estándar tecnológico global para las empresas.",
    genesisEyebrow: "El origen",
    genesisTitle: "De un trabajo entre amigos a una visión tecnológica real.",
    genesisParagraphs: [
      "Vase salió de una idea entre dos amigos mientras estudiaban en una técnica. Querían hacer un trabajo juntos, y el nombre apareció al unir las letras iniciales de sus apellidos.",
      "Desde ahí, junto con OpenSystemSoft y su sistema de gestión, comenzaron a conectar clientes con ecommerce personalizados y a desarrollar chatbots para esas empresas. Esa primera colaboración fue el punto de partida para una ambición tecnológica mucho más grande.",
    ],
    genesisCta: "Conocer nuestra dirección tecnológica",
    philosophyTitle: "Por qué existe Vase",
    philosophyBody:
      "Vase existe para conectar ecommerce, gestión, clientes e IA en un ecosistema claro que las empresas puedan usar hoy a nivel local y adoptar mañana a escala global.",
    bento: [
      {
        title: "Nacido del trabajo real",
        body: "Vase no se pensó desde la teoría. Creció a partir de implementaciones concretas, colaboración real y necesidades operativas de empresas que necesitaban mejorar su entorno digital.",
        tone: "wide",
      },
      {
        title: "Comercio + operación",
        body: "Al trabajar con OpenSystemSoft, Vase fue tomando forma alrededor de un desafío claro: conectar sistemas de gestión con ecommerce personalizados sin romper la operación.",
        tone: "accent",
      },
      {
        title: "IA con utilidad",
        body: "La capa de chatbots no es un agregado superficial. Es parte central de la visión: ayudar a las empresas a responder mejor, asistir clientes y escalar soporte con automatización útil.",
        tone: "square",
      },
      {
        title: "Estándar global",
        body: "La meta de Vase va más allá de una implementación puntual. Busca convertirse en un estándar tecnológico para empresas que necesitan comercio, integración e inteligencia en un mismo lugar.",
        tone: "split",
      },
    ],
    teamTitle: "Quiénes impulsan Vase",
    teamBody:
      "Lo que empezó entre dos amigos hoy crece con producto, ingeniería y visión operativa para construir tecnología que las empresas puedan adoptar a escala.",
    team: [
      ["Equipo fundador", "Origen y visión de producto"],
      ["Ingeniería", "Plataforma e integraciones"],
      ["Operaciones", "Implementación y escalabilidad"],
      ["Diseño", "Experiencia y claridad"],
    ],
    ctaTitle: "Construyamos lo que sigue.",
    ctaBody:
      "Si tu empresa necesita ecommerce, integraciones e IA conectados con lógica de negocio real, Vase está construyendo ese futuro.",
    ctaPrimary: "Empezar ahora",
    ctaSecondary: "Ver planes",
  },
} as const;

const portraitImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMn_FCy7Q6syZfdCrb8lTGubFRZ0t95ND2GqTOw-dx9Qxh-MeXwe7JQ3HHpMiOfvVhCK6cz-QWs29Ey2dDCx0sDfDxf-nQjQF4S-mmUBQnahsiwBMAHzb2apepaz3B1_r9wuMbzEMkfgcx4qsB8jeti71x_-eoMNc6X0NJ6F2lJ6iLT39SwI3wZNS0kUJusguqk8yUDEiPXmU58ZPKOhJ_Iuh4UKWgZUYN70TY90tEiLwg6d-ogbIdEX96L42ADPFKVxBRQdufZPM",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCtxI9u7zQjwO0oGeFG44UCJbHurAjEvuCqWsqMGv7Q4fbyNAkjRb_2Ds04jbSp9SANP-_obuoPShrIvHEPQLcNYzEW9FZ4JP6N5OOWIZYXUUU4yFKxmQ91ww7geC9Dp-DU5tlw5eq340YqpdSBbSImpSZoHFHIpnKqZqnjTNNa860JxLDHJp6NUih_sDScI4xARKdJ_cS6hkOY6W1dV5dOYvLXrMAN8Iywtcare3Z4lvpwnympCseCIFn5gMC7fGJSc-MxJB686DY",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCZGQkLq_LxvQVAeM-ZfnstUEny7iK2n5HMfk7zr3h2FFnnN-G9cpybdAxIbExiBMIRJYagyUv9_THLfE5EAyEpeQERcRqkcPm6-UUtozWpDpdDgkEZy4aVbATQnx_Bd1TGpt0ImxER-4y7lKs4O59pitAXqYAIWlWYZYBCd7I6a_kLdaDkX8ZDY4jUw5B3VqJCwrCo3yXj85JXqN5KtAulMyRzI31fF9DHPcXl_XYvewbg7nCdaK979rH8HDdu-Gu9zJ2VFY9SCsI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCFxrM_ex5pmHaxtS-CvNXn6kUmV9bbo9LTllfIhacSLOW6aeNaJirI4iGrSQJ6daONi06AM3JL3GtX5iYiby1dkTBJof9m4szpvccnhvVA7bgAil9jBapUuTaWVEE1ksVt77fPTWQPwYuD4ktvbLJxXOpTrv1mn8Lj9pwOsVWSe7tsG6lDrbMhBDb0VHGGnodHeudtQBYwaur5btBRyp_vxgpcfeHy4T070L3SXzZR3FWeVcpg4eWezWiuMPMNDbOSSTLKsysMeG4",
] as const;

export default async function WhatIsVasePage() {
  const locale = await getRequestLocale();
  const t = content[locale];

  return (
    <div className="flex flex-col gap-0 pb-12">
      <AboutSectionNav
        items={[
          { id: "mision", label: t.nav[1] },
          { id: "historia", label: t.nav[0] },
          { id: "filosofia", label: t.nav[2] },
          { id: "equipo", label: t.nav[3] },
        ]}
      />

      <ScrollReveal variant="section">
      <section className="mx-auto w-full max-w-[96rem] px-6 pt-44 lg:px-12 lg:pt-52">
        <div className="mb-10 hidden justify-center md:flex">
          <div className="h-12" aria-hidden="true" />
        </div>

        <div id="mision" className="grid grid-cols-12 gap-8 scroll-mt-40">
          <div className="col-span-12 lg:col-span-9">
            <h1 className="max-w-6xl text-6xl font-light leading-[0.95] tracking-[-0.07em] text-[#191c1b] sm:text-7xl lg:text-[6.8rem]">
              {t.heroTitleA}
              <span className="font-[family-name:var(--font-newsreader)] italic font-normal">{t.heroTitleB}</span>
              {t.heroTitleC}
            </h1>
          </div>
          <div className="col-span-12 flex items-end lg:col-span-3">
            <p className="max-w-xs text-lg leading-relaxed text-[#3c4a40]">{t.heroBody}</p>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section id="historia" className="mt-24 scroll-mt-40 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto grid max-w-[96rem] grid-cols-1 items-center gap-20 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <div className="relative z-10 aspect-[4/5] overflow-hidden rounded-xl shadow-[0_32px_80px_rgba(25,28,27,0.12)]">
              <img
                className="h-full w-full object-cover"
                alt="Minimal vase in studio"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAF-OS-Y9fzZQDq1X1da4RAOgWVlKFdqglXL4sOsYnZW3cxh8ICxGqrkqpgI6czPT4jFepp9NYRGWBu-CQPKWnLPMrWjHZr5eW1XK8HJd9Ma8OSWZiKZp1hWqCfjdXwN7HqBkqnso4mnI9VhiQTQrUzh07k_EaTtZ_Et8T2Sf09YNdLFW3-pkmFxXZOALmH9oojVhT7FqJvfh7i83802ZCQsVShYBG9r6eVVn7eiTiXBZq2Rf61bXI4iopMXAtK8-V3leJgj9ooql0"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 -z-10 h-64 w-64 rounded-full bg-[#18c37e]/10 blur-3xl" />
          </div>

          <div className="flex flex-col justify-center lg:col-span-5">
            <span className="mb-6 text-sm font-bold uppercase tracking-[0.24em] text-[#006d43]">{t.genesisEyebrow}</span>
            <h2 className="mb-8 text-4xl leading-tight tracking-[-0.05em] text-[#191c1b] sm:text-5xl">{t.genesisTitle}</h2>
            <div className="space-y-6 text-lg leading-relaxed text-[#3c4a40]">
              {t.genesisParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <Link href="/developers/api" className="group inline-flex items-center font-semibold text-[#006d43]">
                {t.genesisCta}
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section id="filosofia" className="mx-auto w-full max-w-[96rem] scroll-mt-40 px-6 py-32 lg:px-12 lg:py-40">
        <div className="mb-20 max-w-2xl">
          <h2 className="mb-6 text-5xl tracking-[-0.06em] text-[#191c1b] sm:text-6xl">{t.philosophyTitle}</h2>
          <p className="text-xl leading-relaxed text-[#3c4a40]">{t.philosophyBody}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="flex aspect-video flex-col justify-between rounded-xl border border-[rgba(108,123,112,0.15)] bg-white p-12 md:col-span-2 md:aspect-auto">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#18c37e]/10 text-[#006d43]">
                <Sparkles className="size-5" />
              </div>
              <h3 className="mb-4 text-3xl tracking-[-0.04em] text-[#191c1b]">{t.bento[0].title}</h3>
              <p className="max-w-md leading-relaxed text-[#3c4a40]">{t.bento[0].body}</p>
            </div>
            <div className="mt-12 self-start rounded-lg border border-[rgba(108,123,112,0.12)] bg-[#f8faf8] p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-2 w-8 rounded-full bg-[#18c37e]" />
                <div className="h-2 w-24 rounded-full bg-[#e6e9e7]" />
              </div>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-xl bg-[#006d43] p-12 text-white">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <Bolt className="size-5" />
              </div>
              <h3 className="mb-4 text-3xl tracking-[-0.04em]">{t.bento[1].title}</h3>
              <p className="leading-relaxed text-white/80">{t.bento[1].body}</p>
            </div>
            <div className="flex items-end justify-between font-[family-name:var(--font-newsreader)] text-5xl italic opacity-30">
              <span>0.02s</span>
              <Bolt className="size-9" />
            </div>
          </article>

          <article className="aspect-square rounded-xl bg-[rgba(242,244,242,0.92)] p-12">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#191c1b]/5 text-[#191c1b]">
              <Brain className="size-5" />
            </div>
            <h3 className="mb-4 text-3xl tracking-[-0.04em] text-[#191c1b]">{t.bento[2].title}</h3>
            <p className="leading-relaxed text-[#3c4a40]">{t.bento[2].body}</p>
          </article>

          <article className="overflow-hidden rounded-xl border border-[rgba(108,123,112,0.15)] bg-white md:col-span-2">
            <div className="grid h-full grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col justify-center p-12">
                <h3 className="mb-4 text-3xl tracking-[-0.04em] text-[#191c1b]">{t.bento[3].title}</h3>
                <p className="leading-relaxed text-[#3c4a40]">{t.bento[3].body}</p>
              </div>
              <div className="relative min-h-[300px] bg-[#e6e9e7]">
                <div className="absolute inset-0 opacity-40 grayscale transition-all duration-700 hover:grayscale-0">
                  <img
                    className="h-full w-full object-cover"
                    alt="Architectural minimal building"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCovBA8nk_ZYGm1bj5TFIpGEMLt-YwraBhnZcMZQAMGM1_3yKbeBPYWByLhxQTMDh3UBZN9sfsrKiBc6AMJq70ea03Ot27DUY9X7lPHfaf_oRMjaIkRre7uELGDe5dwC_DGwGF78SfTUnodrTp1puS6LWnXQbiD5p7dd6DH2eTCYRtdvfZs3tj454DRPKYFtqZR9KQxpYd3GhQJ-yWdQLJkMWWQLQogpRAj2mxZd88-aC9ofG3bZ1WJtK3obl7Tb3VxUJt7VT7gApM"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/80 shadow-xl backdrop-blur-md">
                    <Globe2 className="size-8 text-[#006d43]" />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section id="equipo" className="mx-auto w-full max-w-[96rem] scroll-mt-40 px-6 py-24 lg:px-12 lg:py-32">
        <div className="mb-20 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-5xl tracking-[-0.06em] text-[#191c1b] sm:text-6xl">{t.teamTitle}</h2>
          <p className="max-w-sm text-lg leading-relaxed text-[#3c4a40]">{t.teamBody}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-16 md:grid-cols-4">
          {t.team.map((member, index) => (
            <article key={member[0]} className={`space-y-6 group ${index % 2 === 1 ? "mt-12 md:mt-0" : ""}`}>
              <div className="aspect-square overflow-hidden rounded-xl bg-[#eceeec]">
                <img
                  className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                  alt={member[0]}
                  src={portraitImages[index]}
                />
              </div>
              <div>
                <h4 className="text-2xl tracking-[-0.04em] text-[#191c1b]">{member[0]}</h4>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-[#006d43]">{member[1]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="bg-[#f8faf8] px-6 py-32 text-center lg:px-12 lg:py-40">
        <div className="mx-auto max-w-4xl space-y-12">
          <h2 className="text-6xl italic tracking-[-0.06em] text-[#191c1b] md:text-8xl">{t.ctaTitle}</h2>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[#3c4a40]">{t.ctaBody}</p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row sm:gap-8">
            <Link
              href="/register"
              className="inline-flex rounded-full bg-[#006d43] px-12 py-5 text-lg font-bold text-white shadow-xl shadow-[#006d43]/20 transition-transform duration-300 hover:scale-105"
            >
              {t.ctaPrimary}
            </Link>
            <Link href="/precios" className="group inline-flex items-center text-lg font-semibold text-[#191c1b]">
              {t.ctaSecondary}
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
