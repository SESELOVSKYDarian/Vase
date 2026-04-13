"use client";

/* eslint-disable @next/next/no-img-element */

import { ActionLink, SectionHeading, SectionShell, joinClasses, resolveImage } from "@/components/business/storefront/shared";
import type {
  AboutHighlight,
  BlockBaseProps,
  StatItem,
  StorefrontAction,
  TimelineItem,
  ValueItem,
} from "@/components/business/storefront/types";

const defaultMissionHighlights: AboutHighlight[] = [
  { icon: "quality", title: "Calidad certificada", text: "Procesos consistentes y enfoque comercial cuidado." },
  { icon: "innovation", title: "Innovacion aplicada", text: "Bloques y narrativa alineados con cada vertical." },
];

const defaultStats: StatItem[] = [
  { value: "10+", label: "Anos de experiencia", accent: true },
  { value: "5k+", label: "Clientes satisfechos" },
  { value: "24/7", label: "Disponibilidad comercial" },
  { value: "2x", label: "Mas claridad en presentacion" },
];

const defaultTimeline: TimelineItem[] = [
  { year: "2014", title: "Fundacion", text: "Arranque de la operacion con foco en producto y oficio." },
  { year: "2018", title: "Expansion", text: "Aparecen nuevos canales y procesos mas maduros." },
  { year: "2024", title: "Digitalizacion", text: "La presencia online pasa a ser parte del core comercial." },
];

const defaultValues: ValueItem[] = [
  { icon: "quality", title: "Calidad", description: "No soltamos detalle en experiencia, contenido ni operacion." },
  { icon: "commitment", title: "Compromiso", description: "Cada modulo tiene que empujar resultados reales del negocio." },
  { icon: "innovation", title: "Innovacion", description: "Usamos IA y automatizacion donde agregan valor tangible." },
];

type AboutCommonProps = BlockBaseProps & {
  styles?: {
    backgroundColor?: string;
    accentColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
  };
};

export type AboutHeroProps = AboutCommonProps & {
  tagline?: string;
  title?: string;
  description?: string;
  primaryButton?: StorefrontAction;
  secondaryButton?: StorefrontAction;
  backgroundImage?: string;
  variant?: "classic" | "split_image" | "timeline" | "video_focus";
};

export type AboutMissionProps = AboutCommonProps & {
  eyebrow?: string;
  title?: string;
  paragraphs?: string[];
  highlights?: AboutHighlight[];
  image?: string;
  imageAlt?: string;
};

export type AboutStatsProps = AboutCommonProps & {
  items?: StatItem[];
};

export type AboutTeamProps = AboutCommonProps & {
  title?: string;
  quote?: string;
  author?: string;
  role?: string;
  avatarImage?: string;
  backgroundImage?: string;
};

export type AboutValuesProps = AboutCommonProps & {
  title?: string;
  items?: ValueItem[];
};

export type AboutTimelineProps = AboutCommonProps & {
  tagline?: string;
  title?: string;
  description?: string;
  items?: TimelineItem[];
  primaryButton?: StorefrontAction;
};

export type AboutSplitImageProps = AboutCommonProps & {
  eyebrow?: string;
  title?: string;
  description?: string;
  imageLeft?: string;
  imageRight?: string;
};

export type AboutVideoFocusProps = AboutCommonProps & {
  eyebrow?: string;
  title?: string;
  description?: string;
  videoPoster?: string;
  primaryButton?: StorefrontAction;
};

export type AboutCTAProps = AboutCommonProps & {
  title?: string;
  primaryLink?: StorefrontAction;
  secondaryLink?: StorefrontAction;
};

function accentValue(styles?: AboutCommonProps["styles"]) {
  return styles?.accentColor || "#dd6b20";
}

