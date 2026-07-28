"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Scope = { id: string; name: string };
type Ingredient = Scope & { sku: string; baseUnit: string };
type Warehouse = Scope & { code: string; branches: Array<{ branchId: string }> };
type Movement = {
  id: string; kind: string; quantity: string; balanceAfter: string;
  occurredAt: string; reason: string | null; reversalOfId: string | null;
};
type Allocation = {
  id: string; branchId: string; warehouseId: string; ingredientId: string;
  available: string; safetyStock: string; revision: number;
};

export default function OwnerInventoryPage() {
  const [data, setData] = useState<{
    branches: Scope[]; ingredients: Ingredient[]; warehouses: Warehouse[];
    movements: Movement[]; allocations: Allocation[];
  }>({ branches: [], ingredients: [], warehouses: [], movements: [], allocations: [] });
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/inventory", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setData(payload);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);
  async function command(body: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/v1/inventory", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return false; }
    await load(); return true;
  }
  const formCommand = (action: string, mapper: (form: FormData) => Record<string, unknown>) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (await command({ action, ...mapper(new FormData(event.currentTarget)) })) {
        event.currentTarget.reset();
      }
    };
  return (
    <main className="product-content">
      <p className="eyebrow">Inventario cloud</p><h1>Depósitos, movimientos y cupos offline</h1>
      {error ? <p role="alert">{error}</p> : null}
      <section className="ui-card"><h2>Maestros</h2>
        <form className="inline-form" onSubmit={formCommand("CREATE_INGREDIENT", (form) => ({
          sku: form.get("sku"), name: form.get("name"), baseUnit: form.get("baseUnit"),
        }))}>
          <label>SKU<input name="sku" required /></label><label>Ingrediente<input name="name" required /></label>
          <label>Unidad<select name="baseUnit">{["UNIT", "G", "KG", "ML", "L"].map((unit) =>
            <option key={unit}>{unit}</option>)}</select></label>
          <button className="button button-primary">Crear ingrediente</button>
        </form>
        <form className="inline-form" onSubmit={formCommand("CREATE_WAREHOUSE", (form) => ({
          code: form.get("code"), name: form.get("name"),
          branchIds: form.getAll("branchIds"),
        }))}>
          <label>Código<input name="code" required /></label><label>Depósito<input name="name" required /></label>
          <fieldset><legend>Sucursales abastecidas</legend>{data.branches.map((branch) =>
            <label key={branch.id}><input type="checkbox" name="branchIds" value={branch.id} />{branch.name}</label>)}</fieldset>
          <button className="button button-primary">Crear depósito compartido</button>
        </form>
      </section>
      <section className="ui-card"><h2>Entrada, merma o corrección</h2>
        <form className="inline-form" onSubmit={formCommand("RECORD_MOVEMENT", (form) => {
          const kind = String(form.get("kind"));
          const raw = String(form.get("quantity"));
          const quantity = ["WASTE", "RECIPE_CONSUMPTION"].includes(kind) && !raw.startsWith("-")
            ? `-${raw}` : raw;
          return {
            warehouseId: form.get("warehouseId"), ingredientId: form.get("ingredientId"),
            kind, quantity, reason: form.get("reason"), commandId: crypto.randomUUID(),
          };
        })}>
          <label>Depósito<select name="warehouseId" required>{data.warehouses.map((item) =>
            <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Ingrediente<select name="ingredientId" required>{data.ingredients.map((item) =>
            <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Tipo<select name="kind"><option value="RECEIPT">Recepción</option>
            <option value="WASTE">Merma</option><option value="CORRECTION">Corrección firmada</option>
          </select></label>
          <label>Cantidad<input name="quantity" inputMode="decimal" required /></label>
          <label>Motivo<input name="reason" minLength={2} required /></label>
          <button className="button button-primary">Registrar movimiento</button>
        </form>
      </section>
      <section className="ui-card"><h2>Cupo offline por sucursal</h2>
        <form className="inline-form" onSubmit={formCommand("SET_ALLOCATION", (form) => ({
          branchId: form.get("branchId"), warehouseId: form.get("warehouseId"),
          ingredientId: form.get("ingredientId"), available: form.get("available"),
          safetyStock: form.get("safetyStock"),
        }))}>
          <label>Sucursal<select name="branchId" required>{data.branches.map((item) =>
            <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Depósito<select name="warehouseId" required>{data.warehouses.map((item) =>
            <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Ingrediente<select name="ingredientId" required>{data.ingredients.map((item) =>
            <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Disponible<input name="available" inputMode="decimal" required /></label>
          <label>Stock seguridad<input name="safetyStock" inputMode="decimal" defaultValue="0" required /></label>
          <button className="button button-primary">Guardar cupo</button>
        </form>
        <div className="branch-list">{data.allocations.map((item) => <article key={item.id}>
          <strong>{data.branches.find((branch) => branch.id === item.branchId)?.name} · {data.ingredients.find((ingredient) => ingredient.id === item.ingredientId)?.name}</strong>
          <span>{item.available} disponibles · seguridad {item.safetyStock}</span>
        </article>)}</div>
      </section>
      <section className="ui-card"><h2>Historial inmutable</h2>
        <div className="branch-list">{data.movements.map((movement) => <article key={movement.id}>
          <code>{movement.kind}</code><strong>{movement.quantity} · saldo {movement.balanceAfter}</strong>
          <span>{new Date(movement.occurredAt).toLocaleString("es-AR")} · {movement.reason}</span>
          {!movement.reversalOfId ? <button className="button" onClick={() => {
            const reason = prompt("Motivo de reversión");
            if (reason) void command({
              action: "REVERSE_MOVEMENT", movementId: movement.id,
              reason, commandId: crypto.randomUUID(),
            });
          }}>Revertir</button> : null}
        </article>)}</div>
      </section>
    </main>
  );
}
