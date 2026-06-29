"use client";

/* eslint-disable @next/next/no-img-element */

import { ActionLink, SectionHeading, SectionShell, joinClasses, resolveImage } from "@/components/business/storefront/shared";
import type { BlockBaseProps, BrandItem, StorefrontAction } from "@/components/business/storefront/types";

const defaultItems: BrandItem[] = [
  { id: "brand-1", label: "Atlas", imageUrl: "https://dummyimage.com/220x120/f4f4f5/18181b&text=Atlas" },
  { id: "brand-2", label: "Nord", imageUrl: "https://dummyimage.com/220x120/e2e8f0/111827&text=Nord" },
  { id: "brand-3", label: "Linea", imageUrl: "https://dummyimage.com/220x120/f8fafc/0f172a&text=Linea" },
  { id: "brand-4", label: "Forma", imageUrl: "https://dummyimage.com/220x120/fef3c7/111827&text=Forma" },
];

export type BrandMarqueeProps = BlockBaseProps & {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryButton?: StorefrontAction;
  items?: BrandItem[];
  speed?: "static" | "slow" | "medium" | "fast";
  variant?: "classic" | "glass" | "grid" | "monochrome";
  styles?: {
    backgroundColor?: string;
    accentColor?: string;
  };
};

function BrandCard({ item, monochrome = false }: { item: BrandItem; monochrome?: boolean }) {
  return (
    <article
      className={joinClasses(
        "flex min-h-28 items-center justify-center rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm",
        monochrome && "grayscale",
      )}
    >
      {item.imageUrl ? (
        <img src={resolveImage(item.imageUrl)} alt={item.label} className="max-h-12 w-auto object-contain" />
      ) : (
        <span className="text-base font-black uppercase tracking-[0.24em] text-slate-800">{item.label}</span>
      )}
    </article>
  );
}

export function BrandMarqueeGlass(props: BrandMarqueeProps) {
  const items = props.items?.length ? props.items : defaultItems;
  return (
    <SectionShell className={props.className} style={{ backgroundColor: props.styles?.backgroundColor || "#0f172a", ...props.style }}>
      <div className="space-y-8">
        <SectionHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} titleClassName="text-white" subtitleClassName="text-slate-300" eyebrowClassName="text-cyan-300" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.id || item.label} className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <BrandCard item={item} />
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function BrandMarqueeGrid(props: BrandMarqueeProps) {
  const items = props.items?.length ? props.items : defaultItems;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <SectionHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <BrandCard key={item.id || item.label} item={item} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function BrandMarqueeMonochrome(props: BrandMarqueeProps) {
  const items = props.items?.length ? props.items : defaultItems;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <SectionHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <BrandCard key={item.id || item.label} item={item} monochrome />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function ClassicBrandMarquee(props: BrandMarqueeProps) {
  const items = props.items?.length ? props.items : defaultItems;
  return (
    <SectionShell className={props.className} style={props.style}>
      <div className="space-y-8">
        <SectionHeading eyebrow={props.eyebrow} title={props.title} subtitle={props.subtitle} />
        {props.primaryButton ? (
          <div className="flex justify-center">
            <ActionLink action={props.primaryButton} onNavigate={props.onNavigate} style={{ ["--accent" as string]: props.styles?.accentColor || "#dd6b20" }} />
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <BrandCard key={item.id || item.label} item={item} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export default function BrandMarquee(props: BrandMarqueeProps) {
  switch (props.variant) {
    case "glass":
      return <BrandMarqueeGlass {...props} />;
    case "grid":
      return <BrandMarqueeGrid {...props} />;
    case "monochrome":
      return <BrandMarqueeMonochrome {...props} />;
    default:
      return <ClassicBrandMarquee {...props} />;
  }
}
