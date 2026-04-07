"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { requestDomainConnectionAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

type DomainRequestFormProps = {
  disabled: boolean;
  defaultPageId?: string;
  pages?: Array<{
    id: string;
    name: string;
  }>;
};

export function DomainRequestForm({ disabled, defaultPageId, pages = [] }: DomainRequestFormProps) {
  const [state, formAction] = useActionState(requestDomainConnectionAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="hostname">
          Dominio propio
        </label>
        <input
          id="hostname"
          name="hostname"
          type="text"
          placeholder="tienda.tumarca.com"
          disabled={disabled}
          className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.hostname?.[0]} />
      </div>
      {defaultPageId ? <input type="hidden" name="storefrontPageId" value={defaultPageId} /> : null}
      {!defaultPageId && pages.length > 0 ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="storefrontPageId">
            Sitio a conectar
          </label>
          <select
            id="storefrontPageId"
            name="storefrontPageId"
            disabled={disabled}
            className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
            defaultValue={pages[0]?.id ?? ""}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <SubmitButton
        pendingLabel="Guardando dominio..."
        className="min-h-12 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Solicitar conexion de dominio
      </SubmitButton>
    </form>
  );
}
