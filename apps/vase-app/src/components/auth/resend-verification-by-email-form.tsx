"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resendVerificationByEmailAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { FieldError } from "@/components/auth/field-error";
import { authInput, authLabel, authPrimaryButton } from "@/components/auth/auth-ui";
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
        <label htmlFor="resend-email" className={authLabel}>
          Correo
        </label>
        <input
          id="resend-email"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={email}
          className={authInput}
          autoComplete="email"
          required
        />
        <FieldError message={state.fieldErrors?.email?.[0]} />
      </div>
      <SubmitButton pendingLabel="Reenviando..." className={authPrimaryButton}>
        Mandarme el enlace de nuevo
      </SubmitButton>
    </form>
  );
}
