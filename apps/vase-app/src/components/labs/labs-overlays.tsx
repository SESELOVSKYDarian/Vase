"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

type OverlayProps = PropsWithChildren<{
  trigger: ReactNode;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
}>;

const modalSize = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function LabsModal({ trigger, title, description, size = "md", children }: OverlayProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={clsx("labs-panel max-h-[90vh] w-full overflow-y-auto p-5 shadow-[var(--shadow-lg)]", modalSize[size])}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </section>
        </div>
      ) : null}
    </>
  );
}

export function LabsDrawer({ trigger, title, description, children }: OverlayProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[var(--shadow-lg)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </h2>
                {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>
            {children}
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function LabsSegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "min-h-9 rounded-lg px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
            value === option.value
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
