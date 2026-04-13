import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { labsPlans, labsTokenPlans, pricingPlans } from "@/config/public-site";

const faqItems = [
  {
    question: "Los valores publicados son fijos?",
    answer:
      "Son los valores base vigentes del esquema comercial actual. En proyectos personalizados o requerimientos extra puede haber un presupuesto complementario.",
  },
  {
    question: "Que incluye el plan base de Vase Business?",
    answer:
      "Incluye plantilla ecommerce lista para usar, panel de administracion, configuracion inicial, hosting por 12 meses y el sistema listo para vender.",
  },
  {
    question: "Que pasa si necesito cambios despues de aprobar el diseno personalizado?",
    answer:
      "Toda modificacion adicional luego de la aprobacion del diseno o una vez iniciada la implementacion se toma como requerimiento extra y se cotiza aparte.",
  },
  {
    question: "Como se cobra Vase Labs?",
    answer:
      "Vase Labs se trabaja por planes. El plan define la capa operativa y el consumo de IA se contempla aparte por tokens.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="pb-24 text-[#191c1b]">
      <ScrollReveal variant="section">
        <section className="mx-auto max-w-[92rem] px-6 pt-24 text-center lg:px-10 lg:pt-32">
          <span className="mb-6 inline-flex rounded-full bg-[#b5ecc8] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#3a6d50] sm:text-xs">
            Planes de Vase
          </span>
          <h1 className="font-[family-name:var(--font-newsreader)] text-5xl leading-[1.08] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            Valores vigentes para <br />
            <span className="italic font-light">Vase Business y Vase Labs.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-[#3c4a40]">
            Vase Business se presenta como base o proyecto personalizado. Vase Labs se presenta por planes mensuales, no por modulos sueltos.
          </p>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section" delay={0.04}>
        <section className="mx-auto mt-16 max-w-[92rem] px-6 lg:px-10">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#6c7b70]">Vase Business</p>
            <h2 className="mt-4 font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em] sm:text-5xl">
              Ecommerce base o proyecto personalizado
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {pricingPlans.map((plan, index) => (
              <article
                key={plan.name}
                className={[
                  "relative flex h-full overflow-hidden rounded-[1.8rem] p-10",
                  index === 0 ? "bg-[#006d43] text-white shadow-2xl" : "border border-[#bbcabe]/15 bg-white/78 backdrop-blur-md",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute right-6 top-6 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                    index === 0 ? "bg-[#18c37e] text-[#004a2c]" : "bg-[#f2f4f2] text-[#3c4a40]",
                  ].join(" ")}
                >
                  {plan.badge}
                </span>

                <div className="relative z-10 flex h-full flex-col">
                  <div className="mb-8">
                    <h3 className="font-[family-name:var(--font-newsreader)] text-3xl italic">{plan.name}</h3>
                    <p className={index === 0 ? "mt-2 text-sm text-white/80" : "mt-2 text-sm text-[#3c4a40]"}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-10">
                    <span className="font-[family-name:var(--font-newsreader)] text-5xl font-bold">{plan.price}</span>
                  </div>

                  <ul className="mb-12 flex-grow space-y-4">
                    {plan.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm">
                        <CheckCircle2 className={["mt-0.5 h-5 w-5 shrink-0", index === 0 ? "text-[#69fdb2]" : "text-[#006d43]"].join(" ")} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={index === 0 ? "/register" : "/demo"}
                    className={[
                      "inline-flex min-h-14 w-full items-center justify-center rounded-full font-bold transition",
                      index === 0 ? "bg-white text-[#006d43] hover:bg-[#f8faf8]" : "border-2 border-[#006d43] text-[#006d43] hover:bg-[#006d43]/5",
                    ].join(" ")}
                  >
                    {index === 0 ? "Quiero la plantilla" : "Quiero un proyecto personalizado"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section" delay={0.06}>
        <section className="mx-auto mt-16 max-w-[92rem] px-6 lg:px-10">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#6c7b70]">Vase Labs</p>
            <h2 className="mt-4 font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em] sm:text-5xl">
              Planes mensuales para IA y automatizacion
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {labsPlans.map((plan, index) => (
              <article
                key={plan.name}
                className={[
                  "rounded-[1.8rem] p-10",
                  index === 0 ? "bg-[#0f3c2f] text-white shadow-2xl" : "border border-[#bbcabe]/15 bg-white/78 backdrop-blur-md",
                ].join(" ")}
              >
                <p
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                    index === 0 ? "bg-[#18c37e] text-[#004a2c]" : "bg-[#eef7f1] text-[#006d43]",
                  ].join(" ")}
                >
                  {plan.badge}
                </p>
                <h3 className="mt-5 font-[family-name:var(--font-newsreader)] text-3xl tracking-[-0.04em]">{plan.name}</h3>
                <p className="mt-4 text-5xl font-semibold tracking-[-0.05em]">{plan.price}</p>
                <p className={index === 0 ? "mt-4 text-sm leading-7 text-white/80" : "mt-4 text-sm leading-7 text-[#3c4a40]"}>
                  {plan.description}
                </p>

                <ul className="mt-8 space-y-4">
                  {plan.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm">
                      <CheckCircle2 className={["mt-0.5 h-5 w-5 shrink-0", index === 0 ? "text-[#69fdb2]" : "text-[#006d43]"].join(" ")} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section" delay={0.08}>
        <section className="mx-auto mt-16 max-w-[92rem] px-6 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[1.8rem] border border-[#bbcabe]/15 bg-white/78 p-10 backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3a6d50]">IA por consumo de tokens</p>
              <h3 className="mt-4 font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em]">Paquetes de consumo</h3>
              <p className="mt-4 text-sm leading-7 text-[#3c4a40]">
                El uso de inteligencia artificial se cobra por tokens. Cada mensaje consume una cantidad variable segun su longitud y complejidad.
              </p>
            </article>

            <div className="grid gap-4 md:grid-cols-3">
              {labsTokenPlans.map((plan) => (
                <article key={plan.name} className="rounded-[1.5rem] border border-[#dfe7e1] bg-[#f8faf8] p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6c7b70]">{plan.name}</p>
                  <p className="mt-3 font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em] text-[#191c1b]">{plan.price}</p>
                  <p className="mt-4 text-sm text-[#3c4a40]">Tokens incluidos: {plan.tokens}</p>
                  <p className="mt-2 text-sm text-[#3c4a40]">Mensajes estimados: {plan.estimatedMessages}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Plan Base: ARS 90.000 / mes", "Plan WhatsApp: ARS 108.000 / mes", "Plan Pro: ARS 158.000 / mes + tokens por consumo"].map((example) => (
              <div key={example} className="rounded-[1.3rem] border border-[#dfe7e1] bg-[#eef7f1] p-5 text-sm font-medium text-[#1f3521]">
                {example}
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
        <section className="mt-28 bg-[#f2f4f2] py-28">
          <div className="mx-auto grid max-w-[92rem] grid-cols-1 gap-16 px-6 md:grid-cols-12 lg:px-10">
            <div className="md:col-span-5">
              <h2 className="font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em] sm:text-5xl">Preguntas frecuentes</h2>
              <p className="mt-6 text-lg leading-relaxed text-[#3c4a40]">
                Lo importante no es solo el precio, sino que estructura necesita hoy tu negocio y como quieres crecer dentro de Vase.
              </p>
            </div>

            <div className="space-y-6 md:col-span-7">
              {faqItems.map((item) => (
                <article key={item.question} className="rounded-[1.3rem] border border-[#bbcabe]/10 bg-[#f8faf8] p-6">
                  <h4 className="font-[family-name:var(--font-newsreader)] text-xl font-semibold">{item.question}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-[#3c4a40]">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
