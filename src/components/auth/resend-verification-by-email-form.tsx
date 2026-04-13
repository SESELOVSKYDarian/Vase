"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resendVerificationByEmailAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

type ResendVerificationByEmailFormProps = {
  email?: string;
};

export function ResendVerificationByEmailForm({
  email = "",
}: ResendVerificationByEmailFormProps) {
  const [state, formAction] = useActionState(
    resendVerificationByEmailAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label
          htmlFor="resend-email"
          className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]"
        >
          Email
        </label>
        <input
          id="resend-email"
          name="email"
          type="email"
          defaultValue={email}
          className="min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--foreground)]"
          autoComplete="email"
          required
        />
        <FieldError message={state.fieldErrors?.email?.[0]} />
      </div>
      <SubmitButton
        pendingLabel="Reenviando..."
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
      >
        Reenviar verificacion
      </SubmitButton>
    </form>
  );
}
