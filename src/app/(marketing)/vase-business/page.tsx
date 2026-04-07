import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  ChartSpline,
  Globe2,
  Layers3,
  Settings2,
  ShoppingBag,
  Store,
  Workflow,
} from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const pillars: Array<{
  icon: typeof Store;
  title: string;
  body: string;
  phase: string;
  accent?: boolean;
}> = [
  {
    icon: Store,
    title: "Presencia ecommerce",
    body: "Una base visual premium para lanzar rapido, ordenar catalogo y empezar a vender sin partir de cero.",
    phase: "01 Base",
  },
  {
    icon: Workflow,
    title: "Sincronizacion real",
    body: "Pedidos, clientes, catalogo y estados se conectan con tu operacion para que web y gestion hablen el mismo idioma.",
    phase: "02 Sync",
    accent: true,
  },
  {
    icon: Boxes,
    title: "Operacion conectada",
    body: "Stock, procesos internos, automatizaciones y logica comercial listos para crecer sin fragmentacion.",
    phase: "03 Ops",
  },
] as const;

const features = [
  {
    title: "Plantilla editable premium",
    body: "Ideal para negocios que necesitan velocidad, claridad editorial y una base prolija para salir a mercado.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDwvEJDHlKrslOpQa6d_lxepMUOWo9RqunM_FmXhmrNHAUTkHBD2cY4O2YVWy9s04u6usTkxMZyN8lp4f0RZYfcapkSJWejP8vIKHKEV82H6T67lPzR-5zS4CIrqz3cPgAilUIZTYsvrduwVJPbD2cD3NmndYxYyHj51eKQwzuDn1SjBz4N6xdOBaDU-67pq8gHixVvLA3njAzuHgsnBY3FQ2JDDL8PoooNcBfmQnJbzY7m8nS63gKsdvK-chg2wllg82MqD8wK_HM",
  },
  {
    title: "Ecommerce personalizado",
    body: "Para marcas con requerimientos diferenciales de UX, branding, integraciones o recorridos comerciales mas complejos.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDPWSUxYt3yqtLLQ9eKantBi74jA_5AaXdEtiNw8BxlRepbhexOUERXXeZPYhFDtuLuwbZ_E3GBI2RWKWPc_u7nYdCvu3sLeEEx7i3VhhBnkWfIvMkaLu2tF2ixzdQxwyUSDD2Kgdhl6lg2WrLFX8hbLeolO8UWswT_vZs_eWQUOKnNISLOTfeUSm4Dpy2_E_XdRMxXNb8O5gsH9wfNgyk01dbFWs4Fpq0cR67_elc7P3YNlXKMk3BmsmXy6QgECbsQpeRsL1WLEuM",
  },
  {
    title: "Integracion con gestion",
    body: "Pensado para convivir con OpenSystemSoft y otros sistemas de negocio, conectando ecommerce con la realidad operativa.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBNykXDxHm3-ByO4CHlyAJjkhRqqhEpXL5wv2jZUcQcdDTQhiOzHC-uJcHc9y_9GSuAC-3VXO-ErBs6_N3DPiR9brso3bJe47DuO43fBd01ELkgKQAavE-XRMUK4e4b_DndrFhas1so2j0j6R_PzMCLouhK85x3RfOuwTiQUrKtWlG3nNtKIqjvr1JMFHolYMzxsrPfOA3FgEyaVMfAntk932rF-uWB6I8tGuv5RCWEyfkaQAX1U4MP2dpZzbfdbacp9PyNcCdIFjE",
  },
  {
    title: "Chatbots conectados",
    body: "La experiencia comercial puede complementarse con chatbots utiles para responder, asistir clientes y escalar soporte.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACphy1zCiBWGKo9-ZuOTYzMGgcPlIrCf90VQuFijmt76iEvqiRWJc-hhtcchoRFZJu3R6rfMSe87DzeDIr4UpO5c4Lzr0_T5QUD8ahHl14eKXzg4p8b36ImfBWGV3u8KeeWRvqkKyxpyR4HHxPPbgb2rcxs73HjqYApwCI8ldpeDksas9bt8p1tmBWld-WuigzQVdybWydK9UGMP3D63m5sBbUtPshTRlBhDsiNU02YiyyUG0jnuNWRD910DkPMG4vTt-OO-76b0k",
  },
] as const;

const impactItems = [
  {
    icon: ShoppingBag,
    title: "Base gratuita para empezar",
    body: "Puedes crear tu web con una base limitada y validarla rapido antes de pasar a un dominio real y a una operacion mas completa.",
  },
  {
    icon: Settings2,
    title: "Escala sin rehacer todo",
    body: "Vase Business te deja empezar simple y evolucionar a flujos mas avanzados, integraciones profundas o una capa custom cuando el negocio lo pide.",
  },
  {
    icon: Bot,
    title: "Listo para sumar IA",
    body: "La operacion comercial puede crecer junto a automatizaciones y chatbots sin separarse del ecommerce ni de la gestion.",
  },
] as const;

