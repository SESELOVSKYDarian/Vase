"use client";

import { useActionState } from "react";
import {
  type AdminGovernanceActionState,
  updateAdminAccessPolicyAction,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

type Policy = {
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageFaqs: boolean;
  canManageWiki: boolean;
  canViewAudit: boolean;
  canManageNotifications: boolean;
} | null;

export function AdminAccessPolicyForm({
  userId,
  policy,
}: {
  userId: string;
  policy: Policy;
}) {
  const [state, formAction] = useActionState(updateAdminAccessPolicyAction, initialState);

  return (
    <form action={formAction} className="mt-3 grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-semibold text-[var(--foreground)]">Permisos modulares</p>
      <label className="text-xs"><input name="canManageUsers" type="checkbox" defaultChecked={policy?.canManageUsers ?? false} /> Usuarios</label>
      <label className="text-xs"><input name="canManageBilling" type="checkbox" defaultChecked={policy?.canManageBilling ?? false} /> Billing</label>
      <label className="text-xs"><input name="canManageFaqs" type="checkbox" defaultChecked={policy?.canManageFaqs ?? false} /> FAQs</label>
      <label className="text-xs"><input name="canManageWiki" type="checkbox" defaultChecked={policy?.canManageWiki ?? false} /> Wiki</label>
      <label className="text-xs"><input name="canViewAudit" type="checkbox" defaultChecked={policy?.canViewAudit ?? false} /> Auditoria</label>
      <label className="text-xs"><input name="canManageNotifications" type="checkbox" defaultChecked={policy?.canManageNotifications ?? false} /> Notificaciones</label>
      <button className="w-fit rounded-xl border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold">Guardar permisos</button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}
