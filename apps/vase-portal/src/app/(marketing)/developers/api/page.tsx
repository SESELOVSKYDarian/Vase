import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Code2,
  History,
  Info,
  KeyRound,
  Rocket,
  Search,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import {
  integrationApiExamples,
  integrationEndpointCatalog,
  integrationErrorExamples,
  integrationScopes,
  webhookEventCatalog,
} from "@/config/integrations";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const authExample = `curl -X GET "https://api.vase.ar/api/v1/integrations/acme-retail/products" \\
  -H "x-vase-api-key: vsk_live_a13f92b0_********************************"`;

const quickstartExample = `import { VaseClient } from "@vase/sdk";

const client = new VaseClient({
  apiKey: process.env.VASE_API_KEY!,
  tenant: "acme-retail",
});

const products = await client.products.list();
console.log(products.data[0]);`;

const metaExample = `POST /api/v1/webhooks
x-vase-api-key: vsk_live_a13f92b0_********************************

{
  "topic": "orders.created",
  "url": "https://erp.acme.com/webhooks/vase"
}`;

const documentationCards: ReadonlyArray<{
  title: string;
  body: string;
  accent?: boolean;
  tags?: string[];
}> = [
  {
    title: "Primeros pasos",
    body: "Configurá tu tenant, generá una API key y hacé tu primera request autenticada en minutos.",
  },
  {
    title: "Explorador API",
    body: "Referencia viva para endpoints, payloads, scopes y respuestas de error de la capa de integraciones.",
    accent: true,
    tags: ["REST", "JSON"],
  },
  {
    title: "SDKs",
    body: "Base de consumo para Node.js, Python o cualquier integración custom vía HTTP.",
  },
  {
    title: "Guías de plataforma",
    body: "Buenas prácticas de seguridad, límites, versionado y diseño de sincronizaciones estables.",
  },
  {
    title: "Integraciones",
    body: "Patrones para conectar ERPs, CRMs, backoffice, stock, precios y webhooks.",
  },
] as const;

