"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = {
  id: string; code: string; name: string; timezone: string; active: boolean;
};
type Group = { id: string; code: string; name: string; members: Array<{ branchId: string }> };
type Policy = {
  id: string; family: string; scopeType: string; scopeId: string;
  revision: number; value: Record<string, unknown>;
};
const families = [
  "CATALOG", "RECIPES", "PRICING", "INVENTORY", "PROMOTIONS",
  "FISCAL", "PAYMENTS", "DELIVERY", "RESERVATIONS", "PRINTING",
];

export default function ScopeSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [family, setFamily] = useState("CATALOG");
  const [selectedScopeType, setSelectedScopeType] = useState("TENANT");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async (selectedFamily: string) => {
    const [branchResponse, groupResponse, policyResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/branch-groups", { cache: "no-store" }),
      fetch(`/api/v1/settings/scopes?family=${selectedFamily}`, { cache: "no-store" }),
    ]);
    const [branchPayload, groupPayload, policyPayload] = await Promise.all([
      branchResponse.json(), groupResponse.json(), policyResponse.json(),
    ]);
    if (!branchResponse.ok) throw new Error(branchPayload.error);
    if (!groupResponse.ok) throw new Error(groupPayload.error);
    if (!policyResponse.ok) throw new Error(policyPayload.error);
    setBranches(branchPayload.branches);
    setGroups(groupPayload.groups);
    setPolicies(policyPayload.policies);
  }, []);
  useEffect(() => { void load(family).catch((cause) => setError(String(cause))); }, [family, load]);

  async function api(path: string, body: Record<string, unknown>) {
    setError("");
    const response = await fetch(path, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return false; }
    await load(family); return true;
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (await api("/api/v1/branch-groups", {
      action: "CREATE", code: form.get("code"), name: form.get("name"),
      branchIds: form.getAll("branchIds"),
    })) event.currentTarget.reset();
  }

  async function updateGroup(event: FormEvent<HTMLFormElement>, groupId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/v1/branch-groups", {
      action: "SET_MEMBERS",
      groupId,
      branchIds: form.getAll("branchIds"),
    });
  }

  async function updateBranch(event: FormEvent<HTMLFormElement>, branchId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    const response = await fetch(`/api/v1/branches/${encodeURIComponent(branchId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        timezone: form.get("timezone"),
        active: form.get("active") === "on",
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await load(family);
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const scopeType = String(form.get("scopeType"));
    const scopeId = scopeType === "TENANT"
      ? String(form.get("tenantId") ?? "AUTHENTICATED_TENANT")
      : String(form.get("scopeId"));
    const current = policies.find((policy) =>
      policy.scopeType === scopeType &&
      (scopeType === "TENANT" || policy.scopeId === scopeId));
    if (scopeType !== "TENANT" && !scopeId) {
      setError("Elegí el grupo o la sucursal que tendrá esta configuración.");
      return;
    }
    await api("/api/v1/settings/scopes", {
      action: "SET", family, scopeType, scopeId,
      expectedRevision: current?.revision ?? 0,
      value: { sharingLevel: scopeType },
    });
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Herencia multi-sucursal</p><h1>Qué compartir y qué independizar</h1>
      <p>Cada familia puede definirse para todo el negocio, un grupo o una sucursal. La fuente efectiva y su revisión quedan registradas.</p>
      {error ? <p role="alert">{error}</p> : null}
      <section className="ui-card"><h2>Sucursales</h2>
        <div className="branch-list">{branches.map((branch) => (
          <form key={branch.id} className="settings-form"
            onSubmit={(event) => void updateBranch(event, branch.id)}>
            <code>{branch.code}</code>
            <label>Nombre<input name="name" defaultValue={branch.name} required /></label>
            <label>Zona horaria<input name="timezone" defaultValue={branch.timezone} required /></label>
            <label><input type="checkbox" name="active" defaultChecked={branch.active} />
              Sucursal activa
            </label>
            <button className="button">Guardar sucursal</button>
          </form>
        ))}</div>
      </section>
      <section className="ui-card"><h2>Grupos de sucursales</h2>
        <form className="settings-form" onSubmit={createGroup}>
          <label>Código URL<input name="code" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
          <label>Nombre<input name="name" required /></label>
          <fieldset><legend>Miembros</legend>{branches.map((branch) =>
            <label key={branch.id}><input type="checkbox" name="branchIds" value={branch.id} />{branch.name}</label>)}</fieldset>
          <button className="button button-primary">Crear grupo</button>
        </form>
        <div className="branch-list">{groups.map((group) => (
          <form key={group.id} className="settings-form"
            onSubmit={(event) => void updateGroup(event, group.id)}>
            <code>{group.code}</code><strong>{group.name}</strong>
            <fieldset><legend>Miembros actuales</legend>{branches.map((branch) => (
              <label key={branch.id}>
                <input type="checkbox" name="branchIds" value={branch.id}
                  defaultChecked={group.members.some((member) =>
                    member.branchId === branch.id)} />
                {branch.name}
              </label>
            ))}</fieldset>
            <button className="button">Actualizar miembros</button>
          </form>
        ))}</div>
      </section>
      <section className="ui-card"><h2>Política por familia</h2>
        <label>Familia<select value={family} onChange={(event) => setFamily(event.target.value)}>
          {families.map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <form className="settings-form" onSubmit={savePolicy}>
          <input type="hidden" name="tenantId" value={
            policies.find((policy) => policy.scopeType === "TENANT")?.scopeId ?? "AUTHENTICATED_TENANT"
          } />
          <label>Compartir en<select name="scopeType" value={selectedScopeType}
            onChange={(event) => setSelectedScopeType(event.target.value)}>
            <option value="TENANT">Todo el negocio</option>
            <option value="BRANCH_GROUP">Un grupo</option>
            <option value="BRANCH">Una sucursal</option>
          </select></label>
          {selectedScopeType === "BRANCH_GROUP"
            ? <label>Grupo<select name="scopeId" required>
                <option value="">Elegir grupo</option>
                {groups.map((group) =>
                  <option value={group.id} key={group.id}>{group.name}</option>)}
              </select></label>
            : null}
          {selectedScopeType === "BRANCH"
            ? <label>Sucursal<select name="scopeId" required>
                <option value="">Elegir sucursal</option>
                {branches.map((branch) =>
                  <option value={branch.id} key={branch.id}>{branch.name}</option>)}
              </select></label>
            : null}
          <button className="button button-primary">Publicar configuración versionada</button>
        </form>
        <div className="branch-list">{policies.map((policy) => <article key={policy.id}>
          <strong>{policy.scopeType} · {policy.scopeId}</strong>
          <span>Revisión {policy.revision} · {JSON.stringify(policy.value)}</span>
          <button className="button" onClick={() => void api("/api/v1/settings/scopes", {
            action: "RESET", family, scopeType: policy.scopeType,
            scopeId: policy.scopeId, expectedRevision: policy.revision,
          })}>Restablecer heredado</button>
        </article>)}</div>
      </section>
    </main>
  );
}
