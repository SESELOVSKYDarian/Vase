import { CtaBand } from "@/components/marketing/cta-band";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PanelCard } from "@/components/ui/panel-card";
import { faqItems } from "@/config/public-site";

export default function FaqPage() {
  return (
    <>
      <SectionHeading
        eyebrow="FAQ"
        title="Preguntas frecuentes"
        description="Respuestas claras para equipos que están evaluando ecommerce, automatización, integraciones y evolución digital con Vase."
      />

      <section className="grid gap-6">
        {faqItems.map((item) => (
          <PanelCard key={item.question} title={item.question} description={item.answer} />
        ))}
      </section>

      <CtaBand
        title="Si tu caso requiere más detalle, agenda una demo."
        description="Podemos revisar alcance comercial, conectividad con gestión y el mejor formato de implementación."
      />
    </>
  );
}
