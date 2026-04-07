"use client";

import { useActionState } from "react";
import {
  revokeIntegrationCredentialAction,
  rotateIntegrationCredentialAction,
  type IntegrationActionState,
} from "@/app/(platform)/app/owner/integrations/api/actions";

const initialState: IntegrationActionState = {};

type IntegrationCredentialRowActionsProps = {
  credentialId: string;
};

export function IntegrationCredentialRowActions({
  credentialId,
}: IntegrationCredentialRowActionsProps) {
  const [rotateState, rotateAction] = useActionState(
    rotateIntegrationCredentialAction,
    initialState,
  );
  const [revokeState, revokeAction] = useActionState(
    revokeIntegrationCredentialAction,
    initialState,
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <form action={rotateAction}>
          <input type="hidden" name="credentialId" value={credentialId} />
          <button
            type="submit"
            className="min-h-10 rounded-full border border-[var(--accent)] px-4 text-sm font-semibold text-[var(--foreground)]"
          >
            Rotar
          </button>
        </form>
        <form action={revokeAction}>
          <input type="hidden" name="credentialId" value={credentialId} />
          <button
            type="submit"
            className="min-h-10 rounded-full border border-[#E7C7C1] px-4 text-sm font-semibold text-[var(--danger)]"
          >
            Revocar
          </button>
        </form>
      </div>

      {rotateState.success ? <p className="text-sm leading-6 text-[var(--success)]">{rotateState.success}</p> : null}
      {rotateState.secret ? (
        <pre className="overflow-x-auto rounded-[22px] bg-[var(--accent-strong)] p-4 text-sm text-[var(--foreground)]">
          <code>{rotateState.secret}</code>
        </pre>
      ) : null}
      {rotateState.error ? <p className="text-sm leading-6 text-[var(--danger)]">{rotateState.error}</p> : null}
      {revokeState.success ? <p className="text-sm leading-6 text-[var(--success)]">{revokeState.success}</p> : null}
      {revokeState.error ? <p className="text-sm leading-6 text-[var(--danger)]">{revokeState.error}</p> : null}
    </div>
  );
}
