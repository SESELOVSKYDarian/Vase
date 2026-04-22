"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { Bot, CircleHelp, LifeBuoy, MessageSquareWarning, Sparkles, X } from "lucide-react";
import { ClientSupportTicketForm } from "@/components/support/client-support-ticket-form";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";

type DashboardSupportWidgetProps = {
  tenantName: string;
  conversationOptions: Array<{
    id: string;
    label: string;
  }>;
  supportSummary: {
    active: number;
    queued: number;
    resolved: number;
  };
};

export function DashboardSupportWidget({
  tenantName,
  conversationOptions,
  supportSummary,
}: DashboardSupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"assistant" | "ticket">("assistant");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-strong)] text-[var(--accent-contrast)] shadow-[0_20px_40px_rgba(0,109,67,0.22)] transition hover:scale-[1.02] hover:opacity-95"
        aria-label="Abrir asistencia Vase"
      >
        <LifeBuoy className="size-6" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-[rgba(16,20,26,0.18)] p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-[26rem] rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--background)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Soporte Vase
                </p>
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">
                  Asistencia para {tenantName}
                </h3>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Consulta ayuda rápida, abre un ticket humano o navega directo a lo que necesitas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                aria-label="Cerrar asistencia"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTab("assistant")}
                className={[
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  tab === "assistant"
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--foreground)]",
                ].join(" ")}
              >
                <Bot className="size-4" />
                Asistente
              </button>
              <button
                type="button"
                onClick={() => setTab("ticket")}
                className={[
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                  tab === "ticket"
                    ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-strong)] text-[var(--foreground)]",
                ].join(" ")}
              >
                <MessageSquareWarning className="size-4" />
                Ticket humano
              </button>
            </div>

            {tab === "assistant" ? (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] bg-[var(--surface-strong)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]">
                      <Sparkles className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        Estado del soporte
                      </p>
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        Tienes {supportSummary.active} ticket{supportSummary.active === 1 ? "" : "s"} activo
                        {supportSummary.active === 1 ? "" : "s"}, {supportSummary.queued} en cola y{" "}
                        {supportSummary.resolved} resuelto{supportSummary.resolved === 1 ? "" : "s"}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    { href: "/app/help", label: "Abrir centro de ayuda", icon: CircleHelp },
                    { href: "/app/billing", label: "Ver planes y facturación", icon: Sparkles },
                    { href: BUSINESS_WORKSPACE_PATH, label: "Ir a Vase Business", icon: LifeBuoy },
                    { href: "/app/labs", label: "Ir a Vase Labs", icon: Bot },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href as Route}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ClientSupportTicketForm conversationOptions={conversationOptions} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
