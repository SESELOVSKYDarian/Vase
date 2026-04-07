"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.email?.[0]} />
      </div>
      <SubmitButton
        pendingLabel="Enviando..."
        className="min-h-12 w-full rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Enviar instrucciones
      </SubmitButton>
    </form>
  );
}
