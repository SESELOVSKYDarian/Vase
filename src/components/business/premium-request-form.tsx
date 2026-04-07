"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { requestPremiumPlanAction } from "@/app/(platform)/app/owner/actions";
import { AuthNotice } from "@/components/auth/auth-notice";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AuthActionState = {};

export function PremiumRequestForm() {
  const [state, formAction] = useActionState(requestPremiumPlanAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <SubmitButton
        pendingLabel="Registrando interes..."
        className="min-h-12 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
      >
        Pasar a premium
      </SubmitButton>
    </form>
  );
}
