import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

type CtaBandProps = {
  title: string;
  description: string;
};

export function CtaBand({ title, description }: CtaBandProps) {
  return (
    <ScrollReveal variant="section" className="vase-glass-panel rounded-[36px] px-6 py-8 text-[var(--foreground)] sm:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <ScrollReveal variant="text">
            <p className="vase-kicker">Next step</p>
          </ScrollReveal>
          <ScrollReveal variant="text" delay={0.04}>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          </ScrollReveal>
          <ScrollReveal variant="text" delay={0.08}>
            <p className="text-base leading-8 text-[var(--muted)]">{description}</p>
          </ScrollReveal>
        </div>
        <ScrollReveal variant="text" delay={0.12} className="flex flex-col gap-3 sm:flex-row">
          <Link href="/register" className={buttonStyles({ tone: "primary" })}>
            Registrarse
          </Link>
          <Link href="/demo" className={buttonStyles({ tone: "secondary" })}>
            Solicitar demo
          </Link>
        </ScrollReveal>
      </div>
    </ScrollReveal>
  );
}
