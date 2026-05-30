"use client";

import { Check, X } from "lucide-react";

type ActionToastProps = {
  toast: {
    tone: "success" | "error";
    message: string;
  } | null;
};

export function ActionToast({ toast }: ActionToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[130] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm shadow-lg">
      <p className={`inline-flex items-center gap-2 ${toast.tone === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
        {toast.tone === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {toast.message}
      </p>
    </div>
  );
}
