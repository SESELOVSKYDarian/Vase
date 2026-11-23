"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authHint, authPrimaryButton } from "@/components/auth/auth-ui";
import { NewPasswordFields } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token, redirectTo = "/signin?reset=success" }: { token: string; redirectTo?: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {state.error && !Object.keys(fieldErrors).length ? <AuthNotice kind="error" message={state.error} /> : null}
      <NewPasswordFields serverErrors={{ password: fieldErrors.password?.[0], confirmPassword: fieldErrors.confirmPassword?.[0] }} />
      <p className={authHint}>Usá una que no uses en otro lado.</p>
      <SubmitButton pendingLabel="Guardando..." className={authPrimaryButton}>
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
