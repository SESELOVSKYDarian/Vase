"use client";

import { SectionHeading, SectionShell } from "@/components/business/storefront/shared";
import type { BlockBaseProps, ServiceItem } from "@/components/business/storefront/types";

const iconMap: Record<string, string> = {
  support_agent: "Atencion",
  local_shipping: "Envios",
  construction: "Proyecto",
  package: "Stock",
  shield: "Respaldo",
};

const defaultItems: ServiceItem[] = [
  { icon: "support_agent", title: "Asesoramiento experto", text: "Guias al cliente con una experiencia comercial mas clara y profesional." },
  { icon: "local_shipping", title: "Entrega coordinada", text: "Organiza retiro, envio y cobertura sin sobrecargar la portada." },
  { icon: "shield", title: "Compra con respaldo", text: "Muestra confianza, procesos y soporte postventa desde el primer scroll." },
];

export type ServicesProps = BlockBaseProps & {
  title?: string;
  subtitle?: string;
  items?: ServiceItem[];
  styles?: {
    backgroundColor?: string;
    cardBackgroundColor?: string;
    cardTitleColor?: string;
    cardTextColor?: string;
    accentColor?: string;
  };
};

export default function Services({
  title = "Te acompanamos en cada compra",
  subtitle = "Asesoria, entrega y soporte para que elijas con confianza.",
  items = defaultItems,
  className,
  style,
  styles,
}: ServicesProps) {
  return (
    <SectionShell className={className} style={{ backgroundColor: styles?.backgroundColor || "#f8fafc", ...style }}>
      <div className="space-y-10">
        <SectionHeading title={title} subtitle={subtitle} titleClassName="text-slate-950" subtitleClassName="text-slate-600" />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <article key={`${item.title}-${index}`} className="rounded-[28px] border border-slate-200 p-8 shadow-sm" style={{ backgroundColor: styles?.cardBackgroundColor || "white" }}>
              <div
                className="mb-5 inline-flex min-h-14 min-w-14 items-center justify-center rounded-full text-xs font-black uppercase tracking-[0.18em]"
                style={{ backgroundColor: "rgba(221,107,32,0.1)", color: styles?.accentColor || "#dd6b20" }}
              >
                {iconMap[item.icon || "support_agent"] || "Vase"}
              </div>
              <h3 className="text-xl font-black tracking-tight" style={{ color: styles?.cardTitleColor || "#0f172a" }}>
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7" style={{ color: styles?.cardTextColor || "#475569" }}>
                {item.text || item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
