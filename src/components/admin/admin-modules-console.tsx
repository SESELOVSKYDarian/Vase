"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createAdminModuleAction,
  createModuleSubmoduleAction,
  publishModuleArtifactAction,
  setTenantModuleActivationAction,
  setTenantSubmoduleActivationAction,
  updateAdminModuleAction,
  updateAdminModulePricingAction,
  updateModuleSubmoduleAction,
  updateModuleSubmodulePricingAction,
  uploadModuleArtifactAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";

type TenantLite = {
  id: string;
  accountName: string;
  name: string;
};

type ArtifactView = {
  id: string;
  version: string;
  fileName: string;
  sizeBytes: number;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
};

type SubmoduleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  route: string;
  isActive: boolean;
  activeTenants: number;
  currentPricing: {
    id: string | null;
    price: number;
    currency: string;
    type: "monthly" | "one_time";
    isActive: boolean;
    updatedAt: Date | null;
  } | null;
  artifacts: ArtifactView[];
};

type ModuleView = {
  id: string;
  name: string;
  description: string | null;
  product: "BUSINESS" | "LABS";
  route: string;
  isActive: boolean;
  activeTenants: number;
  currentPricing: {
    id: string | null;
    price: number;
    currency: string;
    type: "monthly" | "one_time";
    isActive: boolean;
    updatedAt: Date | null;
  } | null;
  artifacts: ArtifactView[];
  submodules: SubmoduleView[];
};

type Props = {
  modules: ModuleView[];
  tenants: TenantLite[];
};

const initialState: AdminGovernanceActionState = {};

export function AdminModulesConsole({ modules, tenants }: Props) {
  const [createState, createAction] = useActionState(createAdminModuleAction, initialState);
  const [submoduleCreateState, submoduleCreateAction] = useActionState(createModuleSubmoduleAction, initialState);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [productFilter, setProductFilter] = useState<"ALL" | "BUSINESS" | "LABS">("ALL");
  const [zipFilter, setZipFilter] = useState<"ALL" | "WITH_ZIP" | "WITHOUT_ZIP">("ALL");

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      if (activeFilter === "ACTIVE" && !module.isActive) return false;
      if (activeFilter === "INACTIVE" && module.isActive) return false;
      if (productFilter !== "ALL" && module.product !== productFilter) return false;
      if (zipFilter === "WITH_ZIP" && module.artifacts.length === 0) return false;
      if (zipFilter === "WITHOUT_ZIP" && module.artifacts.length > 0) return false;
      return true;
    });
  }, [modules, activeFilter, productFilter, zipFilter]);

  return (
    <div className="space-y-7">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Total módulos</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{modules.length}</p>
        </article>
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Activos</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{modules.filter((m) => m.isActive).length}</p>
        </article>
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Con ZIP publicado</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{modules.filter((m) => m.artifacts.some((a) => a.isPublished)).length}</p>
        </article>
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs text-[var(--muted)]">Submódulos</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{modules.reduce((acc, m) => acc + m.submodules.length, 0)}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Catálogo</p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Filtros rápidos</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[var(--foreground)]">Producto</span>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value as typeof productFilter)} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]">
                <option value="ALL">Todos</option>
                <option value="BUSINESS">Business</option>
                <option value="LABS">Labs</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[var(--foreground)]">Estado</span>
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]">
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[var(--foreground)]">ZIP</span>
              <select value={zipFilter} onChange={(e) => setZipFilter(e.target.value as typeof zipFilter)} className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]">
                <option value="ALL">Todos</option>
                <option value="WITH_ZIP">Con ZIP</option>
                <option value="WITHOUT_ZIP">Sin ZIP</option>
              </select>
            </label>
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)]">Editor</p>
          <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Crear módulo</h3>
          <form action={createAction} className="mt-4 grid gap-3">
            <input name="id" placeholder="id módulo" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]" />
            <input name="name" placeholder="nombre técnico" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]" />
            <textarea name="description" placeholder="descripción" rows={2} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]" />
            <div className="grid gap-2 md:grid-cols-2">
              <select name="product" defaultValue="BUSINESS" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]">
                <option value="BUSINESS">Business</option>
                <option value="LABS">Labs</option>
              </select>
              <input name="route" placeholder="/app/nuevo-modulo" className="min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 text-[var(--foreground)]" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked /> Módulo activo</label>
            <button className="min-h-11 rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]">Crear módulo</button>
            {createState.error ? <p className="text-sm text-[var(--danger)]">{createState.error}</p> : null}
            {createState.success ? <p className="text-sm text-[var(--success)]">{createState.success}</p> : null}
          </form>
        </article>
      </section>

      <section className="space-y-6">
        {filteredModules.map((module) => (
          <ModuleItem key={module.id} module={module} tenants={tenants} onSubmoduleCreateAction={submoduleCreateAction} submoduleCreateState={submoduleCreateState} />
        ))}
      </section>
    </div>
  );
}

