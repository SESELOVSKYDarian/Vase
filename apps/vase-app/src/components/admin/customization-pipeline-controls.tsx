"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2, ClipboardList, FileText, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  moveCustomizationPipelineStageAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";
import { formatMoneyFromCents, getQuoteStatusLabel } from "@/lib/business/custom-quotes";

type PipelineTarget = "REQUESTS" | "WITHOUT_QUOTE" | "PENDING_CLIENT" | "ACCEPTED";

type CustomizationRequestItem = {
  id: string;
  pageScope: string;
  status: string;
  tenant: {
    accountName: string;
  };
  quote?: {
    status: string;
    totalAmountCents: number;
    currency: string;
  } | null;
};

const initialState: AdminGovernanceActionState = {};

const stages: Array<{
  key: PipelineTarget;
  label: string;
  shortLabel: string;
  icon: typeof ClipboardList;
  needsQuote?: boolean;
}> = [
  { key: "REQUESTS", label: "Pedido", shortLabel: "Pedido", icon: ClipboardList },
  { key: "WITHOUT_QUOTE", label: "Sin presupuesto", shortLabel: "Sin presupuesto", icon: FileText },
  { key: "PENDING_CLIENT", label: "Pendiente cliente", shortLabel: "Enviar", icon: Send, needsQuote: true },
  { key: "ACCEPTED", label: "Aceptado", shortLabel: "Aceptar", icon: CheckCircle2, needsQuote: true },
];

function resolveCurrentStage(request: CustomizationRequestItem): PipelineTarget {
  if (request.status === "SUBMITTED") return "REQUESTS";
  if (request.quote?.status === "ACCEPTED") return "ACCEPTED";
  if (request.quote?.status === "PENDING_CLIENT") return "PENDING_CLIENT";
  if (!request.quote || request.quote.status === "DRAFT") return "WITHOUT_QUOTE";
  return "REQUESTS";
}

function getStageLabel(stage: PipelineTarget) {
  return stages.find((item) => item.key === stage)?.label ?? "Pedido";
}

export function CustomizationPipelineControls({
  requests,
}: {
  requests: CustomizationRequestItem[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(moveCustomizationPipelineStageAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return (
    <section className="grid gap-3 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">
            Movimiento rapido
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Pasar clientes entre etapas
          </h2>
        </div>
        {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
      </div>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--muted)]">
          No hay solicitudes de personalizacion cargadas.
        </p>
      ) : (
        <div className="grid gap-2">
          {requests.map((request) => {
            const currentStage = resolveCurrentStage(request);
            return (
              <div
                key={request.id}
                className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-3 lg:grid-cols-[minmax(220px,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                    {request.tenant.accountName}
                  </p>
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {request.pageScope}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Actual: {getStageLabel(currentStage)}
                    {request.quote
                      ? ` · ${getQuoteStatusLabel(request.quote.status)} · ${formatMoneyFromCents(request.quote.totalAmountCents, request.quote.currency)}`
                      : " · sin presupuesto creado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stages.map((stage) => {
                    const Icon = stage.icon;
                    const disabled =
                      pending ||
                      currentStage === stage.key ||
                      Boolean(stage.needsQuote && !request.quote);

                    return (
                      <form key={stage.key} action={action}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="targetStage" value={stage.key} />
                        <button
                          type="submit"
                          disabled={disabled}
                          title={stage.needsQuote && !request.quote ? "Primero crea un presupuesto" : stage.label}
                          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Icon className="size-3.5" />
                          {currentStage === stage.key ? "Actual" : stage.shortLabel}
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
