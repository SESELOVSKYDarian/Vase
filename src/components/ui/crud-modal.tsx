"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type CrudModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
};

export function CrudModal({
  open,
  title,
  description,
  onClose,
  children,
  widthClassName = "max-w-2xl",
}: CrudModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 20);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4" onClick={onClose} role="presentation">
      <div
        className={`w-full ${widthClassName} rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.2)]`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
            {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
