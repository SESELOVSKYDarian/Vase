import type { ComponentPropsWithoutRef, ElementType, PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { PanelEmpty, PanelTag, type PanelTone } from "@vase/ui/panel";

// Piezas de Labs sobre las del panel de Vase (@vase/ui). Las pantallas viejas las siguen usando
// con los mismos nombres, pero ahora se ven igual que app.vase.ar.

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const toneToPanel: Record<Tone, PanelTone> = { neutral: "n", success: "g", warning: "y", danger: "r", info: "b" };

/** El título de cada sección ya está en la barra de arriba: acá quedan solo las acciones. */
export function LabsPageHeader({ actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return actions ? <div className="labs-tabs-row"><span /><div className="vpa-cacts">{actions}</div></div> : null;
}

type LabsSectionProps = PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}> &
  Omit<ComponentPropsWithoutRef<"section">, "title">;

export function LabsSection({ title, description, actions, className, children, eyebrow: _eyebrow, ...sectionProps }: LabsSectionProps) {
  return (
    <section className={clsx("vpa-card", className)} {...sectionProps}>
      {title || description || actions ? (
        <div className="vpa-sech">
          <div className="vpa-g1">
            {title ? <h3>{title}</h3> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="vpa-cacts">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function LabsMetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string; icon?: ElementType; tone?: Tone }) {
  return (
    <div className="vpa-kpi">
      <span className="vpa-kt">
        <small>{label}</small>
        <b>{value}</b>
        {detail ? <em>{detail}</em> : null}
      </span>
    </div>
  );
}

export function LabsEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <PanelEmpty action={action}>
      <b>{title}</b>
      {description ? <p className="vpa-mut" style={{ marginTop: 4, fontWeight: 600 }}>{description}</p> : null}
    </PanelEmpty>
  );
}

export function LabsStatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <PanelTag tone={toneToPanel[tone]}>{label}</PanelTag>;
}

export function LabsActionLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <Link href={href as never} className="vpa-btn acc">
      {children}
    </Link>
  );
}
