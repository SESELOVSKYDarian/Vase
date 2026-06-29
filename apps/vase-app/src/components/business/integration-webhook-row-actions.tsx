"use client";

import { useActionState } from "react";
import {
  pauseIntegrationWebhookAction,
  type IntegrationActionState,
} from "@/app/(platform)/app/owner/integrations/api/actions";

const initialState: IntegrationActionState = {};

type IntegrationWebhookRowActionsProps = {
  webhookId: string;
};

export function IntegrationWebhookRowActions({
  webhookId,
}: IntegrationWebhookRowActionsProps) {
  const [state, formAction] = useActionState(pauseIntegrationWebhookAction, initialState);

  return (
    <div className="grid gap-2">
      <form action={formAction}>
        <input type="hidden" name="webhookId" value={webhookId} />
        <button
          type="submit"
          className="min-h-10 rounded-full border border-[var(--accent)] px-4 text-sm font-semibold text-[var(--foreground)]"
        >
          Pausar
        </button>
      </form>
      {state.success ? <p className="text-sm leading-6 text-[var(--success)]">{state.success}</p> : null}
      {state.error ? <p className="text-sm leading-6 text-[var(--danger)]">{state.error}</p> : null}
    </div>
  );
}
