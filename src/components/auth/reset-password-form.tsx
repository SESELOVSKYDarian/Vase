"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="password">
          Nueva contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.password?.[0]} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="confirmPassword">
          Confirmar contrasena
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={10}
          className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]"
        />
        <FieldError message={state.fieldErrors?.confirmPassword?.[0]} />
      </div>
      <SubmitButton
        pendingLabel="Actualizando..."
        className="min-h-12 w-full rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Actualizar contrasena
      </SubmitButton>
    </form>
  );
}
