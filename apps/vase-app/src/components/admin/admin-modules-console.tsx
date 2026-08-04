"use client";

import { Fragment, useActionState, useId, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminModuleAction,
  createModuleFeatureAction,
  createModuleSubmoduleAction,
  deleteAdminModuleAction,
  deleteModuleFeatureAction,
  deleteModuleSubmoduleAction,
  updateAdminModuleAction,
  updateModuleFeatureAction,
  updateModuleSubmoduleAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";
import { getAdminModuleAccessPresentation } from "@/lib/admin/user-access";
import { CrudModal } from "@/components/ui/crud-modal";

type SubmoduleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string;
  isActive: boolean;
  features: ModuleFeatureView[];
};

type ModuleFeatureView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  valueType: "BOOLEAN" | "INTEGER" | "TEXT";
  trialDefault: boolean | number | string | null;
  activeDefault: boolean | number | string | null;
  minValue: number | null;
  maxValue: number | null;
  sortOrder: number;
  isActive: boolean;
};

type ModuleView = {
  id: string;
  name: string;
  description: string | null;
  product: "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";
  route: string;
  isActive: boolean;
  features: ModuleFeatureView[];
  submodules: SubmoduleView[];
};

type Props = {
  modules: ModuleView[];
  initialExpandedModuleIds?: string[];
};

const initialState: AdminGovernanceActionState = {};

type ModuleModalMode = "create" | "edit";
type SubmoduleModalMode = "create" | "edit";
type FeatureModalMode = "create" | "edit";

const featureSubmoduleKeys = new Set(["plantilla", "personalizado"]);

function formatFeatureDefault(value: ModuleFeatureView["trialDefault"]) {
  return value === null ? "" : String(value);
}

