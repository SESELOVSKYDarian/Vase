"use client";

import { Fragment, useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminModuleAction,
  createModuleSubmoduleAction,
  deleteAdminModuleAction,
  deleteModuleSubmoduleAction,
  updateAdminModuleAction,
  updateModuleSubmoduleAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";
import { CrudModal } from "@/components/ui/crud-modal";

type SubmoduleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string;
  isActive: boolean;
};

type ModuleView = {
  id: string;
  name: string;
  description: string | null;
  product: "BUSINESS" | "LABS" | "MANAGEMENT";
  route: string;
  isActive: boolean;
  submodules: SubmoduleView[];
};

type Props = {
  modules: ModuleView[];
};

const initialState: AdminGovernanceActionState = {};

type ModuleModalMode = "create" | "edit";
type SubmoduleModalMode = "create" | "edit";

export function AdminModulesConsole({ modules }: Props) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleModalMode, setModuleModalMode] = useState<ModuleModalMode | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleView | null>(null);
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleView | null>(null);
  const [submoduleModalMode, setSubmoduleModalMode] = useState<SubmoduleModalMode | null>(null);
  const [selectedSubmodule, setSelectedSubmodule] = useState<SubmoduleView | null>(null);
  const [submoduleParentModule, setSubmoduleParentModule] = useState<ModuleView | null>(null);
  const [deleteSubmoduleTarget, setDeleteSubmoduleTarget] = useState<SubmoduleView | null>(null);

  const [createModuleState, createModuleFormAction] = useActionState(createAdminModuleAction, initialState);
  const [updateModuleState, updateModuleFormAction] = useActionState(updateAdminModuleAction, initialState);
  const [deleteModuleState, deleteModuleFormAction] = useActionState(deleteAdminModuleAction, initialState);
  const [createSubmoduleState, createSubmoduleFormAction] = useActionState(createModuleSubmoduleAction, initialState);
  const [updateSubmoduleState, updateSubmoduleFormAction] = useActionState(updateModuleSubmoduleAction, initialState);
  const [deleteSubmoduleState, deleteSubmoduleFormAction] = useActionState(deleteModuleSubmoduleAction, initialState);

  const actionFeedback = useMemo(() => {
    const states = [
      createModuleState,
      updateModuleState,
      deleteModuleState,
      createSubmoduleState,
      updateSubmoduleState,
      deleteSubmoduleState,
    ];
    const lastError = states.map((state) => state.error).filter(Boolean).at(-1);
    const lastSuccess = states.map((state) => state.success).filter(Boolean).at(-1);
    return { lastError, lastSuccess };
  }, [
    createModuleState,
    updateModuleState,
    deleteModuleState,
    createSubmoduleState,
    updateSubmoduleState,
    deleteSubmoduleState,
  ]);

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules((previous) => ({ ...previous, [moduleId]: !previous[moduleId] }));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Módulos</h2>
          <p className="text-sm text-[var(--muted)]">Gestiona módulos y submódulos desde una sola tabla expandible.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedModule(null);
            setModuleModalMode("create");
          }}
          className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border-subtle)] text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          aria-label="Crear módulo"
          title="Crear módulo"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--surface)] text-left text-xs uppercase tracking-[0.08em] text-[var(--muted-soft)]">
            <tr>
              <th className="px-4 py-3">Módulo</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => {
              const isExpanded = expandedModules[module.id] ?? false;
              return (
                <Fragment key={module.id}>
                  <tr className="border-t border-[var(--border-subtle)] text-[var(--foreground)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(module.id)}
                          className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--muted)] hover:text-[var(--foreground)]"
                          aria-label={isExpanded ? "Contraer submódulos" : "Expandir submódulos"}
                          title={isExpanded ? "Contraer submódulos" : "Expandir submódulos"}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div>
                          <p className="font-medium">{module.name}</p>
                          <p className="text-xs text-[var(--muted)]">{module.description ?? "Sin descripción"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{module.product === "BUSINESS" ? "Business" : module.product === "LABS" ? "Labs" : "Management"}</td>
                    <td className="px-4 py-3">{module.route}</td>
                    <td className="px-4 py-3">{module.isActive ? "Activo" : "Inactivo"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubmoduleParentModule(module);
                            setSelectedSubmodule(null);
                            setSubmoduleModalMode("create");
                          }}
                          className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                          aria-label="Crear submódulo"
                          title="Crear submódulo"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModule(module);
                            setModuleModalMode("edit");
                          }}
                          className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                          aria-label="Editar módulo"
                          title="Editar módulo"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModuleTarget(module)}
                          className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--danger)] hover:bg-[var(--surface)]"
                          aria-label="Eliminar módulo"
                          title="Eliminar módulo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-t border-[var(--border-subtle)] bg-[var(--surface)]">
                      <td colSpan={5} className="px-4 py-3">
                        {module.submodules.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">Sin submódulos.</p>
                        ) : (
                          <div className="space-y-2">
                            {module.submodules.map((submodule) => (
                              <div
                                key={submodule.id}
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px_108px] items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-2"
                              >
                                <div>
                                  <p className="font-medium text-[var(--foreground)]">{submodule.name}</p>
                                  <p className="text-xs text-[var(--muted)]">{submodule.description ?? "Sin descripción"}</p>
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">{submodule.route}</p>
                                <p className="text-xs text-[var(--muted)]">{submodule.isActive ? "Activo" : "Inactivo"}</p>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubmoduleParentModule(module);
                                      setSelectedSubmodule(submodule);
                                      setSubmoduleModalMode("edit");
                                    }}
                                    className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                                    aria-label="Editar submódulo"
                                    title="Editar submódulo"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteSubmoduleTarget(submodule)}
                                    className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--danger)] hover:bg-[var(--surface)]"
                                    aria-label="Eliminar submódulo"
                                    title="Eliminar submódulo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {actionFeedback.lastError ? <p className="text-sm text-[var(--danger)]">{actionFeedback.lastError}</p> : null}
      {actionFeedback.lastSuccess ? <p className="text-sm text-[var(--success)]">{actionFeedback.lastSuccess}</p> : null}

      <CrudModal
        open={moduleModalMode === "create" || moduleModalMode === "edit"}
        title={moduleModalMode === "edit" ? "Editar módulo" : "Crear módulo"}
        onClose={() => {
          setModuleModalMode(null);
          setSelectedModule(null);
        }}
      >
        <form action={moduleModalMode === "edit" ? updateModuleFormAction : createModuleFormAction} className="grid gap-3">
          {moduleModalMode === "edit" ? (
            <input type="hidden" name="moduleId" value={selectedModule?.id ?? ""} />
          ) : (
            <input name="id" placeholder="id_modulo" defaultValue={selectedModule?.id ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          )}
          <input name="name" placeholder="Nombre técnico" defaultValue={selectedModule?.name ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          <textarea name="description" placeholder="Descripción" rows={3} defaultValue={selectedModule?.description ?? ""} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" />
          <div className="grid gap-3 md:grid-cols-2">
            {moduleModalMode === "create" ? (
              <select name="product" defaultValue={selectedModule?.product ?? "BUSINESS"} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
                <option value="BUSINESS">Business</option>
                <option value="LABS">Labs</option>
              </select>
            ) : (
              <input
                value={selectedModule?.product === "BUSINESS" ? "Business" : "Labs"}
                readOnly
                className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]"
              />
            )}
            <input name="route" placeholder="/app/modulo" defaultValue={selectedModule?.route ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input name="isActive" type="checkbox" defaultChecked={selectedModule?.isActive ?? true} /> Activo
          </label>
          <button className="min-h-11 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
            {moduleModalMode === "edit" ? "Guardar cambios" : "Crear módulo"}
          </button>
        </form>
      </CrudModal>

      <CrudModal
        open={submoduleModalMode === "create" || submoduleModalMode === "edit"}
        title={submoduleModalMode === "edit" ? "Editar submódulo" : "Crear submódulo"}
        onClose={() => {
          setSubmoduleModalMode(null);
          setSelectedSubmodule(null);
          setSubmoduleParentModule(null);
        }}
      >
        <form action={submoduleModalMode === "edit" ? updateSubmoduleFormAction : createSubmoduleFormAction} className="grid gap-3">
          {submoduleModalMode === "edit" ? (
            <input type="hidden" name="submoduleId" value={selectedSubmodule?.id ?? ""} />
          ) : (
            <>
              <input type="hidden" name="moduleId" value={submoduleParentModule?.id ?? ""} />
              <input name="key" placeholder="key_submodulo" className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            </>
          )}
          <input name="name" placeholder="Nombre submódulo" defaultValue={selectedSubmodule?.name ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          <textarea name="description" placeholder="Descripción" rows={3} defaultValue={selectedSubmodule?.description ?? ""} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" />
          <input name="route" placeholder="/app/modulo/submodulo" defaultValue={selectedSubmodule?.route ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input name="isActive" type="checkbox" defaultChecked={selectedSubmodule?.isActive ?? true} /> Activo
          </label>
          <button className="min-h-11 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]">
            {submoduleModalMode === "edit" ? "Guardar cambios" : "Crear submódulo"}
          </button>
        </form>
      </CrudModal>

      <CrudModal
        open={Boolean(deleteModuleTarget)}
        title="Eliminar módulo"
        description="Esta acción elimina el módulo y sus relaciones vinculadas."
        onClose={() => setDeleteModuleTarget(null)}
      >
        <form action={deleteModuleFormAction} className="grid gap-4">
          <input type="hidden" name="moduleId" value={deleteModuleTarget?.id ?? ""} />
          <p className="text-sm text-[var(--foreground)]">
            Confirma eliminación definitiva de <strong>{deleteModuleTarget?.name}</strong>.
          </p>
          <button className="min-h-11 rounded-lg bg-[var(--danger)] px-4 text-sm font-semibold text-white">
            Eliminar definitivamente
          </button>
        </form>
      </CrudModal>

      <CrudModal
        open={Boolean(deleteSubmoduleTarget)}
        title="Eliminar submódulo"
        description="Esta acción elimina el submódulo y sus relaciones vinculadas."
        onClose={() => setDeleteSubmoduleTarget(null)}
      >
        <form action={deleteSubmoduleFormAction} className="grid gap-4">
          <input type="hidden" name="submoduleId" value={deleteSubmoduleTarget?.id ?? ""} />
          <p className="text-sm text-[var(--foreground)]">
            Confirma eliminación definitiva de <strong>{deleteSubmoduleTarget?.name}</strong>.
          </p>
          <button className="min-h-11 rounded-lg bg-[var(--danger)] px-4 text-sm font-semibold text-white">
            Eliminar definitivamente
          </button>
        </form>
      </CrudModal>
    </section>
  );
}