export function AboutMission({
  eyebrow = "Nuestro proposito",
  title = "La mision",
  paragraphs = [
    "Vase Business busca que la presencia digital de cada negocio se sienta propia y vendible.",
    "No se trata solo de bloques lindos, sino de una estructura comercial que pueda crecer.",
  ],
  highlights = defaultMissionHighlights,
  image,
  imageAlt = "Equipo trabajando",
  className,
  style,
  styles,
}: AboutMissionProps) {
  return (
    <SectionShell className={className} style={{ backgroundColor: styles?.backgroundColor, ...style }}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <SectionHeading eyebrow={eyebrow} title={title} align="left" />
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-8 text-slate-600">
              {paragraph}
            </p>
          ))}
          <div className="grid gap-5 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: accentValue(styles) }}>
                  {item.icon || "Vase"}
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-[32px]">
          <img src={resolveImage(image)} alt={imageAlt} className="h-full min-h-[320px] w-full object-cover" />
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutStats({ items = defaultStats, className, style, styles }: AboutStatsProps) {
  return (
    <SectionShell className={className} style={{ backgroundColor: styles?.backgroundColor || "#0f172a", ...style }}>
      <div className="grid gap-6 md:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-4xl font-black" style={{ color: item.accent ? accentValue(styles) : "white" }}>
              {item.value}
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{item.label}</div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutTeam({
  title = "Precision e inspiracion en cada detalle.",
  quote = "Cada bloque de storefront tiene que hacer sentir mejor la propuesta comercial.",
  author = "Equipo Vase",
  role = "Diseno y operacion digital",
  avatarImage,
  backgroundImage,
  className,
  style,
}: AboutTeamProps) {
  return (
    <SectionShell className={className} style={style}>
      <div className="grid overflow-hidden rounded-[32px] border border-slate-200 bg-white lg:grid-cols-2">
        <div className="space-y-6 p-8 md:p-12">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">{title}</h2>
          <p className="text-lg leading-8 text-slate-600">&ldquo;{quote}&rdquo;</p>
          <div className="flex items-center gap-4">
            <img src={resolveImage(avatarImage)} alt={author} className="h-14 w-14 rounded-full object-cover" />
            <div>
              <div className="font-black text-slate-950">{author}</div>
              <div className="text-sm uppercase tracking-[0.18em] text-slate-500">{role}</div>
            </div>
          </div>
        </div>
        <div className="min-h-[280px] bg-slate-100">
          <img src={resolveImage(backgroundImage)} alt={title} className="h-full w-full object-cover" />
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutValues({ title = "Nuestros valores", items = defaultValues, className, style, styles }: AboutValuesProps) {
  return (
    <SectionShell className={className} style={{ backgroundColor: styles?.backgroundColor || "#f8fafc", ...style }}>
      <div className="space-y-10">
        <SectionHeading title={title} />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-8">
              <div className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: accentValue(styles) }}>
                {item.icon || "Valor"}
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutSplitImage({
  eyebrow = "Marca",
  title = "Una historia que se ve y se entiende.",
  description = "El storefront puede sostener una narrativa mas editorial cuando la marca lo necesita.",
  imageLeft,
  imageRight,
  className,
  style,
}: AboutSplitImageProps) {
  return (
    <SectionShell className={className} style={style}>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={description} align="left" />
        <div className="grid gap-5 sm:grid-cols-2">
          <img src={resolveImage(imageLeft)} alt={title} className="h-80 w-full rounded-[28px] object-cover" />
          <img src={resolveImage(imageRight)} alt={title} className="h-80 w-full rounded-[28px] object-cover sm:translate-y-10" />
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutTimeline({
  tagline = "Evolucion",
  title = "Nuestra historia",
  description = "El camino que recorrimos.",
  items = defaultTimeline,
  primaryButton,
  className,
  style,
  onNavigate,
  styles,
}: AboutTimelineProps) {
  return (
    <SectionShell className={className} style={{ backgroundColor: styles?.backgroundColor || "#fafaf9", ...style }}>
      <div className="space-y-12">
        <SectionHeading eyebrow={tagline} title={title} subtitle={description} />
        <div className="space-y-6 border-l-2 border-slate-200 pl-6">
          {items.map((item) => (
            <article key={`${item.year}-${item.title}`} className="relative rounded-[24px] bg-white p-6 shadow-sm">
              <span className="absolute -left-[2.15rem] top-8 h-4 w-4 rounded-full border-4 border-white" style={{ backgroundColor: accentValue(styles) }} />
              <div className="text-3xl font-black text-slate-300">{item.year}</div>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="flex justify-center">
          <ActionLink action={primaryButton} onNavigate={onNavigate} style={{ ["--accent" as string]: accentValue(styles) }} />
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutVideoFocus({
  eyebrow = "Contenido",
  title = "Muestra el proceso detras de la marca.",
  description = "Este bloque funciona bien cuando la historia visual pesa tanto como el catalogo.",
  videoPoster,
  primaryButton,
  className,
  style,
  onNavigate,
  styles,
}: AboutVideoFocusProps) {
  return (
    <SectionShell className={className} style={style}>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={description} align="left" />
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-950">
            <img src={resolveImage(videoPoster)} alt={title} className="aspect-video w-full object-cover opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-sm font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                Play
              </div>
            </div>
          </div>
          <ActionLink action={primaryButton} onNavigate={onNavigate} style={{ ["--accent" as string]: accentValue(styles) }} />
        </div>
      </div>
    </SectionShell>
  );
}

export function AboutCTA({
  title = "Listo para tu proximo proyecto?",
  primaryLink,
  secondaryLink,
  className,
  style,
  onNavigate,
  styles,
}: AboutCTAProps) {
  return (
    <SectionShell className={joinClasses("text-center", className)} style={{ backgroundColor: styles?.backgroundColor, ...style }}>
      <div className="space-y-6">
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <ActionLink action={primaryLink} onNavigate={onNavigate} style={{ ["--accent" as string]: accentValue(styles) }} />
          <ActionLink action={secondaryLink} onNavigate={onNavigate} variant="outline" />
        </div>
      </div>
    </SectionShell>
  );
}

function ClassicAboutHero({
  tagline = "Desde 2014",
  title = "Nuestra historia",
  description = "Una marca que combina operacion, producto y presencia digital con criterio comercial.",
  primaryButton,
  secondaryButton,
  backgroundImage,
  className,
  style,
  onNavigate,
  styles,
}: AboutHeroProps) {
  return (
    <SectionShell className={className} style={style}>
      <div className="relative overflow-hidden rounded-[36px]">
        <img src={resolveImage(backgroundImage)} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ backgroundColor: styles?.overlayColor || "#0f172a", opacity: styles?.overlayOpacity ?? 0.68 }} />
        <div className="relative z-10 flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center md:px-12">
          <span className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: accentValue(styles) }}>
            {tagline}
          </span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ActionLink action={primaryButton} onNavigate={onNavigate} style={{ ["--accent" as string]: accentValue(styles) }} />
            <ActionLink action={secondaryButton} onNavigate={onNavigate} variant="outline" />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export default function AboutHero(props: AboutHeroProps) {
  switch (props.variant) {
    case "split_image":
      return <AboutSplitImage {...props} />;
    case "timeline":
      return <AboutTimeline {...props} />;
    case "video_focus":
      return <AboutVideoFocus {...props} />;
    default:
      return <ClassicAboutHero {...props} />;
  }
}
