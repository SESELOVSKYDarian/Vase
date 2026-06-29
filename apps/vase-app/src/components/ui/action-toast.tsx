"use client";

import { AlertTriangle, Check, Info, X } from "lucide-react";

type ActionToastProps = {
  toast: {
    tone: "success" | "error" | "warning" | "info";
    title?: string;
    message: string;
  } | null;
};

const toastConfig = {
  success: {
    icon: Check,
    className: "text-[var(--success)]",
    label: "Operacion realizada",
  },
  error: {
    icon: X,
    className: "text-[var(--danger)]",
    label: "No se pudo completar",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-[var(--warning)]",
    label: "Atencion requerida",
  },
  info: {
    icon: Info,
    className: "text-[var(--accent-strong)]",
    label: "Informacion",
  },
};

export function ActionToast({ toast }: ActionToastProps) {
  if (!toast) return null;
  const config = toastConfig[toast.tone];
  const Icon = config.icon;

  return (
    <div
      className="fixed bottom-5 right-5 z-[130] max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm shadow-[0_18px_60px_rgba(15,23,42,0.22)]"
      role="status"
      aria-live="polite"
    >
      <div className={`flex items-start gap-3 ${config.className}`}>
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-current/10">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold">{toast.title ?? config.label}</p>
          <p className="mt-0.5 text-[var(--muted)]">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}
