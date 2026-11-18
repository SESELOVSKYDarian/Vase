"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authInput, authLabel, authPrimaryButton } from "@/components/auth/auth-ui";
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
        <label className={authLabel} htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="nombre@tunegocio.com"
          className={authInput}
        />
        <FieldError message={state.fieldErrors?.email?.[0]} />
      </div>
      <SubmitButton pendingLabel="Enviando..." className={authPrimaryButton}>
        Mandarme el enlace
      </SubmitButton>
    </form>
  );
}
