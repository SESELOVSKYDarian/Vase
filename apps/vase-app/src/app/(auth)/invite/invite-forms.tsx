"use client";

import { useActionState } from "react";
import {
  acceptInviteExistingUserAction,
  acceptInviteNewUserAction,
  type InviteActionState,
} from "@/app/(auth)/invite/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { authInput, authPrimaryButton } from "@/components/auth/auth-ui";
import { NewPasswordFields } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: InviteActionState = {};
const inputClass = authInput;
const buttonClass = authPrimaryButton;

export function NewUserInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptInviteNewUserAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <AuthNotice kind="error" message={state.error} />
      <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
        <span>Tu nombre</span>
        <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} />
      </label>
      <NewPasswordFields passwordLabel="Contraseña" confirmLabel="Repetí la contraseña" />
      <SubmitButton pendingLabel="Creando tu acceso..." className={buttonClass}>
        Crear mi acceso
      </SubmitButton>
    </form>
  );
}

export function ExistingUserInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptInviteExistingUserAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <AuthNotice kind="error" message={state.error} />
      <SubmitButton pendingLabel="Aceptando..." className={buttonClass}>
        Aceptar invitación
      </SubmitButton>
    </form>
  );
}
