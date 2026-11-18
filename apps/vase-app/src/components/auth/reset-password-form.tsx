"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authHint, authInput, authLabel, authPrimaryButton } from "@/components/auth/auth-ui";
import { FieldError } from "@/components/auth/field-error";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token, redirectTo = "/signin?reset=success" }: { token: string; redirectTo?: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <AuthNotice kind="error" message={state.error} />
      <div className="space-y-2">
        <label className={authLabel} htmlFor="password">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={authInput}
        />
        <FieldError message={state.fieldErrors?.password?.[0]} />
      </div>
      <div className="space-y-2">
        <label className={authLabel} htmlFor="confirmPassword">
          Repetila
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className={authInput}
        />
        <FieldError message={state.fieldErrors?.confirmPassword?.[0]} />
      </div>
      <p className={authHint}>Usá una que no uses en otro lado.</p>
      <SubmitButton pendingLabel="Guardando..." className={authPrimaryButton}>
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
