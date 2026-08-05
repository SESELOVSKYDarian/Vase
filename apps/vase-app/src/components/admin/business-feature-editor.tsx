"use client";

import type { ClientProductAccess } from "@/lib/admin/client-product-access";

export type BusinessFeatureCatalogItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  valueType: "BOOLEAN" | "INTEGER" | "TEXT";
  trialDefault: boolean | number | string | null;
  activeDefault: boolean | number | string | null;
  minValue: number | null;
  maxValue: number | null;
};

type BusinessSelection = NonNullable<ClientProductAccess["business"]>["submodules"][number];

type Props = {
  submoduleName: string;
  status: BusinessSelection["status"];
  features: BusinessFeatureCatalogItem[];
  value: BusinessSelection["features"];
  onChange: (features: BusinessSelection["features"]) => void;
};

function defaultValue(feature: BusinessFeatureCatalogItem, status: BusinessSelection["status"]) {
  return status === "TRIAL" ? feature.trialDefault : feature.activeDefault;
}

function normalizeValue(feature: BusinessFeatureCatalogItem, rawValue: string) {
  if (rawValue === "") return null;
  if (feature.valueType === "INTEGER") return Number(rawValue);
  return rawValue;
}

export function mergeBusinessFeatureOverride(
  value: BusinessSelection["features"],
  features: BusinessFeatureCatalogItem[],
  override: BusinessSelection["features"][number],
) {
  return [
    ...value.filter((item) => item.featureId !== override.featureId),
    override,
  ].sort((left, right) =>
    features.findIndex((item) => item.id === left.featureId) -
    features.findIndex((item) => item.id === right.featureId));
}

export function BusinessFeatureEditor({ submoduleName, status, features, value, onChange }: Props) {
  const selectedById = new Map(value.map((feature) => [feature.featureId, feature]));

  const updateFeature = (feature: BusinessFeatureCatalogItem, patch: Partial<BusinessSelection["features"][number]>) => {
    const current = selectedById.get(feature.id) ?? {
      featureId: feature.id,
      enabled: Boolean(defaultValue(feature, status)),
      value: defaultValue(feature, status),
    };
    const next = mergeBusinessFeatureOverride(value, features, { ...current, ...patch });
    onChange(next);
  };

  if (features.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] px-3 py-3 text-sm text-[var(--muted)]">
        {submoduleName} no tiene características configurables.
      </p>
    );
  }

  return (
    <div className="grid gap-3" aria-label={`Características de ${submoduleName}`}>
      {features.map((feature) => {
        const fallback = defaultValue(feature, status);
        const selected = selectedById.get(feature.id);
        const effectiveValue = selected ? selected.value : fallback;
        const enabled = selected?.enabled ?? Boolean(fallback);
        const controlId = `business-feature-${feature.id}`;

        return (
          <article key={feature.id} className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor={controlId} className="text-sm font-semibold text-[var(--foreground)]">{feature.name}</label>
                {feature.description ? <p className="mt-1 text-xs text-[var(--muted)]">{feature.description}</p> : null}
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => updateFeature(feature, { enabled: event.target.checked })}
                  className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent-strong)]"
                />
                Habilitada
              </label>
            </div>

            {feature.valueType === "BOOLEAN" ? (
              <select
                id={controlId}
                value={String(Boolean(effectiveValue))}
                onChange={(event) => updateFeature(feature, { value: event.target.value === "true" })}
                className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                id={controlId}
                type={feature.valueType === "INTEGER" ? "number" : "text"}
                min={feature.minValue ?? undefined}
                max={feature.maxValue ?? undefined}
                step={feature.valueType === "INTEGER" ? 1 : undefined}
                value={effectiveValue == null ? "" : String(effectiveValue)}
                onChange={(event) => updateFeature(feature, { value: normalizeValue(feature, event.target.value) })}
                className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm"
              />
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item.featureId !== feature.id))}
              className="w-fit text-xs font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
            >
              Usar valor del plan ({fallback == null ? "sin valor" : String(fallback)})
            </button>
          </article>
        );
      })}
    </div>
  );
}
