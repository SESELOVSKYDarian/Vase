"use client";

// Parte de admin-modules-console.tsx: FeatureActionFeedback, nextFeatureDialogGeneration, featureDialogKey, shouldCloseFeatureDialogForResult, ModuleFeatureEditorDialog, ModuleFeatureDeleteDialog y más.
import { useActionState, useEffect, useId, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createModuleFeatureAction, deleteModuleFeatureAction, type AdminGovernanceActionState, updateModuleFeatureAction } from "@/app/(platform)/app/admin/actions";
import { CrudModal } from "@/components/ui/crud-modal";
import { FeatureModalMode, ModuleFeatureView, formatFeatureDefault, initialState } from "./ModuleFeatureView";

export function FeatureActionFeedback({ state, pending }: { state: AdminGovernanceActionState; pending: boolean }) {
  if (pending) return <p aria-live="polite" className="text-sm text-[var(--muted)]">Guardando cambios…</p>;
  if (state.error) return <p role="alert" className="text-sm text-[var(--danger)]">{state.error}</p>;
  if (state.success) return <p aria-live="polite" className="text-sm text-[var(--success)]">{state.success}</p>;
  return null;
}

export function nextFeatureDialogGeneration(currentGeneration: number) {
  return currentGeneration + 1;
}

export function featureDialogKey(generation: number, target: string) {
  return `feature-dialog-${generation}-${target}`;
}

export function shouldCloseFeatureDialogForResult({
  activeGeneration,
  resultGeneration,
  pending,
  success,
}: {
  activeGeneration: number;
  resultGeneration: number;
  pending: boolean;
  success: boolean;
}) {
  return success && !pending && activeGeneration === resultGeneration;
}

export function ModuleFeatureEditorDialog({
  generation,
  mode,
  feature,
  moduleId,
  submoduleId,
  onClose,
}: {
  generation: number;
  mode: FeatureModalMode;
  feature: ModuleFeatureView | null;
  moduleId: string;
  submoduleId: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    mode === "edit" ? updateModuleFeatureAction : createModuleFeatureAction,
    initialState,
  );
  const [valueType, setValueType] = useState<ModuleFeatureView["valueType"]>(feature?.valueType ?? "BOOLEAN");

  useEffect(() => {
    if (!shouldCloseFeatureDialogForResult({
      activeGeneration: generation,
      resultGeneration: generation,
      pending: isPending,
      success: Boolean(state.success),
    })) return;
    onClose();
  }, [generation, isPending, onClose, state.success]);

  return (
    <CrudModal
      open
      title={mode === "edit" ? "Editar característica" : "Crear característica"}
      onClose={onClose}
      disableClose={isPending}
    >
      <form action={formAction} className="grid gap-3">
        {mode === "edit" ? (
          <>
            <input type="hidden" name="featureId" value={feature?.id ?? ""} />
            <label className="grid gap-1 text-sm text-[var(--foreground)]">Clave estable<input value={feature?.key ?? ""} readOnly className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]" /></label>
          </>
        ) : (
          <>
            <input type="hidden" name="moduleId" value={moduleId} />
            <input type="hidden" name="submoduleId" value={submoduleId} />
            <label className="grid gap-1 text-sm text-[var(--foreground)]">Clave estable<input name="key" required placeholder="catalog_enabled" className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
          </>
        )}
        <label className="grid gap-1 text-sm text-[var(--foreground)]">Nombre<input name="name" required defaultValue={feature?.name ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
        <label className="grid gap-1 text-sm text-[var(--foreground)]">Descripción<textarea name="description" rows={2} defaultValue={feature?.description ?? ""} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" /></label>
        <label className="grid gap-1 text-sm text-[var(--foreground)]">Tipo de valor
          <select name="valueType" value={valueType} onChange={(event) => setValueType(event.target.value as ModuleFeatureView["valueType"])} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
            <option value="BOOLEAN">Booleano</option><option value="INTEGER">Entero</option><option value="TEXT">Texto</option>
          </select>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <FeatureDefaultInput label="Default trial" field="trialDefault" valueType={valueType} defaultValue={feature?.trialDefault ?? null} />
          <FeatureDefaultInput label="Default activo" field="activeDefault" valueType={valueType} defaultValue={feature?.activeDefault ?? null} />
        </div>
        {valueType === "INTEGER" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-[var(--foreground)]">Mínimo<input name="minValue" type="number" step="1" defaultValue={feature?.minValue ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
            <label className="grid gap-1 text-sm text-[var(--foreground)]">Máximo<input name="maxValue" type="number" step="1" defaultValue={feature?.maxValue ?? ""} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
          </div>
        ) : null}
        <label className="grid gap-1 text-sm text-[var(--foreground)]">Orden<input name="sortOrder" type="number" step="1" defaultValue={feature?.sortOrder ?? 0} className="min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={feature?.isActive ?? true} /> Activa</label>
        <button disabled={isPending} className="min-h-11 rounded-lg bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60">
          {isPending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear característica"}
        </button>
        <FeatureActionFeedback state={state} pending={isPending} />
      </form>
    </CrudModal>
  );
}

export function ModuleFeatureDeleteDialog({
  generation,
  feature,
  onClose,
}: {
  generation: number;
  feature: ModuleFeatureView;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(deleteModuleFeatureAction, initialState);

  useEffect(() => {
    if (!shouldCloseFeatureDialogForResult({
      activeGeneration: generation,
      resultGeneration: generation,
      pending: isPending,
      success: Boolean(state.success),
    })) return;
    onClose();
  }, [generation, isPending, onClose, state.success]);

  return (
    <CrudModal open title="Eliminar característica" onClose={onClose} disableClose={isPending}>
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="featureId" value={feature.id} />
        <p className="text-sm text-[var(--foreground)]">Confirma la eliminación de <strong>{feature.name}</strong>.</p>
        <button disabled={isPending} className="min-h-11 rounded-lg bg-[var(--danger)] px-4 text-sm font-semibold text-white disabled:opacity-60">{isPending ? "Eliminando…" : "Eliminar característica"}</button>
        <FeatureActionFeedback state={state} pending={isPending} />
      </form>
    </CrudModal>
  );
}

export function FeatureCatalogSection({
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

export function FeatureNullableDefaultInput({
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
