import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { pricingPlans } from "@/config/public-site";

const faqItems = [
  {
    question: "¿Puedo empezar con una base simple y después escalar?",
    answer:
      "Sí. Vase está pensado para que una empresa pueda arrancar con una implementación más liviana y evolucionar a integraciones, automatizaciones o una capa custom cuando lo necesite.",
  },
  {
    question: "¿Los valores son finales?",
    answer:
      "No necesariamente. Los planes publicados sirven como referencia inicial. El alcance real depende de integraciones, complejidad comercial, necesidades de branding y despliegue.",
  },
  {
    question: "¿Vase Labs se contrata por separado?",
    answer:
      "Puede activarse como capa adicional dentro del ecosistema Vase. El mejor camino depende de si tu prioridad hoy es comercio, atención, automatización o una combinación de las tres.",
  },
  {
    question: "¿Incluyen acompañamiento técnico?",
    answer:
      "Sí. Según el alcance, Vase puede incluir onboarding, definición funcional, soporte de integración y acompañamiento para la evolución de la operación.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="pb-24 text-[#191c1b]">
      <ScrollReveal variant="section">
      <section className="mx-auto max-w-[92rem] px-6 pt-24 text-center lg:px-10 lg:pt-32">
        <span className="mb-6 inline-flex rounded-full bg-[#b5ecc8] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#3a6d50] sm:text-xs">
          Planes y escalabilidad
        </span>
        <h1 className="font-[family-name:var(--font-newsreader)] text-5xl leading-[1.08] tracking-[-0.05em] sm:text-7xl lg:text-8xl">
          Planes que acompañan <br />
          <span className="italic font-light">cómo crece tu negocio.</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[#3c4a40]">
          Vase no vende precios aislados del contexto. Propone una base clara para empezar y una
          estructura capaz de crecer hacia más operación, más integraciones y más automatización.
        </p>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section" delay={0.04}>
      <section className="mx-auto mt-16 max-w-[92rem] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <article className="flex h-full flex-col rounded-[1.8rem] border border-[#bbcabe]/15 bg-white/78 p-10 backdrop-blur-md">
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-newsreader)] text-3xl">Base gratuita</h3>
              <p className="mt-2 text-sm text-[#3c4a40]">
                Punto de entrada para validar una presencia inicial y entender cómo encaja Vase en tu operación.
              </p>
            </div>
            <div className="mb-10">
              <span className="font-[family-name:var(--font-newsreader)] text-5xl font-bold">$0</span>
            </div>
            <ul className="mb-12 flex-grow space-y-4">
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006d43]" />
                <span>Base temporal para crear tu web y validar estructura.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006d43]" />
                <span>Opciones limitadas para probar la propuesta sin fricción inicial.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#006d43]" />
                <span>Ventana de activación para conectarla luego a un dominio real.</span>
              </li>
            </ul>
            <Link
              href="/register"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-[#bbcabe] font-semibold text-[#191c1b] transition hover:bg-[#f2f4f2]"
            >
              Empezar gratis
            </Link>
          </article>

          {pricingPlans.map((plan, index) => (
            <article
              key={plan.name}
              className={[
                "relative flex h-full overflow-hidden rounded-[1.8rem] p-10",
                index === 0
                  ? "bg-[#006d43] text-white shadow-2xl"
                  : "border border-[#bbcabe]/15 bg-white/78 backdrop-blur-md",
              ].join(" ")}
            >
              {index === 0 ? (
                <span className="absolute right-6 top-6 rounded-full bg-[#18c37e] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#004a2c]">
                  Recomendado
                </span>
              ) : null}

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
                      <CheckCircle2
                        className={[
                          "mt-0.5 h-5 w-5 shrink-0",
                          index === 0 ? "text-[#69fdb2]" : "text-[#006d43]",
                        ].join(" ")}
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={index === 0 ? "/register" : "/demo"}
                  className={[
                    "inline-flex min-h-14 w-full items-center justify-center rounded-full font-bold transition",
                    index === 0
                      ? "bg-white text-[#006d43] hover:bg-[#f8faf8]"
                      : "border-2 border-[#006d43] text-[#006d43] hover:bg-[#006d43]/5",
                  ].join(" ")}
                >
                  {index === 0 ? "Activar plan" : "Hablar con el equipo"}
                </Link>
              </div>

              {index === 0 ? (
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#18c37e]/20 blur-3xl" />
              ) : null}
            </article>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="mt-28 bg-[#f2f4f2] py-28">
        <div className="mx-auto grid max-w-[92rem] grid-cols-1 gap-16 px-6 md:grid-cols-12 lg:px-10">
          <div className="md:col-span-5">
            <h2 className="font-[family-name:var(--font-newsreader)] text-4xl tracking-[-0.04em] sm:text-5xl">
              Preguntas frecuentes
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#3c4a40]">
              Lo importante no es elegir un precio aislado, sino entender qué estructura necesita hoy
              tu empresa y hacia dónde querés llevarla con Vase.
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

      <ScrollReveal variant="section">
      <section className="mx-auto max-w-[92rem] px-6 py-24 lg:px-10 lg:py-32">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-[#e1e3e1] p-16 text-center">
          <div className="relative z-10">
            <h2 className="font-[family-name:var(--font-newsreader)] text-4xl font-semibold tracking-[-0.03em] sm:text-5xl md:text-6xl">
              ¿Listo para ordenar tu crecimiento?
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-xl text-[#3c4a40]">
              Vase acompaña empresas que necesitan vender mejor, conectar sistemas y sumar inteligencia con lógica de negocio real.
            </p>
            <div className="mt-12 flex flex-col justify-center gap-6 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-[#006d43] px-10 py-4 text-lg font-bold text-white transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                Empezá hoy mismo
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#6c7b70] px-10 py-4 text-lg font-bold text-[#191c1b] transition-colors hover:bg-[#d8dad9]"
              >
                Solicitar demo
              </Link>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
