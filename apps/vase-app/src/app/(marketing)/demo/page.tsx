import Link from "next/link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PanelCard } from "@/components/ui/panel-card";

export default function DemoPage() {
  return (
    <>
      <SectionHeading
        eyebrow="Demo"
        title="Solicitar demo de Vase"
        description="Espacio inicial para coordinar una presentación del producto, revisar alcance y evaluar el mejor formato de implementación."
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <PanelCard
          title="Qué revisamos en una demo"
          description="La demo apunta a decisiones reales de negocio, no a una recorrida superficial."
        >
          <ul className="grid gap-3 text-sm leading-7 text-[var(--muted)]">
            <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">Modelo de ecommerce: editable o personalizado.</li>
            <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">Necesidades de IA, chatbot y automatización.</li>
            <li className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">Integración con sistemas de gestión existentes.</li>
          </ul>
        </PanelCard>

        <PanelCard
          title="Siguiente paso"
          description="Mientras se implementa el flujo definitivo de solicitud, puedes avanzar por alta inicial o ingreso existente."
        >
          <div className="flex flex-col gap-3">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent-strong)] px-6 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Registrarse
            </Link>
            <Link
              href="/signin"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-semibold text-[var(--foreground)]"
            >
              Iniciar sesión
            </Link>
          </div>
        </PanelCard>
      </section>
    </>
  );
}
