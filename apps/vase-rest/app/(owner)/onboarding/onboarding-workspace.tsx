"use client";

import { useEffect, useState, type FormEvent } from "react";

type Branch = {
  id: string;
  code: string;
  slug: string;
  name: string;
  timezone: string;
  active: boolean;
};

export function OnboardingWorkspace(props: {
  tenantSlug: string;
  tenantName: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch(`/api/v1/branches?tenant=${encodeURIComponent(props.tenantSlug)}`, {
      cache: "no-store",
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setBranches(payload.branches);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudieron cargar las sucursales"));
  }, [props.tenantSlug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const response = await fetch("/api/v1/branches" + `?tenant=${encodeURIComponent(props.tenantSlug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error ?? "No se pudo guardar");
      return;
    }
    setBranches((current) => [...current, payload.branch]);
    event.currentTarget.reset();
  }

  return (
    <main className="owner-workspace">
      <header>
        <span className="eyebrow">Configuración inicial · {props.tenantName}</span>
        <h1>Diseñá tu red operativa</h1>
        <p>Cada sucursal conserva identidad, huso horario y pertenencia a grupos reales.</p>
      </header>
      <section className="owner-panel">
        <div>
          <p className="card-label">Paso 01</p>
          <h2>Primera sucursal</h2>
        </div>
        <form onSubmit={submit}>
          <label>Nombre comercial<input name="name" required minLength={2} /></label>
          <label>Código operativo<input name="code" required minLength={2} maxLength={12} /></label>
          <label>Identificador URL<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          <label>Zona horaria
            <select name="timezone" defaultValue="America/Argentina/Buenos_Aires">
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC−3)</option>
              <option value="America/Montevideo">Montevideo (UTC−3)</option>
              <option value="America/Santiago">Santiago</option>
            </select>
          </label>
          <label>Grupo de sucursales<input name="groupName" placeholder="Ej. AMBA" /></label>
          <button className="button button-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear sucursal"}
          </button>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      </section>
      <section className="branch-list" aria-label="Sucursales configuradas">
        {branches.map((branch) => (
          <article key={branch.id}>
            <code>{branch.code}</code><strong>{branch.name}</strong>
            <span>{branch.timezone}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
