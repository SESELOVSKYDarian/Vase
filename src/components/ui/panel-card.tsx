import type { PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";

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
    <section
      className={clsx(
        "surface-card rounded-[28px] p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="vase-kicker">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          {description ? (
            <p className="vase-copy">{description}</p>
          ) : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
