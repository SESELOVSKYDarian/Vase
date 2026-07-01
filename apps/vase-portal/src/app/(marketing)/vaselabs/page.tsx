import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  LayoutDashboard,
  MessageCircleMore,
  MessagesSquare,
  Orbit,
  Sparkles,
  Workflow,
} from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const channelCards: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
  accent?: boolean;
}> = [
  {
    title: "WhatsApp, Instagram y Facebook",
    body: "Centralizá la atención en una sola lógica conversacional para responder, derivar y vender con criterio.",
    icon: MessageCircleMore,
  },
  {
    title: "Sincronización inmediata",
    body: "Cada ajuste de tono, flujo o automatización impacta en todos los canales sin tiempos muertos ni reconfiguraciones manuales.",
    icon: Orbit,
    accent: true,
  },
] as const;

const platformFeatures = [
  {
    title: "Panel unificado",
    body: "Un centro de control para revisar conversaciones, respuestas, métricas y automatizaciones sin abrir veinte herramientas distintas.",
    icon: LayoutDashboard,
  },
  {
    title: "Automatización con criterio",
    body: "Clasificá consultas, resumí conversaciones y dispará acciones útiles sin perder contexto comercial ni operativo.",
    icon: Workflow,
  },
  {
    title: "IA aplicada a negocio",
    body: "Vase Labs no se vende como humo. Se diseña para ayudar a vender mejor, responder más rápido y ordenar trabajo real.",
    icon: BrainCircuit,
  },
  {
    title: "Métricas accionables",
    body: "Seguí leads, tiempos de respuesta, conversiones y señales de intención para mejorar el desempeño del equipo.",
    icon: BarChart3,
  },
];

const outcomes = [
  "Calificación automática de leads",
  "Historial de conversaciones en tiempo real",
  "Integración con CRM, ecommerce o gestión",
] as const;

const leadRows = [
  { initials: "JD", name: "Juliana Díaz", source: "Instagram Direct", status: "Calificando", tone: "text-[#006d43]" },
  { initials: "MR", name: "Marcos Rivas", source: "WhatsApp Business", status: "Convertido", tone: "text-[#006d43]" },
  { initials: "SL", name: "Sofía López", source: "Facebook Messenger", status: "En espera", tone: "text-[#36684c]" },
] as const;