export function AdminModulesConsole({ modules, initialExpandedModuleIds = [] }: Props) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initialExpandedModuleIds.map((id) => [id, true])),
  );
  const [moduleModalMode, setModuleModalMode] = useState<ModuleModalMode | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleView | null>(null);
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleView | null>(null);
  const [submoduleModalMode, setSubmoduleModalMode] = useState<SubmoduleModalMode | null>(null);
  const [selectedSubmodule, setSelectedSubmodule] = useState<SubmoduleView | null>(null);
  const [submoduleParentModule, setSubmoduleParentModule] = useState<ModuleView | null>(null);
  const [deleteSubmoduleTarget, setDeleteSubmoduleTarget] = useState<SubmoduleView | null>(null);
  const [featureModalMode, setFeatureModalMode] = useState<FeatureModalMode | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<ModuleFeatureView | null>(null);
  const [featureParentModule, setFeatureParentModule] = useState<ModuleView | null>(null);
  const [featureParentSubmodule, setFeatureParentSubmodule] = useState<SubmoduleView | null>(null);
  const [deleteFeatureTarget, setDeleteFeatureTarget] = useState<ModuleFeatureView | null>(null);
  const [featureValueType, setFeatureValueType] = useState<ModuleFeatureView["valueType"]>("BOOLEAN");

  const [createModuleState, createModuleFormAction] = useActionState(createAdminModuleAction, initialState);
  const [updateModuleState, updateModuleFormAction] = useActionState(updateAdminModuleAction, initialState);
  const [deleteModuleState, deleteModuleFormAction] = useActionState(deleteAdminModuleAction, initialState);
  const [createSubmoduleState, createSubmoduleFormAction] = useActionState(createModuleSubmoduleAction, initialState);
  const [updateSubmoduleState, updateSubmoduleFormAction] = useActionState(updateModuleSubmoduleAction, initialState);
  const [deleteSubmoduleState, deleteSubmoduleFormAction] = useActionState(deleteModuleSubmoduleAction, initialState);
  const [createFeatureState, createFeatureFormAction, isCreatingFeature] = useActionState(createModuleFeatureAction, initialState);
  const [updateFeatureState, updateFeatureFormAction, isUpdatingFeature] = useActionState(updateModuleFeatureAction, initialState);
  const [deleteFeatureState, deleteFeatureFormAction, isDeletingFeature] = useActionState(deleteModuleFeatureAction, initialState);

  const actionFeedback = useMemo(() => {
    const states = [
      createModuleState,
      updateModuleState,
      deleteModuleState,
      createSubmoduleState,
      updateSubmoduleState,
      deleteSubmoduleState,
      createFeatureState,
      updateFeatureState,
      deleteFeatureState,
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
    createFeatureState,
    updateFeatureState,
    deleteFeatureState,
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
                    <td className="px-4 py-3">{getAdminModuleAccessPresentation(module.product, module.submodules.length, false, 0).productLabel}</td>
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
                        <div className="space-y-4">
                          {module.product === "BUSINESS" ? (
                            <FeatureCatalogSection
                              title="Características"
                              features={module.features}
                              onCreate={() => {
                                setFeatureParentModule(module);
                                setFeatureParentSubmodule(null);
                                setSelectedFeature(null);
                                setFeatureValueType("BOOLEAN");
                                setFeatureModalMode("create");
                              }}
                              onEdit={(feature) => {
                                setFeatureParentModule(module);
                                setFeatureParentSubmodule(null);
                                setSelectedFeature(feature);
                                setFeatureValueType(feature.valueType);
                                setFeatureModalMode("edit");
                              }}
                              onDelete={setDeleteFeatureTarget}
                            />
                          ) : null}
                          {module.submodules.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">Sin submódulos.</p>
                        ) : (
                          <div className="space-y-2">
                            {module.submodules.map((submodule) => (
                              <div
                                key={submodule.id}
                                className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-2"
                              >
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px_108px] items-center gap-3">
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
                                {module.product === "BUSINESS" && featureSubmoduleKeys.has(submodule.key) ? (
                                  <FeatureCatalogSection
                                    title={`Características de ${submodule.name}`}
                                    features={submodule.features}
                                    onCreate={() => {
                                      setFeatureParentModule(module);
                                      setFeatureParentSubmodule(submodule);
                                      setSelectedFeature(null);
                                      setFeatureValueType("BOOLEAN");
                                      setFeatureModalMode("create");
                                    }}
                                    onEdit={(feature) => {
                                      setFeatureParentModule(module);
                                      setFeatureParentSubmodule(submodule);
                                      setSelectedFeature(feature);
                                      setFeatureValueType(feature.valueType);
                                      setFeatureModalMode("edit");
                                    }}
                                    onDelete={setDeleteFeatureTarget}
                                  />
                                ) : null}
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
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
        open={featureModalMode === "create" || featureModalMode === "edit"}
        title={featureModalMode === "edit" ? "Editar característica" : "Crear característica"}
        onClose={() => {
          setFeatureModalMode(null);
          setSelectedFeature(null);
          setFeatureParentModule(null);
          setFeatureParentSubmodule(null);
        }}
      >
        <form action={featureModalMode === "edit" ? updateFeatureFormAction : createFeatureFormAction} className="grid gap-3">
          {featureModalMode === "edit" ? (
            <>
              <input type="hidden" name="featureId" value={selectedFeature?.id ?? ""} />
              <label className="grid gap-1 text-sm text-[var(--foreground)]">Clave estable<input value={selectedFeature?.key ?? ""} readOnly className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]" /></label>
            </>
          ) : (
            <>
              <input type="hidden" name="moduleId" value={featureParentModule?.id ?? ""} />
              <input type="hidden" name="submoduleId" value={featureParentSubmodule?.id ?? ""} />
              <label className="grid gap-1 text-sm text-[var(--foreground)]">Clave estable<input name="key" required placeholder="catalog_enabled" className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
            </>
          )}
          <label className="grid gap-1 text-sm text-[var(--foreground)]">Nombre<input name="name" required defaultValue={selectedFeature?.name ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
          <label className="grid gap-1 text-sm text-[var(--foreground)]">Descripción<textarea name="description" rows={2} defaultValue={selectedFeature?.description ?? ""} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" /></label>
          <label className="grid gap-1 text-sm text-[var(--foreground)]">Tipo de valor
            <select name="valueType" value={featureValueType} onChange={(event) => setFeatureValueType(event.target.value as ModuleFeatureView["valueType"])} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="BOOLEAN">Booleano</option><option value="INTEGER">Entero</option><option value="TEXT">Texto</option>
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <FeatureDefaultInput label="Default trial" field="trialDefault" valueType={featureValueType} defaultValue={selectedFeature?.trialDefault ?? null} />
            <FeatureDefaultInput label="Default activo" field="activeDefault" valueType={featureValueType} defaultValue={selectedFeature?.activeDefault ?? null} />
          </div>
          {featureValueType === "INTEGER" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-[var(--foreground)]">Mínimo<input name="minValue" type="number" step="1" defaultValue={selectedFeature?.minValue ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
              <label className="grid gap-1 text-sm text-[var(--foreground)]">Máximo<input name="maxValue" type="number" step="1" defaultValue={selectedFeature?.maxValue ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
            </div>
          ) : null}
          <label className="grid gap-1 text-sm text-[var(--foreground)]">Orden<input name="sortOrder" type="number" step="1" defaultValue={selectedFeature?.sortOrder ?? 0} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={selectedFeature?.isActive ?? true} /> Activa</label>
          <button disabled={isCreatingFeature || isUpdatingFeature} className="min-h-11 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60">
            {isCreatingFeature || isUpdatingFeature ? "Guardando…" : featureModalMode === "edit" ? "Guardar cambios" : "Crear característica"}
          </button>
        </form>
      </CrudModal>

      <CrudModal open={Boolean(deleteFeatureTarget)} title="Eliminar característica" onClose={() => setDeleteFeatureTarget(null)}>
        <form action={deleteFeatureFormAction} className="grid gap-4">
          <input type="hidden" name="featureId" value={deleteFeatureTarget?.id ?? ""} />
          <p className="text-sm text-[var(--foreground)]">Confirma la eliminación de <strong>{deleteFeatureTarget?.name}</strong>.</p>
          <button disabled={isDeletingFeature} className="min-h-11 rounded-lg bg-[var(--danger)] px-4 text-sm font-semibold text-white disabled:opacity-60">{isDeletingFeature ? "Eliminando…" : "Eliminar característica"}</button>
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

function FeatureCatalogSection({
  title,
  features,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  features: ModuleFeatureView[];
  onCreate: () => void;
  onEdit: (feature: ModuleFeatureView) => void;
  onDelete: (feature: ModuleFeatureView) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
        <button type="button" onClick={onCreate} className="rounded-md border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)]" aria-label={`Crear característica en ${title}`}>
          Crear característica
        </button>
      </div>
      {features.length === 0 ? <p className="mt-2 text-xs text-[var(--muted)]">Sin características configuradas.</p> : (
        <ul className="mt-2 space-y-2">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)] px-2 py-2 text-sm">
              <div>
                <p className="font-medium text-[var(--foreground)]">{feature.name} <span className="text-xs font-normal text-[var(--muted)]">({feature.key})</span></p>
                <p className="text-xs text-[var(--muted)]">{feature.valueType} · Trial: {formatFeatureDefault(feature.trialDefault) || "—"} · Activo: {formatFeatureDefault(feature.activeDefault) || "—"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(feature)} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--foreground)]" aria-label={`Editar característica ${feature.name}`}><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => onDelete(feature)} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--danger)]" aria-label={`Eliminar característica ${feature.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FeatureDefaultInput({
  label,
  field,
  valueType,
  defaultValue,
}: {
  label: string;
  field: "trialDefault" | "activeDefault";
  valueType: ModuleFeatureView["valueType"];
  defaultValue: ModuleFeatureView["trialDefault"];
}) {
  if (valueType === "BOOLEAN") {
    return <label className="grid gap-1 text-sm text-[var(--foreground)]">{label}<select name={field} defaultValue={defaultValue === null ? "" : String(defaultValue)} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"><option value="">Sin valor</option><option value="true">Verdadero</option><option value="false">Falso</option></select></label>;
  }
  return <FeatureNullableDefaultInput label={label} field={field} valueType={valueType} defaultValue={defaultValue} />;
}

function FeatureNullableDefaultInput({
  label,
  field,
  valueType,
  defaultValue,
}: {
  label: string;
  field: "trialDefault" | "activeDefault";
  valueType: "INTEGER" | "TEXT";
  defaultValue: ModuleFeatureView["trialDefault"];
}) {
  const [mode, setMode] = useState<"null" | "value">(defaultValue === null ? "null" : "value");
  const inputId = useId();
  const modeId = `${inputId}-mode`;
  const valueId = `${inputId}-value`;
  return (
    <div className="grid gap-1 text-sm text-[var(--foreground)]">
      <label htmlFor={modeId}>{label}: modo</label>
      <select id={modeId} name={`${field}Mode`} value={mode} onChange={(event) => setMode(event.target.value as "null" | "value")} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
        <option value="null">Sin valor</option>
        <option value="value">Usar valor</option>
      </select>
      <label htmlFor={valueId}>{label}: valor</label>
      <input id={valueId} name={field} disabled={mode === "null"} required={valueType === "INTEGER" && mode === "value"} type={valueType === "INTEGER" ? "number" : "text"} step={valueType === "INTEGER" ? "1" : undefined} defaultValue={formatFeatureDefault(defaultValue)} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] disabled:opacity-60" />
    </div>
  );
}
