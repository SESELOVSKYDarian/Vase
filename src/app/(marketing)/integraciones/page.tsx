import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Code2,
  KeyRound,
  MessageSquareShare,
  ShieldCheck,
  Webhook,
  Workflow,
} from "lucide-react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const metaFeatures = [
  "Acceso directo a WhatsApp Business API",
  "Webhooks para automatización de Instagram DM",
  "Catálogo de Meta sincronizado con Vase Labs",
] as const;

const businessCards: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: Boxes,
    title: "Inventory Sync",
    body: "Actualización en tiempo real de stock, estados y disponibilidad en todos los canales conectados.",
  },
  {
    icon: Workflow,
    title: "Order Logic",
    body: "Pedidos, pagos y conciliación listos para empujar datos hacia tu ERP o suite administrativa.",
  },
];

const bentoCards: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  body: string;
  footer?: string;
  wide?: boolean;
}> = [
  {
    icon: Webhook,
    title: "Webhooks",
    body: "Escuchá eventos de mensajes, cambios de catálogo, pedidos y sincronizaciones sin depender de polling constante.",
    footer: "Explorar eventos",
    wide: true,
  },
  {
    icon: Code2,
    title: "SDKs",
    body: "Base preparada para consumir la API desde Node, Python o integraciones custom.",
    footer: "JS  PY  RB",
  },
  {
    icon: KeyRound,
    title: "OAuth 2.0",
    body: "Acceso seguro, scopes claros y credenciales diseñadas para apps e integradores.",
    footer: "vase_live_7x9...",
  },
  {
    icon: ShieldCheck,
    title: "Performance",
    body: "Endpoints estables y pensados para cargas altas, sincronización operativa y monitoreo real.",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="overflow-x-hidden pb-16">
      <ScrollReveal variant="section">
      <section className="px-6 py-16 md:px-10 lg:px-12 lg:py-20">
        <div className="mx-auto grid w-full max-w-[92rem] grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <span className="mb-6 inline-flex rounded-full bg-[#b5ecc8] px-4 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#1c5036]">
              Developer Ecosystem
            </span>
            <h1 className="mb-8 max-w-3xl text-5xl leading-[1.02] tracking-[-0.06em] text-[#191c1b] sm:text-6xl lg:text-[5.6rem]">
              {"Conectá "}
              <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#18c37e]">Vase</span>
              {" con cada punto de contacto."}
            </h1>
            <p className="mb-10 max-w-xl text-xl leading-relaxed text-[#3c4a40]">
              {"Tanto si querés activar conversación con "}
              <span className="font-bold">Vase Labs</span>
              {" como ordenar procesos con "}
              <span className="font-bold">Vase Business</span>
              {" , nuestra arquitectura API-first une conversación, operación y conversión."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/developers/api"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-[#006d43] px-8 text-sm font-bold text-white transition hover:shadow-[0_18px_36px_rgba(0,109,67,0.18)]"
              >
                Explorar docs
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/developers/api"
                className="inline-flex min-h-14 items-center rounded-full border border-[#bbcabe] px-8 text-sm font-bold text-[#191c1b] transition hover:bg-[#f2f4f2]"
              >
                Ver API reference
              </Link>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-tr from-[#006d43]/10 to-transparent blur-3xl" />
            <div className="rotate-1 rounded-[2rem] bg-[#191c1b] p-6 text-[#b8efcb] shadow-[0_28px_60px_rgba(25,28,27,0.18)]">
              <div className="mb-4 flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/50" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                <div className="h-3 w-3 rounded-full bg-green-500/50" />
              </div>
              <pre className="overflow-x-auto text-sm leading-7">
                <code>{`GET /v1/integrations/meta/sync

{
  "provider": "whatsapp_business",
  "status": "active",
  "events": [
    "messages.incoming",
    "catalog.update",
    "order.created"
  ],
  "webhook_url": "https://api.yourdomain.com/v1/vase"
}`}</code>
              </pre>
            </div>

            <div className="absolute -bottom-10 -left-8 max-w-xs rounded-[1.6rem] border border-[#18c37e]/18 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#18c37e] text-white">
                  <Workflow className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#191c1b]">Vase Hub Status</p>
                  <p className="text-xs text-[#3c4a40]">99.99% uptime</p>
                </div>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6e9e7]">
                <div className="h-full w-[99%] bg-[#18c37e]" />
              </div>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="bg-[#f2f4f2] px-6 py-24 md:px-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col items-center gap-20 md:flex-row">
          <div className="order-2 w-full md:order-1 md:w-1/2">
            <div className="relative">
              <img
                className="h-[400px] w-full rounded-[2rem] object-cover shadow-2xl"
                alt="Integración de Meta con Vase Labs"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaVMAAeXVj_wUn5bXR2rhfPZA389Tdp4N9JGUEM0HkX3KHMQyIAxaJbcz6syH26mdpBCJ0yLyKZkw2RjVQJED9rW4QSI1Z6tnS_d3YQW_fEXMtdX389RIn0dtY4ZK5u4TIQ03sq6MoKOlekcWxVwuyUpaH9cDbiFrSXtNHUmHZsxXfUA1JuBQ5hy1UrK6kM4NBW8521_O6rGuU99kjHcgf-BHsa2YkQx5iAP3kG7UEcirKKbchoSPRMGcI2CTU4-KMTL-EZqZl6DA"
              />
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-black/35 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] opacity-80">Real-time stream</p>
                  <p className="font-[family-name:var(--font-newsreader)] text-xl italic">{"Meta \u2194 Vase Labs"}</p>
                </div>
                <MessageSquareShare className="size-9" />
              </div>
            </div>
          </div>

          <div className="order-1 w-full md:order-2 md:w-1/2">
            <h2 className="mb-6 text-5xl tracking-[-0.05em] text-[#191c1b]">
              <span className="font-[family-name:var(--font-newsreader)] italic font-normal">Seamless</span> Meta Sync.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-[#3c4a40]">
              {"Unificá tu presencia entre WhatsApp, Instagram y Facebook. El conector dedicado de "}
              <span className="text-[#006d43] italic">Vase Labs</span>
              {" resuelve handshakes complejos y mapea interacciones, leads y señales hacia tu CRM o tus flujos internos."}
            </p>
            <ul className="mb-10 space-y-4">
              {metaFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-[#191c1b]">
                  <ShieldCheck className="size-5 text-[#18c37e]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-[1.5rem] border border-[#bbcabe]/30 bg-white p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#18c37e]">Quick setup</p>
              <code className="block text-sm leading-7 text-[#3c4a40]">
                curl -X POST "https://api.vase.ar/v1/webhooks" <br />
                -H "Authorization: Bearer YOUR_KEY" <br />
                -d {'{"topic": "meta.messages", "url": "..."}'}
              </code>
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="px-6 py-24 md:px-10 lg:px-12">
        <div className="mx-auto grid w-full max-w-[92rem] grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="mb-6 text-5xl tracking-[-0.05em] text-[#191c1b]">
              Enterprise <span className="font-[family-name:var(--font-newsreader)] italic font-normal">Harmony</span>.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-[#3c4a40]">
              {"Conectá "}
              <span className="font-bold text-[#006d43]">Vase Business</span>
              {" con tu ERP, SAP o herramientas de gestión ya existentes. Automatizá inventario, pedidos y conciliación de datos sin rehacer tu operación desde cero."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {businessCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-[1.1rem] bg-[#f2f4f2] p-6">
                    <Icon className="mb-2 size-5 text-[#006d43]" />
                    <h4 className="text-sm font-bold text-[#191c1b]">{card.title}</h4>
                    <p className="mt-1 text-xs leading-6 text-[#3c4a40]">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-[2.4rem] border border-[#bbcabe]/20 bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#eceeec]">
                    <Workflow className="size-5 text-[#006d43]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#191c1b]">ERP Connection</p>
                    <p className="text-xs text-[#3c4a40]">System Status: Active</p>
                  </div>
                </div>
                <div className="rounded-full bg-[#18c37e]/10 px-3 py-1 text-xs font-bold uppercase text-[#006d43]">
                  Healthy
                </div>
              </div>
              <img
                className="h-[300px] w-full rounded-xl border border-[#bbcabe]/15 object-cover"
                alt="Sincronización ERP con Vase Business"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDs0SxFhwL9cobm3dFAkVvsBfL00UZ4BAOPBftbVDIHMMtHThDPMe2q6g30ZKGenweXbR4pxMt9v8qJG19_Sp-xzP7BkRq-AOKBaVD5P4D_orzniFGRy3elGcdCTsracACcm7OtvxvawpBIUUnsek7V5uRMWGzZlynSIvIoBmFrVlHPK53aX3eqJ_pQEpa_ZAS9yTetZFBFL0F4WqWz4_NvalTMSricKoNXhD7DgR8HWDVHTGqWcAqoyBaiB0BzRFVU7y5UrJrS5s8"
              />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#006d43]/5 blur-2xl" />
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal variant="section">
      <section className="bg-[#f2f4f2] px-6 py-24 md:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-[92rem]">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-5xl tracking-[-0.05em] text-[#191c1b]">
              Built for <span className="font-[family-name:var(--font-newsreader)] italic font-normal">builders</span>.
            </h2>
            <p className="mx-auto max-w-2xl text-[#3c4a40]">
              {"Todo lo que necesitás para integrar Vase a tu stack en minutos, no en días."}
            </p>
          </div>

          <div className="grid h-auto grid-cols-1 gap-6 md:grid-cols-4 md:grid-rows-2 md:min-h-[600px]">
            {bentoCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className={[
                    "flex flex-col justify-between rounded-[2rem] border border-[#bbcabe]/20 bg-white p-8 transition-all hover:border-[#18c37e]/40",
                    card.wide ? "md:col-span-2" : "md:col-span-1",
                  ].join(" ")}
                >
                  <div>
                    <div className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-[#006d43]/10">
                      <Icon className="size-5 text-[#006d43]" />
                    </div>
                    <h3 className="mb-2 text-2xl text-[#191c1b]">
                      <span className="font-[family-name:var(--font-newsreader)] italic font-normal">{card.title}</span>
                    </h3>
                    <p className="text-sm leading-7 text-[#3c4a40]">{card.body}</p>
                  </div>
                  {card.footer ? (
                    <div className="mt-6 border-t border-[#bbcabe]/12 pt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#006d43]">
                      {card.footer}
                    </div>
                  ) : null}
                </article>
              );
            })}

            <article className="relative overflow-hidden rounded-[2rem] bg-[#18c37e] md:col-span-3">
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay transition-transform duration-700 hover:scale-105"
                alt="Visual de consola de desarrolladores"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAseXBEAPLBydrkN0YyknEuj7t0wIDM50m7E8d37CSPWQCVYrcJ-EvzMBPHi62RMISa1vrSg7QVU1JKHyvjOxKzK6WsnN2MhGlGFo8rcBqFLpVqks3bpwlcmG7WBeLMptrn57usEXwyCCF_Vtc3A7x9nygvsmTeFqubzMPHcweWo38_jrW87bVmK3YtqzDER4GtuQwUqApNNMBpLaeWoHrRv6_Syuygqh8auJD05FRXiy4644-Bzr9VdvvEtgNK4L9T1xmKozj5KIk"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-r from-[#006d43] to-transparent p-12 text-white">
                <h3 className="mb-2 font-[family-name:var(--font-newsreader)] text-3xl italic">Developer Console</h3>
                <p className="mb-6 max-w-sm text-white/82">
                  Monitoreá requests, depurá payloads y gestioná tus API keys desde una sola interfaz limpia.
                </p>
                <Link
                  href="/developers/api"
                  className="inline-flex w-fit rounded-full bg-white px-6 py-2 text-sm font-bold text-[#006d43]"
                >
                  Open Console
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
}
