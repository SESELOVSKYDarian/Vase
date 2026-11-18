import type { PropsWithChildren } from "react";
import Image from "next/image";
import { ArrowLeft, Boxes, Sparkles, Store } from "lucide-react";
import { resolveAppHomeHref } from "@/lib/navigation/document-navigation";

const PRODUCTS = [
  { icon: Store, name: "Vase Business", text: "Tu tienda online, con catálogo, pedidos y clientes." },
  { icon: Sparkles, name: "Vase Labs", text: "Un asistente que responde por WhatsApp e Instagram." },
  { icon: Boxes, name: "Tu sistema de gestión", text: "Conectado: precio y stock se actualizan solos." },
];

function Legal({ year, className, linkClassName }: { year: number; className: string; linkClassName: string }) {
  return (
    <p className={className}>
      © {year} Vase ·{" "}
      <a href="/terminos-y-condiciones" className={linkClassName}>
        Términos
      </a>{" "}
      ·{" "}
      <a href="/politica-de-privacidad" className={linkClassName}>
        Privacidad
      </a>
    </p>
  );
}

/**
 * Pantallas de acceso: a la izquierda la marca (solo en pantallas grandes), a la derecha el formulario.
 * En el celular queda solo el formulario, con el logo arriba.
 */
export default function AuthLayout({ children }: PropsWithChildren) {
  const home = resolveAppHomeHref();
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-[100svh] bg-[#f4f6f4] text-[#191c1b] [--background:#f4f6f4] [--foreground:#191c1b] [--muted:#5b6660] [--muted-soft:#66736b] [--accent:#3B633D] [--accent-strong:#3B633D] [--accent-contrast:#ffffff] [--border-subtle:#e3e9e5] [--surface-strong:#ffffff] lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-[#1d3322] text-white lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(126,184,128,0.28),transparent_45%),radial-gradient(circle_at_0%_100%,rgba(59,99,61,0.9),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_70%_30%,black,transparent_70%)]"
        />

        <a href={home} className="relative inline-flex w-fit items-center gap-3" aria-label="Ir a vase.ar">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            <Image src="/vasecolorlogo.png" alt="" width={30} height={30} className="h-7 w-7 object-contain" unoptimized />
          </span>
          <span className="text-lg font-semibold tracking-[-0.02em]">Vase</span>
        </a>

        <div className="relative max-w-md">
          <h2 className="font-[family-name:var(--font-newsreader)] text-[2.75rem] font-medium leading-[1.05] tracking-[-0.035em] xl:text-[3.25rem]">
            Todo tu negocio, <span className="italic text-[#b9dcb6]">en un solo lugar.</span>
          </h2>
          <p className="mt-5 text-base leading-7 text-white/70">
            Vendé online, respondé a tus clientes y mantené tu catálogo al día desde una sola cuenta.
          </p>

          <ul className="mt-10 space-y-3">
            {PRODUCTS.map(({ icon: Icon, name, text }) => (
              <li key={name} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#b9dcb6]">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>
                  <b className="block text-[15px] font-semibold">{name}</b>
                  <span className="mt-0.5 block text-sm leading-6 text-white/65">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Legal year={year} className="relative text-xs text-white/50" linkClassName="hover:text-white/80" />
      </aside>

      <div className="relative flex min-h-[100svh] flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(59,99,61,0.08),transparent_40%)]"
        />
        <div className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <a href={home} className="inline-flex items-center gap-2.5 lg:hidden" aria-label="Ir a vase.ar">
            <Image src="/vasecolorlogo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized priority />
            <span className="text-base font-semibold tracking-[-0.02em]">Vase</span>
          </a>
          <a
            href={home}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#5b6660] transition hover:bg-black/[0.04] hover:text-[#191c1b]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Volver a vase.ar</span>
            <span className="sm:hidden">Volver</span>
          </a>
        </div>

        <main id="main-content" className="relative flex flex-1 justify-center px-5 py-10 sm:px-8 sm:py-14 lg:items-center">
          {children}
        </main>

        <Legal year={year} className="relative px-5 pb-6 text-center text-xs text-[#8a958e] lg:hidden" linkClassName="hover:text-[#191c1b]" />
      </div>
    </div>
  );
}
