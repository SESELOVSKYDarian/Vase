"use client";

import { useActionState } from "react";
import {
  acceptInviteExistingUserAction,
  acceptInviteNewUserAction,
  type InviteActionState,
} from "@/app/(auth)/invite/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: InviteActionState = {};
const inputClass =
  "min-h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] px-4 text-[var(--foreground)]";
const buttonClass =
  "min-h-12 w-full rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60";

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
      <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
        <span>Contraseña</span>
        <input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
        <span>Repetí la contraseña</span>
        <input name="confirmPassword" type="password" required minLength={12} maxLength={72} autoComplete="new-password" className={inputClass} />
      </label>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
      </p>
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