function ModuleItem({
  module,
  tenants,
  onSubmoduleCreateAction,
  submoduleCreateState,
}: {
  module: ModuleView;
  tenants: TenantLite[];
  onSubmoduleCreateAction: (payload: FormData) => void;
  submoduleCreateState: AdminGovernanceActionState;
}) {
  const [moduleState, moduleAction] = useActionState(updateAdminModuleAction, initialState);
  const [pricingState, pricingAction] = useActionState(updateAdminModulePricingAction, initialState);
  const [zipState, zipAction] = useActionState(uploadModuleArtifactAction, initialState);
  const [activationState, activationAction] = useActionState(setTenantModuleActivationAction, initialState);

  return (
    <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">{module.product}</p>
          <h3 className="text-2xl font-semibold text-[var(--foreground)]">{module.name}</h3>
          <p className="text-sm text-[var(--muted)]">{module.description ?? "Sin descripción"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{module.route}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted)]">
          Tenants activos: <strong className="text-[var(--foreground)]">{module.activeTenants}</strong>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <form action={moduleAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">Editar</p>
          <input type="hidden" name="moduleId" value={module.id} />
          <input name="name" defaultValue={module.name} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          <input name="route" defaultValue={module.route} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          <textarea name="description" defaultValue={module.description ?? ""} rows={2} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]" />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={module.isActive} /> Activo</label>
          <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]">Guardar</button>
          {moduleState.error ? <p className="text-xs text-[var(--danger)]">{moduleState.error}</p> : null}
        </form>

        <form action={pricingAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">Precios</p>
          <input type="hidden" name="moduleId" value={module.id} />
          <input name="price" type="number" step="0.01" min="0" defaultValue={module.currentPricing?.price ?? 0} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          <div className="grid grid-cols-2 gap-2">
            <input name="currency" defaultValue={module.currentPricing?.currency ?? "USD"} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
            <select name="type" defaultValue={module.currentPricing?.type ?? "monthly"} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
              <option value="monthly">Mensual</option>
              <option value="one_time">Único</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={module.currentPricing?.isActive ?? true} /> Pricing activo</label>
          <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]">Actualizar</button>
          {pricingState.error ? <p className="text-xs text-[var(--danger)]">{pricingState.error}</p> : null}
        </form>

        <form action={zipAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">Publicación ZIP</p>
          <input type="hidden" name="moduleId" value={module.id} />
          <input name="version" placeholder="1.0.0" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          <input name="artifact" type="file" accept=".zip,application/zip" className="text-sm text-[var(--foreground)]" />
          <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]">Subir ZIP</button>
          {zipState.error ? <p className="text-xs text-[var(--danger)]">{zipState.error}</p> : null}
          {zipState.success ? <p className="text-xs text-[var(--success)]">{zipState.success}</p> : null}
          <div className="space-y-1">
            {module.artifacts.slice(0, 3).map((artifact) => (
              <ArtifactRow key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </form>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">Activación por tenant (módulo)</p>
        <form action={activationAction} className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
          <input type="hidden" name="moduleId" value={module.id} />
          <select name="tenantId" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.accountName}</option>
            ))}
          </select>
          <select name="isActive" defaultValue="true" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
            <option value="true">Activar</option>
            <option value="false">Desactivar</option>
          </select>
          <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]">Aplicar</button>
        </form>
        {activationState.error ? <p className="text-xs text-[var(--danger)]">{activationState.error}</p> : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <form action={onSubmoduleCreateAction} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted-soft)]">Crear submódulo</p>
          <input type="hidden" name="moduleId" value={module.id} />
          <div className="grid gap-2 md:grid-cols-2">
            <input name="key" placeholder="key_submodulo" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
            <input name="name" placeholder="Nombre submódulo" className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <input name="route" placeholder={`${module.route}/nuevo-submodulo`} className="min-h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]" />
          <textarea name="description" rows={2} placeholder="Descripción" className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]" />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked /> Activo</label>
          <button className="min-h-10 rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]">Crear submódulo</button>
          {submoduleCreateState.error ? <p className="text-xs text-[var(--danger)]">{submoduleCreateState.error}</p> : null}
        </form>

        <div className="space-y-3">
          {module.submodules.map((submodule) => (
            <SubmoduleItem key={submodule.id} submodule={submodule} tenants={tenants} />
          ))}
          {module.submodules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--muted)]">Sin submódulos creados.</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SubmoduleItem({ submodule, tenants }: { submodule: SubmoduleView; tenants: TenantLite[] }) {
  const [subState, subAction] = useActionState(updateModuleSubmoduleAction, initialState);
  const [priceState, priceAction] = useActionState(updateModuleSubmodulePricingAction, initialState);
  const [zipState, zipAction] = useActionState(uploadModuleArtifactAction, initialState);
  const [activationState, activationAction] = useActionState(setTenantSubmoduleActivationAction, initialState);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
      <div className="mb-2">
        <p className="text-sm font-semibold text-[var(--foreground)]">{submodule.name}</p>
        <p className="text-xs text-[var(--muted)]">{submodule.route}</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <form action={subAction} className="grid gap-2">
          <input type="hidden" name="submoduleId" value={submodule.id} />
          <input name="name" defaultValue={submodule.name} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]" />
          <input name="route" defaultValue={submodule.route} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]" />
          <textarea name="description" defaultValue={submodule.description ?? ""} rows={2} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]" />
          <label className="inline-flex items-center gap-2 text-xs text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={submodule.isActive} /> Activo</label>
          <button className="min-h-9 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)]">Guardar</button>
          {subState.error ? <p className="text-xs text-[var(--danger)]">{subState.error}</p> : null}
        </form>

        <form action={priceAction} className="grid gap-2">
          <input type="hidden" name="submoduleId" value={submodule.id} />
          <input name="price" type="number" step="0.01" min="0" defaultValue={submodule.currentPricing?.price ?? 0} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]" />
          <div className="grid grid-cols-2 gap-2">
            <input name="currency" defaultValue={submodule.currentPricing?.currency ?? "USD"} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]" />
            <select name="type" defaultValue={submodule.currentPricing?.type ?? "monthly"} className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]">
              <option value="monthly">Mensual</option>
              <option value="one_time">Único</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[var(--foreground)]"><input name="isActive" type="checkbox" defaultChecked={submodule.currentPricing?.isActive ?? true} /> Pricing activo</label>
          <button className="min-h-9 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)]">Pricing</button>
          {priceState.error ? <p className="text-xs text-[var(--danger)]">{priceState.error}</p> : null}
        </form>

        <div className="grid gap-2">
          <form action={zipAction} className="grid gap-2">
            <input type="hidden" name="submoduleId" value={submodule.id} />
            <input name="version" placeholder="1.0.0" className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]" />
            <input name="artifact" type="file" accept=".zip,application/zip" className="text-xs text-[var(--foreground)]" />
            <button className="min-h-9 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)]">Subir ZIP</button>
          </form>
          {zipState.error ? <p className="text-xs text-[var(--danger)]">{zipState.error}</p> : null}

          <form action={activationAction} className="grid gap-2 border-t border-[var(--border-subtle)] pt-2">
            <input type="hidden" name="submoduleId" value={submodule.id} />
            <select name="tenantId" className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]">
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.accountName}</option>
              ))}
            </select>
            <select name="isActive" defaultValue="true" className="min-h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)]">
              <option value="true">Activar</option>
              <option value="false">Desactivar</option>
            </select>
            <button className="min-h-9 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--foreground)]">Aplicar tenant</button>
            {activationState.error ? <p className="text-xs text-[var(--danger)]">{activationState.error}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

function ArtifactRow({ artifact }: { artifact: ArtifactView }) {
  const [publishState, publishAction] = useActionState(publishModuleArtifactAction, initialState);
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">{artifact.version} · {artifact.fileName}</span>
        <span className={artifact.isPublished ? "text-[var(--success)]" : "text-[var(--muted)]"}>{artifact.isPublished ? "Publicado" : "No publicado"}</span>
      </div>
      {!artifact.isPublished ? (
        <form action={publishAction} className="mt-1">
          <input type="hidden" name="artifactId" value={artifact.id} />
          <button className="text-[11px] font-semibold text-[var(--accent-strong)]">Publicar versión</button>
        </form>
      ) : null}
      {publishState.error ? <p className="text-[11px] text-[var(--danger)]">{publishState.error}</p> : null}
    </div>
  );
}

