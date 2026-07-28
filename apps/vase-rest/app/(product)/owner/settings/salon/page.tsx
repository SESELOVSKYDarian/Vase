"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = { id: string; name: string };
type Floor = {
  id: string; name: string; zones: Array<{ id: string; name: string }>;
  tables: Array<{ id: string; code: string; name: string; capacity: number }>;
};
type Station = { id: string; name: string; categories: Array<{ categoryId: string }> };
type Category = { id: string; name: string };

export default function SalonSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [floors, setFloors] = useState<Floor[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const loadBranches = useCallback(async () => {
    const response = await fetch("/api/v1/branches", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setBranches(payload.branches);
    setBranchId((current) => current || payload.branches[0]?.id || "");
  }, []);
  const load = useCallback(async () => {
    if (!branchId) return;
    const response = await fetch(`/api/v1/salon?branchId=${encodeURIComponent(branchId)}`, {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setFloors(payload.floors); setStations(payload.stations); setCategories(payload.categories);
  }, [branchId]);
  useEffect(() => { void loadBranches().catch((cause) => setError(String(cause))); }, [loadBranches]);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  async function command(body: Record<string, unknown>) {
    const response = await fetch(`/api/v1/salon?branchId=${encodeURIComponent(branchId)}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return false; }
    await load(); return true;
  }
  const submit = (action: string, map: (form: FormData) => Record<string, unknown>) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (await command({ action, ...map(new FormData(event.currentTarget)) })) event.currentTarget.reset();
    };
  return (
    <main className="product-content">
      <p className="eyebrow">Diseño operativo</p><h1>Salón, mesas y estaciones</h1>
      <label>Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
        {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
      </select></label>
      {error ? <p role="alert">{error}</p> : null}
      <section className="ui-card"><h2>Pisos y zonas</h2>
        <form className="inline-form" onSubmit={submit("CREATE_FLOOR", (form) => ({
          code: form.get("code"), name: form.get("name"), sortOrder: 0,
        }))}><label>Código<input name="code" required /></label><label>Piso<input name="name" required /></label>
          <button className="button button-primary">Crear piso</button></form>
        <form className="inline-form" onSubmit={submit("CREATE_ZONE", (form) => ({
          floorId: form.get("floorId"), code: form.get("code"), name: form.get("name"),
        }))}><label>Piso<select name="floorId">{floors.map((floor) =>
          <option value={floor.id} key={floor.id}>{floor.name}</option>)}</select></label>
          <label>Código<input name="code" required /></label><label>Zona<input name="name" required /></label>
          <button className="button">Crear zona</button></form>
      </section>
      <section className="ui-card"><h2>Mesas</h2>
        <form className="inline-form" onSubmit={submit("CREATE_TABLE", (form) => ({
          floorId: form.get("floorId"), zoneId: String(form.get("zoneId") ?? "") || undefined,
          code: form.get("code"), name: form.get("name"), capacity: Number(form.get("capacity")),
          x: Number(form.get("x")), y: Number(form.get("y")),
          width: Number(form.get("width")), height: Number(form.get("height")),
        }))}>
          <label>Piso<select name="floorId">{floors.map((floor) =>
            <option value={floor.id} key={floor.id}>{floor.name}</option>)}</select></label>
          <label>Zona<select name="zoneId"><option value="">Sin zona</option>{floors.flatMap((floor) =>
            floor.zones.map((zone) => <option value={zone.id} key={zone.id}>{floor.name} · {zone.name}</option>))}</select></label>
          <label>Código<input name="code" required /></label><label>Nombre<input name="name" required /></label>
          <label>Capacidad<input name="capacity" type="number" min="1" defaultValue="4" /></label>
          <label>X<input name="x" type="number" defaultValue="20" /></label><label>Y<input name="y" type="number" defaultValue="20" /></label>
          <label>Ancho<input name="width" type="number" min="40" defaultValue="120" /></label>
          <label>Alto<input name="height" type="number" min="40" defaultValue="80" /></label>
          <button className="button button-primary">Crear mesa</button>
        </form>
        <div className="branch-list">{floors.flatMap((floor) => floor.tables.map((table) =>
          <article key={table.id}><code>{table.code}</code><strong>{floor.name} · {table.name}</strong><span>{table.capacity} personas</span></article>))}</div>
      </section>
      <section className="ui-card"><h2>Estaciones KDS e impresión</h2>
        <form className="settings-form" onSubmit={submit("CREATE_STATION", (form) => ({
          code: form.get("code"), name: form.get("name"), categoryIds: form.getAll("categoryIds"),
        }))}><label>Código<input name="code" required /></label><label>Estación<input name="name" required /></label>
          <fieldset><legend>Categorías enrutadas</legend>{categories.map((category) =>
            <label key={category.id}><input type="checkbox" name="categoryIds" value={category.id} />{category.name}</label>)}</fieldset>
          <button className="button button-primary">Crear estación</button></form>
        <div className="branch-list">{stations.map((station) => <article key={station.id}>
          <strong>{station.name}</strong><span>{station.categories.map((item) =>
            categories.find((category) => category.id === item.categoryId)?.name).join(" · ")}</span>
        </article>)}</div>
      </section>
    </main>
  );
}
