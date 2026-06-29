import type { ReactNode } from "react";
import { clsx } from "clsx";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "vase-empty-state rounded-[28px] p-6 text-center",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="vase-kicker">Listo para empezar</p>
        <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h3>
        <p className="vase-copy mx-auto">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}
