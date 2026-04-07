"use client";

import { useActionState } from "react";
import {
  sendCustomizationQuoteAction,
  type AdminGovernanceActionState,
  upsertCustomizationQuoteAction,
} from "@/app/(platform)/app/admin/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { StatusBadge } from "@/components/business/status-badge";
import {
  formatMoneyFromCents,
  getQuoteStatusLabel,
  getQuoteStatusTone,
  getQuoteTemplateLabel,
  quoteTemplateKeys,
} from "@/lib/business/custom-quotes";

const initialState: AdminGovernanceActionState = {};

type AdminCustomizationQuoteFormProps = {
  requestId: string;
  quote?: {
    id: string;
    quoteNumber: string;
    templateKey: string;
    status: string;
    currency: string;
    baseAmountCents: number;
    extrasAmountCents: number;
    totalAmountCents: number;
    estimatedDeliveryDays: number;
    validUntil: Date | null;
    clientSummary: string;
    internalSummary: string | null;
    observations: string | null;
    lineItems: Array<{
      lineType: string;
      totalAmountCents: number;
    }>;
  } | null;
};

function getLineAmountUnits(
  quote: AdminCustomizationQuoteFormProps["quote"],
  lineType: string,
) {
  const total = quote?.lineItems.find((item) => item.lineType === lineType)?.totalAmountCents ?? 0;
  return Math.trunc(total / 100);
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function AdminCustomizationQuoteForm({
  requestId,
  quote,
}: AdminCustomizationQuoteFormProps) {
  const [state, formAction] = useActionState(upsertCustomizationQuoteAction, initialState);
  const [sendState, sendAction] = useActionState(sendCustomizationQuoteAction, initialState);

  return (
    <div className="grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {quote ? `Presupuesto ${quote.quoteNumber}` : "Nuevo presupuesto"}
          </p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Usa una plantilla comercial, estima tiempos y desglosa extras por tipo.
          </p>
        </div>
        {quote ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={getQuoteStatusTone(quote.status)}
              label={getQuoteStatusLabel(quote.status)}
            />
            <span className="text-sm font-medium text-[var(--muted)]">
              {formatMoneyFromCents(quote.totalAmountCents, quote.currency)}
            </span>
          </div>
        ) : null}
      </div>

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="requestId" value={requestId} />
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Plantilla</span>
            <select
              name="templateKey"
              defaultValue={quote?.templateKey ?? "STANDARD"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              {quoteTemplateKeys.map((templateKey) => (
                <option key={templateKey} value={templateKey}>
                  {getQuoteTemplateLabel(templateKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Moneda</span>
            <select
              name="currency"
              defaultValue={quote?.currency ?? "USD"}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Entrega estimada</span>
            <input
              name="estimatedDeliveryDays"
              type="number"
              min={3}
              defaultValue={quote?.estimatedDeliveryDays ?? 21}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Base plantilla</span>
            <input
              name="baseTemplateAmountUnits"
              type="number"
              min={1}
              defaultValue={getLineAmountUnits(quote, "BASE_TEMPLATE") || 1500}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Extras funcionales</span>
            <input
              name="featureExtraAmountUnits"
              type="number"
              min={0}
              defaultValue={getLineAmountUnits(quote, "FEATURE")}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Extras diseno</span>
            <input
              name="designExtraAmountUnits"
              type="number"
              min={0}
              defaultValue={getLineAmountUnits(quote, "DESIGN")}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Extras integracion</span>
            <input
              name="integrationExtraAmountUnits"
              type="number"
              min={0}
              defaultValue={getLineAmountUnits(quote, "INTEGRATION")}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Extras implementacion</span>
            <input
              name="serviceExtraAmountUnits"
              type="number"
              min={0}
              defaultValue={getLineAmountUnits(quote, "SERVICE")}
              className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--foreground)]">Resumen para cliente</span>
            <textarea
              name="clientSummary"
              rows={4}
              defaultValue={quote?.clientSummary ?? ""}
              className="min-h-28 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
              placeholder="Incluye alcance, valor entregado, tiempos y supuestos de negocio."
            />
          </label>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Valido hasta</span>
              <input
                name="validUntil"
                type="date"
                defaultValue={toDateInputValue(quote?.validUntil)}
                className="min-h-11 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--foreground)]">Observaciones</span>
              <textarea
                name="observations"
                rows={3}
                defaultValue={quote?.observations ?? ""}
                className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
                placeholder="Dependencias, exclusiones o condiciones especiales."
              />
            </label>
          </div>
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[var(--foreground)]">Notas internas</span>
          <textarea
            name="internalSummary"
            rows={3}
            defaultValue={quote?.internalSummary ?? ""}
            className="min-h-24 rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 py-3 text-[var(--foreground)]"
            placeholder="Notas internas para operaciones, sales o delivery."
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <SubmitButton
            pendingLabel="Guardando presupuesto..."
            className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
          >
            Guardar presupuesto
          </SubmitButton>
        </div>

        {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
        {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
        {sendState.error ? <p className="text-sm leading-6 text-[var(--danger)]">{sendState.error}</p> : null}
        {sendState.success ? (
          <p className="text-sm leading-6 text-[var(--success)]">{sendState.success}</p>
        ) : null}
      </form>

      {quote ? (
        <form action={sendAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="quoteId" value={quote.id} />
          <SubmitButton
            pendingLabel="Enviando..."
            className="min-h-11 rounded-full border border-[var(--accent)] px-5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
          >
            Enviar al cliente
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
