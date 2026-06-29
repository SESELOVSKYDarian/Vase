"use client";

import { useActionState } from "react";
import {
  createDeveloperUserAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

const initialState: AdminGovernanceActionState = {};

export function AdminDeveloperUserForm() {
  const [state, formAction] = useActionState(createDeveloperUserAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
      <input name="name" placeholder="Nombre del desarrollador" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="email" placeholder="Email" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="specialty" placeholder="Especialidad (Frontend, Backend, Fullstack...)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="phone" placeholder="Telefono (opcional)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <input name="password" placeholder="Contrasena temporal (opcional)" className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
      <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Crear desarrollador</button>
      {state.error ? <p className="text-xs text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-[var(--success)]">{state.success}</p> : null}
    </form>
  );
}