const businessSignals = [
  { label: "Modelo", value: "Multi-sitio con dominio propio" },
  { label: "Integracion", value: "ERP, stock, pedidos y clientes" },
  { label: "Escalabilidad", value: "Base editable + capa custom" },
] as const;

export default function VaseBusinessPage() {
  return (
    <div className="pb-16">
      <ScrollReveal variant="section">
        <section className="relative min-h-[92svh] px-6 py-24 md:px-10 lg:px-12 lg:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,195,126,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(0,109,67,0.05),transparent_30%)]" />
          <div className="relative mx-auto grid w-full max-w-[92rem] grid-cols-1 items-center gap-16 lg:grid-cols-12">
            <div className="space-y-8 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(181,236,200,0.35)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#1c5036]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#18c37e]" />
                Operacion unificada
              </div>

              <h1 className="max-w-3xl text-5xl leading-[1.05] tracking-[-0.06em] text-[#191c1b] sm:text-6xl lg:text-[5.6rem]">
                Un ecosistema para tu{" "}
                <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#006d43]">
                  ecommerce
                </span>{" "}
                y tu operacion real.
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-[#3c4a40] sm:text-xl">
                Vase Business conecta tienda online, gestion, clientes y automatizacion en una sola base.
                Puedes empezar con una plantilla editable premium o avanzar hacia un ecommerce totalmente
                personalizado.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {businessSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-[1.65rem] border border-[rgba(59,99,61,0.12)] bg-white/72 px-4 py-4 shadow-[0_18px_34px_rgba(25,28,27,0.05)] backdrop-blur-xl"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6c7b70]">
                      {signal.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#191c1b]">{signal.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#006d43_0%,#18c37e_100%)] px-8 text-base font-semibold text-white shadow-[0_18px_44px_rgba(0,109,67,0.18)] transition hover:opacity-95"
                >
                  Empezar gratis
                </Link>
                <Link
                  href="/precios"
                  className="group inline-flex items-center gap-2 text-base font-semibold text-[#191c1b] transition hover:opacity-70"
                >
                  Ver planes
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-6">
              <div className="absolute inset-x-[14%] top-[8%] h-[68%] rounded-full bg-[radial-gradient(circle,rgba(24,195,126,0.18)_0%,rgba(24,195,126,0)_72%)] blur-3xl" />
              <div className="relative z-10 translate-x-2 rotate-[2deg] overflow-hidden rounded-[2.5rem] border border-white/70 shadow-[0_28px_70px_rgba(25,28,27,0.1)]">
                <img
                  alt="Dashboard de Vase Business"
                  className="aspect-[4/3] w-full object-cover"
                  src={features[0].image}
                />
              </div>

              <div className="absolute -left-6 top-8 hidden w-60 rounded-[2rem] border border-[rgba(187,202,190,0.24)] bg-white/72 p-5 shadow-[0_20px_50px_rgba(25,28,27,0.08)] backdrop-blur-xl md:block">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#18c37e]/10 text-[#006d43]">
                    <ChartSpline className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Live Sync</p>
                    <p className="text-sm font-semibold text-[#191c1b]">Pedidos y stock</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 rounded-full bg-[#e6e9e7]" />
                  <div className="h-2 w-4/5 rounded-full bg-[#e6e9e7]" />
                  <div className="h-11 rounded-2xl bg-[#18c37e]/10" />
                </div>
              </div>

              <div className="absolute -bottom-8 right-0 hidden w-72 rounded-[2rem] border border-[rgba(187,202,190,0.18)] bg-white p-6 shadow-[0_26px_60px_rgba(25,28,27,0.1)] md:block">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#6c7b70]">
                  Operacion conectada
                </p>
                <div className="flex items-end gap-2">
                  <div className="h-16 w-full rounded-t-xl bg-[#b5ecc8]" />
                  <div className="h-24 w-full rounded-t-xl bg-[#18c37e]" />
                  <div className="h-12 w-full rounded-t-xl bg-[#d8dad9]" />
                  <div className="h-20 w-full rounded-t-xl bg-[#69fdb2]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
        <section className="px-6 py-24 md:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-[92rem]">
            <div className="mb-16 text-center">
              <h2 className="text-4xl tracking-[-0.05em] text-[#191c1b] sm:text-5xl">
                La conexion circular entre{" "}
                <span className="font-[family-name:var(--font-newsreader)] italic font-normal">
                  tienda
                </span>
                , gestion y crecimiento.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[#3c4a40]">
                Vase Business no muestra solo productos. Organiza todo el ciclo desde la venta
                hasta la operacion interna.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-12">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <article
                    key={pillar.title}
                    className={[
                      "rounded-[2.5rem] border border-[rgba(59,99,61,0.08)] p-10 shadow-[0_18px_38px_rgba(25,28,27,0.04)]",
                      pillar.accent
                        ? "bg-white/60 shadow-[0_20px_50px_rgba(25,28,27,0.06)] backdrop-blur-xl md:col-span-4"
                        : "bg-white md:col-span-4",
                    ].join(" ")}
                  >
                    <div className="mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-[#b5ecc8]/55 text-[#006d43]">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#191c1b]">
                      {pillar.title}
                    </h3>
                    <p className="mt-4 leading-relaxed text-[#3c4a40]">{pillar.body}</p>

                    <div className="mt-10 border-t border-[rgba(108,123,112,0.12)] pt-6">
                      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
                        {pillar.phase}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
        <section className="px-6 py-28 md:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-[92rem]">
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-4xl tracking-[-0.05em] text-[#191c1b] sm:text-5xl">
                  Pensado para la{" "}
                  <span className="font-[family-name:var(--font-newsreader)] italic font-normal">
                    complejidad real
                  </span>
                  , simplificado para operar mejor.
                </h2>
              </div>
              <Link
                href="/developers/api"
                className="group inline-flex items-center gap-2 border-b border-[#006d43]/20 pb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#006d43] transition hover:border-[#006d43]"
              >
                Ver integraciones
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className={[
                    "space-y-6 rounded-[2rem] border border-[rgba(59,99,61,0.08)] bg-white p-5 shadow-[0_16px_34px_rgba(25,28,27,0.04)]",
                    index % 2 === 1 ? "lg:mt-12" : "",
                  ].join(" ")}
                >
                  <div className="overflow-hidden rounded-[1.6rem] bg-[#eceeec]">
                    <img
                      alt={feature.title}
                      className="h-52 w-full object-cover transition duration-700 hover:scale-105"
                      src={feature.image}
                    />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#191c1b]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-[#3c4a40]">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
        <section className="bg-[#f8faf8] px-6 py-24 md:px-10 lg:px-12">
          <div className="mx-auto flex w-full max-w-[92rem] flex-col items-center gap-16 lg:flex-row">
            <div className="relative w-full lg:w-1/2">
              <img
                alt="Equipo operando con Vase Business"
                className="relative z-10 aspect-[4/5] w-full rounded-[3rem] object-cover shadow-[0_28px_70px_rgba(25,28,27,0.1)]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_4nnzoa49xXSGSe9FdXT49QeA7tzyQtbk9zV8LHKQTqhw-eBjEghMB2soZ87JyPAK2gJLSzyRzCR1audpLcf3S__R7B_uFp1ZEmHDDDPyYXDJedRN6L-RS76CKuOr4uHgti2nMXsO8mXCSJk0Hor4WCszen1NqoibO2wa_yWC4GulRB79qUj-I3Y7rfq7UrTXT_fwwFtpvNgW1Cg_xugqJQYhUkNzRewwDa7PMNfT-jVO27YqqCPKIysgWyOCAVmh288XgQpiRLk"
              />
              <div className="absolute right-0 top-1/4 h-56 w-56 rounded-full bg-[#18c37e]/14 blur-3xl" />
            </div>

            <div className="w-full space-y-10 lg:w-1/2">
              <h3 className="text-4xl leading-tight tracking-[-0.05em] text-[#191c1b] sm:text-5xl">
                Vos enfocate en tu negocio.
                <br />
                Vase Business ordena la{" "}
                <span className="font-[family-name:var(--font-newsreader)] italic font-normal">
                  mecanica
                </span>
                .
              </h3>

              <div className="space-y-8">
                {impactItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="flex gap-5">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white shadow-sm">
                        <Icon className="size-5 text-[#006d43]" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-[#191c1b]">{item.title}</h4>
                        <p className="mt-2 leading-relaxed text-[#3c4a40]">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
        <section className="px-6 py-28 md:px-10 lg:px-12">
          <div className="relative mx-auto w-full max-w-5xl rounded-[3.5rem] bg-[#006d43] px-8 py-16 text-white shadow-[0_28px_70px_rgba(0,109,67,0.28)] sm:px-12 sm:py-20 lg:px-20">
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-white/10">
                <Layers3 className="size-6" />
              </div>
              <h2 className="text-4xl tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Vase Business para empresas que necesitan vender, integrar y escalar con claridad.
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/78">
                Empieza con una base acelerada o avanza a una implementacion custom. Vase Business
                crece con tu negocio y deja espacio para sumar integraciones, IA y operacion real.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-10 text-base font-bold text-[#006d43] transition hover:bg-[#e6e9e7]"
                >
                  Empezar ahora
                </Link>
                <Link
                  href="/precios"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-8 text-base font-semibold text-white/92 transition hover:bg-white/8"
                >
                  Ver precios
                </Link>
              </div>
            </div>
            <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-[#69fdb2]/18 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-6rem] left-[-2rem] h-72 w-72 rounded-full bg-white/8 blur-3xl" />
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
