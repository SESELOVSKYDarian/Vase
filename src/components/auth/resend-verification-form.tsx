"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function ResendVerificationForm() {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <SubmitButton
        pendingLabel="Reenviando..."
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
      >
        Reenviar verificacion
      </SubmitButton>
    </form>
  );
}
