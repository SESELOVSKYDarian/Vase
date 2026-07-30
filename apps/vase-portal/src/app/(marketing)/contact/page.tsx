import type { Metadata } from "next";
import { ArrowUpRight, Clock3, Mail, MessageCircleMore } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contactá a Vase para conversar sobre ecommerce, inteligencia artificial, automatización e integraciones para tu negocio.",
};

const whatsappUrl =
  "https://wa.me/5492234496403?text=Hola%2C%20quiero%20consultar%20sobre%20Vase.";

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-[92rem] pb-16 pt-14 sm:pt-20 lg:pb-24 lg:pt-24">
      <ScrollReveal className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/45 px-6 py-12 shadow-[0_24px_80px_rgba(47,48,48,0.06)] backdrop-blur-xl sm:px-10 sm:py-16 lg:rounded-[3.5rem] lg:px-16 lg:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-32 size-96 rounded-full bg-[rgba(115,147,116,0.16)] blur-3xl"
        />
        <p className="relative text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#3B633D]">
          Contacto
        </p>
        <h1 className="relative mt-6 max-w-5xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#000202] sm:text-7xl lg:text-[5.8rem]">
          Hablemos de lo que tu negocio{" "}
          <span className="font-[family-name:var(--font-newsreader)] font-normal italic">
            necesita.
          </span>
        </h1>
        <p className="relative mt-7 max-w-2xl text-balance text-lg leading-8 text-[#4f5b55] sm:text-xl">
          Contanos dónde estás hoy. Te ayudamos a definir si Vase Business,
          Labs, Management o una integración a medida es el próximo paso.
        </p>
      </ScrollReveal>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <ScrollReveal className="rounded-[2.25rem] bg-white p-6 shadow-[0_20px_60px_rgba(47,48,48,0.07)] ring-1 ring-black/[0.04] sm:p-9 lg:rounded-[2.75rem] lg:p-12">
          <div className="mb-9 flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf4ee] text-[#3B633D]">
              <Mail className="size-5" strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[#739374]">
                Consulta por email
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#000202]">
                Contanos sobre tu proyecto
              </h2>
            </div>
          </div>
          <ContactForm />
        </ScrollReveal>

        <ScrollReveal
          delay={0.12}
          className="relative overflow-hidden rounded-[2.25rem] bg-[#173d2b] p-7 text-white shadow-[0_24px_70px_rgba(23,61,43,0.18)] sm:p-10 lg:rounded-[2.75rem] lg:p-11"
        >
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 size-36 rounded-full bg-white/[0.06] blur-2xl"
          />

          <div className="relative flex min-h-full flex-col">
            <span className="grid size-14 place-items-center rounded-[1.4rem] bg-white/10 text-[#b7ebc9] ring-1 ring-white/10">
              <MessageCircleMore className="size-6" strokeWidth={1.7} />
            </span>
            <p className="mt-10 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-[#9cdbb3]">
              Conversación directa
            </p>
            <h2 className="mt-4 max-w-sm font-[family-name:var(--font-newsreader)] text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl">
              ¿Preferís hablar por WhatsApp?
            </h2>
            <p className="mt-6 max-w-md text-[0.98rem] leading-7 text-white/68">
              Escribinos directamente y contanos qué querés resolver. El
              mensaje inicial ya queda preparado.
            </p>

            <div className="mt-8 rounded-[1.6rem] bg-black/10 p-5 ring-1 ring-white/10">
              <div className="flex items-center gap-3 text-sm text-white/72">
                <Clock3 className="size-4 text-[#9cdbb3]" />
                Atención comercial
              </div>
              <p className="mt-3 text-lg font-semibold">+54 9 223 449-6403</p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hablar con Vase por WhatsApp"
              className="group mt-auto inline-flex min-h-14 items-center justify-between rounded-full bg-[#eff7f1] px-6 font-semibold text-[#173d2b] shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Abrir WhatsApp
              <ArrowUpRight className="size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