const sideNav: ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "introduction", label: "Introducción", icon: Info },
  { id: "quickstart", label: "Primeros pasos", icon: Rocket },
  { id: "concepts", label: "Conceptos clave", icon: Boxes },
  { id: "reference", label: "Referencia API", icon: Code2 },
  { id: "sdks", label: "SDKs", icon: BookOpen },
  { id: "changelog", label: "Cambios", icon: History },
];

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[96rem] gap-10">
      <aside className="sticky top-24 hidden h-[calc(100svh-8rem)] w-64 shrink-0 overflow-y-auto rounded-[2rem] border border-black/5 bg-[rgba(255,255,255,0.54)] px-5 py-8 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <h3 className="font-[family-name:var(--font-newsreader)] text-xl tracking-[-0.03em] text-[#191c1b]">
            Documentación
          </h3>
          <p className="mt-1 text-xs font-medium tracking-[0.14em] text-[#6c7b70] uppercase">
            v2.4.0-stable
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {sideNav.map((item, index) => {
            const Icon = item.icon;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={[
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200",
                  index === 0
                    ? "translate-x-1 rounded-r-full bg-[#18c37e]/6 font-bold text-[#18c37e]"
                    : "text-[#191c1b]/72 hover:bg-[#f2f4f2] hover:text-[#18c37e]",
                ].join(" ")}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-auto px-2 pt-8">
          <Link
            href="/register"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#18c37e]/10 text-xs font-bold uppercase tracking-[0.18em] text-[#006d43] transition hover:bg-[#18c37e]/18"
          >
            <KeyRound className="size-4" />
            Obtener API key
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden pb-24">
        <ScrollReveal variant="section">
        <section id="introduction" className="mb-24 max-w-4xl scroll-mt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#b5ecc8]/40 px-3 py-1 text-[#36684c]">
            <Rocket className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.22em]">Nuevo: SDK v2.4</span>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.08] tracking-[-0.06em] text-[#191c1b] sm:text-6xl lg:text-7xl">
            Documentación de Vase
            <br />
            <span className="font-[family-name:var(--font-newsreader)] italic font-normal text-[#18c37e]">
              Integrá con claridad.
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-xl leading-relaxed text-[#3c4a40]">
            Documentación real para integrar Vase con ERPs, CRMs, stock, precios, pedidos y
            automatizaciones. Desde un tenant nuevo hasta una operación enterprise, la API está
            pensada para conectar sistemas existentes sin fricción innecesaria.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="#quickstart"
              className="inline-flex min-h-14 items-center gap-2 rounded-full bg-[#006d43] px-8 text-sm font-bold text-white shadow-[0_16px_34px_rgba(0,109,67,0.18)] transition hover:-translate-y-0.5"
            >
              Empezar
              <Rocket className="size-4" />
            </Link>
            <a
              href="#reference"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#191c1b] transition hover:text-[#006d43]"
            >
              Ir a la referencia
              <Search className="size-4" />
            </a>
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal variant="section">
        <section className="mb-32 grid grid-cols-1 gap-6 md:grid-cols-12">
          {documentationCards.map((card, index) => (
            <article
              key={card.title}
              className={[
                "rounded-[1.5rem] border border-[#bbcabe]/15 p-8 transition-all",
                card.accent
                  ? "relative cursor-pointer overflow-hidden bg-[#18c37e] text-white md:col-span-4"
                  : index === 0
                    ? "cursor-pointer bg-white hover:shadow-xl hover:shadow-black/5 md:col-span-8"
                    : "cursor-pointer bg-[#f2f4f2] hover:bg-[#e6e9e7] md:col-span-4",
              ].join(" ")}
            >
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <div
                    className={[
                      "mb-6 grid h-12 w-12 place-items-center rounded-xl",
                      card.accent ? "bg-white/14" : "bg-[#006d43]/5 text-[#006d43]",
                    ].join(" ")}
                  >
                    {card.title === "Primeros pasos" ? (
                      <Rocket className="size-5" />
                    ) : card.title === "Explorador API" ? (
                      <Code2 className="size-5" />
                    ) : card.title === "SDKs" ? (
                      <BookOpen className="size-5" />
                    ) : card.title === "Guías de plataforma" ? (
                      <Boxes className="size-5" />
                    ) : (
                      <Webhook className="size-5" />
                    )}
                  </div>

                  <h3 className="mb-3 text-2xl tracking-[-0.04em]">{card.title}</h3>
                  <p className={card.accent ? "text-sm leading-7 text-white/84" : "text-sm leading-7 text-[#3c4a40]"}>
                    {card.body}
                  </p>
                </div>

                {card.tags ? (
                  <div className="mt-8 flex gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-white/18 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : card.title === "Primeros pasos" ? (
                  <div className="mt-8 flex items-center gap-2 text-[#006d43]">
                    <span className="text-sm font-bold">Leer guía</span>
                    <ArrowRight className="size-4" />
                  </div>
                ) : null}
              </div>

              {card.accent ? (
                <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
              ) : null}
            </article>
          ))}
        </section>
        </ScrollReveal>

        <section id="quickstart" className="mb-32 scroll-mt-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
                Quickstart
              </span>
              <h2 className="mb-6 text-4xl tracking-[-0.05em] text-[#191c1b]">
                Tu primera integración en minutos
              </h2>
              <p className="mb-8 text-base leading-8 text-[#3c4a40]">
                Vase usa API keys por tenant para integraciones externas. El flujo recomendado es:
                crear una credencial desde owner, asignar scopes mínimos y empezar con recursos de
                lectura como catálogo, stock o precios.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-5 text-[#18c37e]" />
                  <span className="text-sm font-medium text-[#191c1b]">
                    Rotación y revocación de credenciales desde panel owner.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-5 text-[#18c37e]" />
                  <span className="text-sm font-medium text-[#191c1b]">
                    Scopes explícitos por recurso para sostener mínimo privilegio.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 size-5 text-[#18c37e]" />
                  <span className="text-sm font-medium text-[#191c1b]">
                    Webhooks para eventos y REST para lectura y conciliación estructurada.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.2rem] bg-[#191c1b] p-6 text-[#eceeec] shadow-2xl">
                <pre className="overflow-x-auto text-sm leading-7">
                  <code>{authExample}</code>
                </pre>
              </div>

              <div className="rounded-[1.2rem] bg-[#191c1b] p-6 text-[#eceeec] shadow-2xl">
                <pre className="overflow-x-auto text-sm leading-7">
                  <code>{quickstartExample}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section id="concepts" className="mb-32 scroll-mt-28">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
                Core Concepts
              </span>
              <h2 className="mb-6 text-4xl tracking-[-0.05em] text-[#191c1b]">
                Diseñada para operaciones reales
              </h2>
              <p className="mb-8 text-base leading-8 text-[#3c4a40]">
                La documentación no describe una API abstracta. Describe una capa operativa real:
                multi-tenant, versionada, con límites, scopes y eventos para conectar ecommerce,
                clientes, stock, precios y pedidos con sistemas externos.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[1rem] border border-[#bbcabe]/15 bg-[#f2f4f2] p-4">
                  <h4 className="mb-1 text-sm font-bold text-[#191c1b]">Tenant isolation</h4>
                  <p className="text-xs leading-6 text-[#3c4a40]">
                    Cada cuenta opera con credenciales, consumo y trazabilidad independientes.
                  </p>
                </div>
                <div className="rounded-[1rem] border border-[#bbcabe]/15 bg-[#f2f4f2] p-4">
                  <h4 className="mb-1 text-sm font-bold text-[#191c1b]">Auditability</h4>
                  <p className="text-xs leading-6 text-[#3c4a40]">
                    Cada request devuelve requestId para seguimiento y soporte técnico.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-8 shadow-[0_20px_48px_rgba(25,28,27,0.06)]">
              <h3 className="mb-5 text-2xl tracking-[-0.04em] text-[#191c1b]">Scopes disponibles</h3>
              <div className="grid gap-3">
                {integrationScopes.map((scope) => (
                  <div
                    key={scope}
                    className="rounded-[1rem] bg-[#f2f4f2] p-4 font-mono text-sm text-[#191c1b]"
                  >
                    {scope}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="reference" className="mb-32 scroll-mt-28">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
                API Reference
              </span>
              <h2 className="text-4xl tracking-[-0.05em] text-[#191c1b]">Endpoints, payloads y errores</h2>
            </div>
            <Link
              href="/api/openapi.json"
              className="inline-flex min-h-12 items-center rounded-full border border-[#006d43] px-6 text-sm font-semibold text-[#191c1b]"
            >
              Descargar OpenAPI JSON
            </Link>
          </div>

          <div className="overflow-x-auto rounded-[1.5rem] bg-white p-4 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm">
              <thead>
                <tr className="text-[#6c7b70]">
                  <th className="px-4">Método</th>
                  <th className="px-4">Endpoint</th>
                  <th className="px-4">Scope</th>
                  <th className="px-4">Uso</th>
                </tr>
              </thead>
              <tbody>
                {integrationEndpointCatalog.map((item) => (
                  <tr
                    key={`${item.method}-${item.path}`}
                    className="bg-[#f2f4f2] text-[#191c1b]"
                  >
                    <td className="rounded-l-2xl px-4 py-4 font-semibold">{item.method}</td>
                    <td className="px-4 py-4 font-mono text-xs sm:text-sm">{item.path}</td>
                    <td className="px-4 py-4 font-mono text-xs sm:text-sm text-[#3c4a40]">{item.scope}</td>
                    <td className="rounded-r-2xl px-4 py-4 text-[#3c4a40]">{item.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
              <h3 className="mb-4 text-xl tracking-[-0.03em] text-[#191c1b]">Ejemplo JSON: products</h3>
              <pre className="overflow-x-auto rounded-[1rem] bg-[#191c1b] p-5 text-sm leading-7 text-[#eceeec]">
                <code>{pretty(integrationApiExamples.products)}</code>
              </pre>
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
              <h3 className="mb-4 text-xl tracking-[-0.03em] text-[#191c1b]">Errores estandarizados</h3>
              <div className="grid gap-3">
                {integrationErrorExamples.map((item) => (
                  <div key={item.code} className="rounded-[1rem] bg-[#f2f4f2] p-4">
                    <p className="font-semibold text-[#191c1b]">
                      {item.status} {item.code}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#3c4a40]">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="sdks" className="mb-32 scroll-mt-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
                SDKs & Webhooks
              </span>
              <h2 className="mb-6 text-4xl tracking-[-0.05em] text-[#191c1b]">
                Conectá eventos sin perder trazabilidad
              </h2>
              <p className="mb-8 text-base leading-8 text-[#3c4a40]">
                Vase puede exponer datos por REST y emitir eventos salientes para sincronizar
                cambios relevantes. El patrón recomendado es: lectura estructurada para conciliación
                y webhooks para reaccionar a eventos críticos.
              </p>
              <div className="grid gap-3">
                {webhookEventCatalog.map((event) => (
                  <div key={event.key} className="rounded-[1rem] bg-[#f2f4f2] p-4">
                    <p className="font-semibold text-[#191c1b]">{event.key}</p>
                    <p className="mt-2 text-sm leading-6 text-[#3c4a40]">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.2rem] bg-[#191c1b] p-6 text-[#eceeec] shadow-2xl">
                <pre className="overflow-x-auto text-sm leading-7">
                  <code>{metaExample}</code>
                </pre>
              </div>
              <div className="rounded-[1.5rem] border border-[#bbcabe]/15 bg-white p-6 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
                <h3 className="mb-3 text-xl tracking-[-0.03em] text-[#191c1b]">SDK status</h3>
                <p className="text-sm leading-7 text-[#3c4a40]">
                  Hoy la integración puede consumirse por HTTP directo y la capa de SDK está pensada
                  como conveniencia para equipos que quieran acelerar implementación interna.
                </p>
                <div className="mt-5 flex gap-2">
                  {["Node", "Python", "Go", "Ruby"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#f2f4f2] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#006d43]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="changelog" className="scroll-mt-28">
          <div className="mb-10">
            <span className="mb-4 block text-xs font-bold uppercase tracking-[0.22em] text-[#006d43]">
              Changelog
            </span>
            <h2 className="text-4xl tracking-[-0.05em] text-[#191c1b]">Cambios recientes</h2>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.2rem] bg-white p-6 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#191c1b]">v2.4.0</p>
                  <p className="mt-1 text-sm leading-6 text-[#3c4a40]">
                    Se consolidó la referencia de scopes y se mejoró la documentación para catálogos,
                    stock y webhooks.
                  </p>
                </div>
                <span className="rounded-full bg-[#18c37e]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#006d43]">
                  Stable
                </span>
              </div>
            </article>

            <article className="rounded-[1.2rem] bg-white p-6 shadow-[0_18px_42px_rgba(25,28,27,0.05)]">
              <p className="text-sm font-bold text-[#191c1b]">v2.3.0</p>
              <p className="mt-1 text-sm leading-6 text-[#3c4a40]">
                Se normalizaron payloads de orders y clients para integraciones con ERP y reporting.
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
