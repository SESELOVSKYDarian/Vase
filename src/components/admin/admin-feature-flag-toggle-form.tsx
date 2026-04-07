"use client";

import { useActionState } from "react";
import {
  toggleFeatureFlagAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type AdminFeatureFlagToggleFormProps = {
  flagId: string;
  enabled: boolean;
};

export function AdminFeatureFlagToggleForm({
  flagId,
  enabled,
}: AdminFeatureFlagToggleFormProps) {
  const [state, formAction] = useActionState(toggleFeatureFlagAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="flagId" value={flagId} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        className="min-h-10 rounded-full border border-[var(--accent)] px-4 text-xs font-semibold text-[var(--foreground)]"
      >
        {enabled ? "Desactivar" : "Activar"}
      </button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
    </form>
  );
}
