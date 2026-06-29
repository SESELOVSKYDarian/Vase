"use client";

import { useActionState } from "react";
import type { PropsWithChildren } from "react";
import type { AuthActionState } from "@/app/(auth)/actions";
import { AuthNotice } from "@/components/auth/auth-notice";

type ActionSectionProps = PropsWithChildren<{
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  initialState?: AuthActionState;
  className?: string;
}>;

const defaultState: AuthActionState = {};

export function ActionSection({
  action,
  initialState = defaultState,
  className,
  children,
}: ActionSectionProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className}>
      <AuthNotice kind="success" message={state.success} />
      <AuthNotice kind="error" message={state.error} />
      <div className="mt-4 grid gap-4">{children}</div>
    </form>
  );
}
