import type { PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

type PanelCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function PanelCard({
  title,
  eyebrow,
  description,
  actions,
  className,
  children,
}: PanelCardProps) {
  return (
    <ScrollReveal
      variant="card"
      className={clsx(
        "surface-card rounded-[28px] p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <ScrollReveal variant="text">
              <p className="vase-kicker">
                {eyebrow}
              </p>
            </ScrollReveal>
          ) : null}
          <ScrollReveal variant="text" delay={0.04}>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          </ScrollReveal>
          {description ? (
            <ScrollReveal variant="text" delay={0.08}>
              <p className="vase-copy">{description}</p>
            </ScrollReveal>
          ) : null}
        </div>
        {actions ? <ScrollReveal variant="text" delay={0.12}>{actions}</ScrollReveal> : null}
      </div>
      {children ? <ScrollReveal variant="text" delay={0.12} className="mt-6">{children}</ScrollReveal> : null}
    </ScrollReveal>
  );
}