export default function VaseLabsPage() {
  return (
    <div className="overflow-x-hidden pb-16">
      <ScrollReveal variant="section">
      <section className="relative min-h-[92svh] px-6 py-24 md:px-10 lg:px-12 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(24,195,126,0.08),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(0,109,67,0.05),transparent_28%)]" />

        <div className="relative mx-auto grid w-full max-w-[92rem] grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(181,236,200,0.36)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#1c5036]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#18c37e]" />
              Automatización inteligente
            </span>

            <h1 className="max-w-3xl text-5xl leading-[1.04] tracking-[-0.06em] text-[#191c1b] sm:text-6xl lg:text-[5.5rem]">
              Conversaciones que <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#006d43]">sí convierten</span>.
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-[#3c4a40] sm:text-xl">
              Vase Labs crea chatbots y flujos inteligentes para WhatsApp, Instagram y Facebook. Automatizá atención,
              ventas y seguimiento sin perder el toque humano ni el control operativo.
            </p>

            <div className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#006d43_0%,#18c37e_100%)] px-8 text-base font-semibold text-white shadow-[0_18px_44px_rgba(0,109,67,0.18)] transition hover:opacity-95"
              >
                Empezá hoy mismo
              </Link>
              <Link
                href="/demo"
                className="group inline-flex items-center gap-2 text-base font-semibold text-[#191c1b] transition hover:opacity-70"
              >
                Ver demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="relative z-10 rounded-[2.8rem] border border-[rgba(187,202,190,0.16)] bg-white p-4 shadow-[0_28px_70px_rgba(25,28,27,0.08)]">
              <img
                alt="Interfaz móvil de Vase Labs"
                className="h-[38rem] w-full rounded-[2.3rem] object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTbbiVU6_YJzu8uexsYGJtg9B3FODznbyex2Uf-1QobluqHdwoxi9ov0FxgZbzrts0bXJ4zHvurQANC7aCnAZeHzyYtLTtC17FRxvpESk_V1aQnotGMwBWiIxqL7qjrCPZDCqZ2_WOpf0QBrjjYaXafC0c9L6dBXmHcSOTzW1rfm5jm1n7fecXT4JlYPwk0_A2rNou0xLu5E9eYg58zcKNu42j2bzUz8y55aAVfOtLB40rFYOb0-fW7lZfIAPKfKNOCQK8rZvIsWY"
              />
            </div>

            <div className="absolute -left-10 top-1/4 hidden max-w-[15rem] rounded-[1.8rem] border border-white/20 bg-white/78 p-5 shadow-[0_20px_50px_rgba(25,28,27,0.08)] backdrop-blur-xl md:block">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#18c37e]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Respuesta en vivo</span>
              </div>
              <p className="text-sm font-medium italic text-[#191c1b]">
                &quot;El bot tomó el lead y lo ordenó en 2 segundos.&quot;
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-16 -right-12 h-72 w-72 rounded-full bg-[#18c37e]/10 blur-3xl" />
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="bg-[#f2f4f2] px-6 py-28 md:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-[92rem]">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-4xl tracking-[-0.05em] text-[#191c1b] sm:text-5xl">Control unificado</h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#3c4a40]">
              Un solo centro para ver conversaciones, medir resultados y ajustar tu automatización sin salir de contexto.
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-[rgba(187,202,190,0.12)] bg-white p-8 shadow-[0_24px_48px_rgba(25,28,27,0.04)]">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-6 border-b border-[rgba(108,123,112,0.1)] pb-8 lg:col-span-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                <div className="space-y-2">
                  <div className="h-8 rounded-xl bg-[#e6e9e7]" />
                  <div className="h-8 w-3/4 rounded-xl bg-[#eceeec]" />
                  <div className="h-8 rounded-xl bg-[#eceeec]" />
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3 text-[#006d43]">
                    <LayoutDashboard className="size-5" />
                    <span className="text-sm font-bold">Dashboard</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#191c1b]/45">
                    <MessagesSquare className="size-5" />
                    <span className="text-sm font-bold">Conversaciones</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#191c1b]/45">
                    <Sparkles className="size-5" />
                    <span className="text-sm font-bold">Automatizaciones</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 lg:col-span-9">
                <div className="grid gap-5 md:grid-cols-3">
                  <div className="rounded-[1.6rem] border border-[#18c37e]/10 bg-[#18c37e]/6 p-6">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#006d43]">Leads totales</p>
                    <p className="text-3xl tracking-[-0.04em] text-[#191c1b]">12.842</p>
                  </div>
                  <div className="rounded-[1.6rem] bg-[#f2f4f2] p-6">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Bots activos</p>
                    <p className="text-3xl tracking-[-0.04em] text-[#191c1b]">3</p>
                  </div>
                  <div className="rounded-[1.6rem] bg-[#f2f4f2] p-6">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7b70]">Conversión</p>
                    <p className="text-3xl tracking-[-0.04em] text-[#191c1b]">24,8%</p>
                  </div>
                </div>

                <img
                  alt="Dashboard de Vase Labs"
                  className="h-[25rem] w-full rounded-[1.8rem] border border-[rgba(187,202,190,0.12)] object-cover shadow-inner"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpL9z1l8-dVaXbGMnfFHj2iAfmnhiy2N5HBVnLcUeSXSmVW3cIiOEmZCQi8dCOspGrgv0bvABFf310S8_6DRFlc_to9JKLAK1-tLkYEu8Do46BZQw_ZLq11UoP-q9251csOI7SPxEi_fSH1crJVAxzgEUg-I6DC7y-aGzNLXwXOUCG8THev5IKEJZnvwxGTuyaF0nAku_Xsc8SWGiPBUKOQrMCC5mkZOIR3ylmSdaKYW36ZiSeXI_Y2m3iUMQP5dgp9VXpaeGk4uA"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="px-6 py-28 md:px-10 lg:px-12">
        <div className="mx-auto grid w-full max-w-[92rem] gap-8 md:grid-cols-3">
          {channelCards.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className={[
                  "flex flex-col justify-between rounded-[2rem] p-10",
                  item.accent
                    ? "bg-[#006d43] text-white md:col-span-1"
                    : "border border-[rgba(187,202,190,0.12)] bg-white shadow-sm md:col-span-2",
                ].join(" ")}
              >
                <div>
                  <div className="mb-8 flex gap-4">
                    {index === 0 ? (
                      <>
                        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#25D366]/10 text-[#25D366]">
                          <MessagesSquare className="size-5" />
                        </div>
                        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#E1306C]/10 text-[#E1306C]">
                          <Sparkles className="size-5" />
                        </div>
                        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
                          <Bot className="size-5" />
                        </div>
                      </>
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10">
                        <Icon className="size-6" />
                      </div>
                    )}
                  </div>

                  <h3 className={item.accent ? "text-3xl tracking-[-0.04em]" : "text-4xl tracking-[-0.05em] text-[#191c1b]"}>
                    {item.title}
                  </h3>
                  <p className={item.accent ? "mt-4 leading-relaxed text-white/78" : "mt-4 max-w-md leading-relaxed text-[#3c4a40]"}>
                    {item.body}
                  </p>
                </div>

                {!item.accent && (
                  <div className="mt-12 overflow-hidden rounded-[1.4rem]">
                    <img
                      alt="Visual de conectividad"
                      className="h-48 w-full object-cover transition duration-700 hover:scale-105"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEYgDGcNZcE52-BOxLon3ju99K-qcGkHO04UETDqPn9NhcXm1MTVvT69ZKZR317Y3x4Cv-Uqwhh6YyS0IwzkvdXZ9JA2qy4szrmHKGRf_WOMR49VvPfRh44IYbE9Fu5CHoQ1PT9616-c10h4qD3qrBhOeMn10BqECBjGYsc9OCFOBpMr6WQt2CGPslog6T-pzwxQ29Vpy9ywGioKMn5kOdw1N9lGz6bIVJ6FY-WKTTEpCTMN1swxwJzCjICcWOuoP8LrAJuvbRL0g"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="bg-[#f8faf8] px-6 py-28 md:px-10 lg:px-12">
        <div className="mx-auto grid w-full max-w-[92rem] items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-[2.3rem] border border-[rgba(187,202,190,0.14)] bg-white shadow-[0_24px_52px_rgba(25,28,27,0.08)]">
              <div className="flex items-center justify-between border-b border-[rgba(108,123,112,0.08)] bg-[#f2f4f2] px-8 py-6">
                <h4 className="text-sm font-bold text-[#191c1b]">Historial de nuevos leads</h4>
                <span className="rounded-full bg-[#18c37e]/14 px-3 py-1 text-xs font-bold text-[#006d43]">+12% esta semana</span>
              </div>

              <div className="space-y-6 p-8">
                {leadRows.map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eceeec] text-xs font-bold text-[#191c1b]">
                        {row.initials}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#191c1b]">{row.name}</p>
                        <p className="text-xs text-[#6c7b70]">vía {row.source}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-[0.18em] ${row.tone}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 space-y-8 lg:order-2">
            <h2 className="text-4xl leading-tight tracking-[-0.05em] text-[#191c1b] sm:text-5xl">
              Crecimiento guiado por <span className="font-[family-name:var(--font-newsreader)] italic font-normal">datos</span>.
            </h2>
            <p className="text-xl leading-relaxed text-[#3c4a40]">
              Vase Labs no solo responde. También mide. Cada conversación se transforma en señales que ayudan a entender mejor el recorrido de tus clientes, desde el primer mensaje hasta la compra.
            </p>

            <ul className="space-y-4">
              {outcomes.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[#191c1b]">
                  <CheckCircle2 className="size-5 text-[#006d43]" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="px-6 py-28 md:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[3.2rem] bg-[#18c37e] px-8 py-16 text-[#004a2c] shadow-[0_28px_70px_rgba(24,195,126,0.24)] sm:px-12 sm:py-20 lg:px-20">
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-white/24">
              <Bot className="size-6" />
            </div>
            <h2 className="text-4xl tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              ¿Listo para automatizar sin perder humanidad?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#004a2c]/82">
              Sumá una capa conversacional que ayude a vender, responder y ordenar mejor tu operación. Vase Labs está pensado para crecer junto a tu negocio, no para reemplazarlo sin criterio.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#191c1b] px-10 text-base font-bold text-white transition hover:opacity-94"
              >
                Empezá hoy mismo
              </Link>
              <Link
                href="/demo"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#004a2c]/14 px-8 text-base font-semibold text-[#004a2c] transition hover:bg-white/18"
              >
                Solicitar demo
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-white/18 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-6rem] left-[-2rem] h-72 w-72 rounded-full bg-[#69fdb2]/18 blur-3xl" />
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="px-6 pb-8 md:px-10 lg:px-12">
        <div className="mx-auto grid w-full max-w-[92rem] gap-6 md:grid-cols-2 xl:grid-cols-4">
          {platformFeatures.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[2rem] border border-[rgba(187,202,190,0.12)] bg-white px-6 py-7 shadow-[0_14px_32px_rgba(25,28,27,0.04)]"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#18c37e]/10 text-[#006d43]">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#191c1b]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#3c4a40]">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
