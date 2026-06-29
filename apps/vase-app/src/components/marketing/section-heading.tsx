import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
}: SectionHeadingProps) {
  return (
    <ScrollReveal variant="section" className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-3">
        {eyebrow ? (
          <ScrollReveal variant="text">
            <p className="vase-kicker">{eyebrow}</p>
          </ScrollReveal>
        ) : null}
        <ScrollReveal variant="text" delay={0.04}>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            {title}
          </h1>
        </ScrollReveal>
        {description ? (
          <ScrollReveal variant="text" delay={0.08}>
            <p className="text-base leading-8 text-[var(--muted)] sm:text-lg">{description}</p>
          </ScrollReveal>
        ) : null}
      </div>
      {actions ? <ScrollReveal variant="text" delay={0.12}>{actions}</ScrollReveal> : null}
    </ScrollReveal>
  );
}
