"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Blocks, Check, ChevronDown, ChevronRight, Save, Settings2, Shield, UserRound, X } from "lucide-react";
import { type AdminGovernanceActionState, updateUserTenantAccessSnapshotAction } from "@/app/(platform)/app/admin/actions";

type CatalogSubmodule = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type CatalogModule = {
  id: string;
  name: string;
  description: string | null;
  product: string;
  isActive: boolean;
  submodules: CatalogSubmodule[];
};

type MembershipAccess = {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantAccountName: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  moduleActivations: Array<{ moduleId: string; isActive: boolean }>;
  submoduleActivations: Array<{ submoduleId: string; isActive: boolean }>;
};

type UserAccessManagerModalProps = {
  user: {
    id: string;
    name: string;
    email: string;
    isDisabled: boolean;
  };
  memberships: MembershipAccess[];
  modulesCatalog: CatalogModule[];
};

const initialState: AdminGovernanceActionState = {};

export function AdminUserAccessManagerModal({ user, memberships, modulesCatalog }: UserAccessManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(memberships[0]?.tenantId ?? "");
  const [role, setRole] = useState<MembershipAccess["role"]>(memberships[0]?.role ?? "MEMBER");
  const [status, setStatus] = useState<MembershipAccess["status"]>(memberships[0]?.status ?? "ACTIVE");
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [submoduleStates, setSubmoduleStates] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const payloadRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction, pending] = useActionState(updateUserTenantAccessSnapshotAction, initialState);

  const selectedMembership = useMemo(
    () => memberships.find((membership) => membership.tenantId === selectedTenantId) ?? null,
    [memberships, selectedTenantId],
  );

  useEffect(() => {
    if (!open || !selectedMembership) return;

    setRole(selectedMembership.role);
    setStatus(selectedMembership.status);

    const moduleNext: Record<string, boolean> = {};
    const submoduleNext: Record<string, boolean> = {};

    for (const module of modulesCatalog) {
      moduleNext[module.id] = selectedMembership.moduleActivations.some(
        (item) => item.moduleId === module.id && item.isActive,
      );

      for (const submodule of module.submodules) {
        submoduleNext[submodule.id] = selectedMembership.submoduleActivations.some(
          (item) => item.submoduleId === submodule.id && item.isActive,
        );
      }
    }

    setModuleStates(moduleNext);
    setSubmoduleStates(submoduleNext);
  }, [modulesCatalog, open, selectedMembership]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (state.error) {
      setToast({ tone: "error", message: state.error });
    } else if (state.success) {
      setToast({ tone: "success", message: state.success });
      setOpen(false);
    }
  }, [state.error, state.success]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => firstFieldRef.current?.focus(), 20);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const buildPayload = () => {
    if (!selectedTenantId) return "";

    return JSON.stringify({
      userId: user.id,
      tenantId: selectedTenantId,
      tenantRole: role,
      membershipStatus: status,
      modules: modulesCatalog.map((module) => ({
        moduleId: module.id,
        isActive: Boolean(moduleStates[module.id]),
        submodules: module.submodules.map((submodule) => ({
          submoduleId: submodule.id,
          isActive: Boolean(submoduleStates[submodule.id]),
        })),
      })),
    });
  };

  const onSubmit = () => {
    if (payloadRef.current) {
      payloadRef.current.value = buildPayload();
    }
  };

  const toggleModule = (moduleId: string, next: boolean) => {
    setModuleStates((current) => ({ ...current, [moduleId]: next }));
    if (!next) {
      const module = modulesCatalog.find((item) => item.id === moduleId);
      if (!module) return;
      setSubmoduleStates((current) => {
        const update = { ...current };
        for (const submodule of module.submodules) {
          update[submodule.id] = false;
        }
        return update;
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (memberships.length === 0) return;
          setSelectedTenantId(memberships[0]?.tenantId ?? "");
          setOpen(true);
        }}
        disabled={memberships.length === 0}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <Settings2 className="h-4 w-4" />
        Gestionar accesos
      </button>
      {memberships.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Asigna primero un tenant para habilitar permisos por modulo.</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)} role="presentation">
          <div
            className="w-full max-w-4xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.2)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Gestionar accesos de usuario"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-soft)]">
                  <UserRound className="h-4 w-4" />
                  Gestion de accesos
                </p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{user.name}</h3>
                <p className="text-sm text-[var(--muted)]">{user.email}</p>
                <p className="text-xs text-[var(--muted)]">Estado de cuenta: {user.isDisabled ? "Deshabilitado" : "Activo"}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                aria-label="Cerrar modal de accesos"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} onSubmit={onSubmit} className="space-y-4">
              <input ref={payloadRef} type="hidden" name="payload" />

              <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Tenant</span>
                  <select
                    ref={firstFieldRef}
                    value={selectedTenantId}
                    onChange={(event) => setSelectedTenantId(event.target.value)}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"
                  >
                    {memberships.map((membership) => (
                      <option key={membership.membershipId} value={membership.tenantId}>
                        {membership.tenantAccountName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Rol tenant</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as MembershipAccess["role"])}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="MANAGER">Manager</option>
                    <option value="MEMBER">Member</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-soft)]">Estado</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as MembershipAccess["status"])}
                    className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INVITED">Invitado</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </select>
                </label>
              </div>

              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {modulesCatalog.map((module) => {
                  const expanded = expandedModules[module.id] ?? true;
                  const moduleActive = Boolean(moduleStates[module.id]);
                  return (
                    <section key={module.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                            <Blocks className="h-4 w-4" />
                            {module.name}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{module.description || "Sin descripcion"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm">
                            <input
                              type="checkbox"
                              checked={moduleActive}
                              onChange={(event) => toggleModule(module.id, event.target.checked)}
                            />
                            Activo
                          </label>
                          <button
                            type="button"
                            onClick={() => setExpandedModules((current) => ({ ...current, [module.id]: !expanded }))}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]"
                            aria-label={expanded ? "Cerrar funcionalidades" : "Abrir funcionalidades"}
                          >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {expanded ? (
                        <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
                          {module.submodules.length === 0 ? (
                            <p className="text-xs text-[var(--muted)]">Sin funcionalidades configuradas.</p>
                          ) : (
                            <div className="grid gap-2">
                              {module.submodules.map((submodule) => (
                                <label
                                  key={submodule.id}
                                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm"
                                >
                                  <span>
                                    <span className="font-medium text-[var(--foreground)]">{submodule.name}</span>
                                    <span className="ml-2 text-xs text-[var(--muted)]">{submodule.description ?? "Sin descripcion"}</span>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(submoduleStates[submodule.id])}
                                    disabled={!moduleActive}
                                    onChange={(event) =>
                                      setSubmoduleStates((current) => ({
                                        ...current,
                                        [submodule.id]: event.target.checked,
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Shield className="h-4 w-4" />
                  Las funcionalidades dependen del modulo padre activo.
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {pending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[130] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm shadow-lg">
          <p className={`inline-flex items-center gap-2 ${toast.tone === "success" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {toast.tone === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </p>
        </div>
      ) : null}
    </>
  );
}
