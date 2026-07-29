"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Scope = { id: string; name: string };
type Product = { id: string; name: string };
type Promotion = {
  id: string; code: string; name: string; scopeType: string; scopeId: string;
  discountType: string; discountValue: string; startsAt: string; endsAt: string;
  priority: number; active: boolean; revision: number;
};

export default function PromotionsPage() {
  const [branches, setBranches] = useState<Scope[]>([]);
  const [groups, setGroups] = useState<Scope[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [branchResponse, groupResponse, catalogResponse, promotionResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/branch-groups", { cache: "no-store" }),
      fetch("/api/v1/catalog", { cache: "no-store" }),
      fetch("/api/v1/promotions", { cache: "no-store" }),
    ]);
    const [branchPayload, groupPayload, catalogPayload, promotionPayload] =
      await Promise.all([
        branchResponse.json(), groupResponse.json(), catalogResponse.json(),
        promotionResponse.json(),
      ]);
    if (!branchResponse.ok) throw new Error(branchPayload.error);
    if (!groupResponse.ok) throw new Error(groupPayload.error);
    if (!catalogResponse.ok) throw new Error(catalogPayload.error);
    if (!promotionResponse.ok) throw new Error(promotionPayload.error);
    setBranches(branchPayload.branches); setGroups(groupPayload.groups);
    setProducts(catalogPayload.categories.flatMap((category: { products: Product[] }) =>
      category.products));
    setPromotions(promotionPayload.promotions);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(String(cause))); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/promotions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"), name: form.get("name"),
        scopeType: form.get("scopeType"),
        scopeId: String(form.get("scopeId") ?? "") || undefined,
        discountType: form.get("discountType"), discountValue: form.get("discountValue"),
        productIds: form.getAll("productIds"),
        paymentMethods: form.getAll("paymentMethods"),
        weekdays: form.getAll("weekdays").map(Number),
        minimumQuantity: Number(form.get("minimumQuantity")),
        startsAt: new Date(String(form.get("startsAt"))).toISOString(),
        endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        priority: Number(form.get("priority")),
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    event.currentTarget.reset(); await load();
  }
  async function toggle(promotion: Promotion) {
    const response = await fetch("/api/v1/promotions", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: promotion.id, expectedRevision: promotion.revision,
        active: !promotion.active,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await load();
  }
  return (
    <main className="product-content">
      <p className="eyebrow">Reglas comerciales reales</p><h1>Promociones</h1>
      <form className="settings-form" onSubmit={create}>
        <label>Código<input name="code" required /></label><label>Nombre<input name="name" required /></label>
        <label>Alcance<select name="scopeType"><option value="TENANT">Todo el negocio</option>
          <option value="BRANCH_GROUP">Grupo</option><option value="BRANCH">Sucursal</option></select></label>
        <label>Grupo/sucursal<select name="scopeId"><option value="">No aplica al negocio completo</option>
          <optgroup label="Grupos">{groups.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>
          <optgroup label="Sucursales">{branches.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>
        </select></label>
        <label>Descuento<select name="discountType"><option value="PERCENTAGE">Porcentaje</option>
          <option value="FIXED_PER_UNIT">Monto por unidad</option></select></label>
        <label>Valor<input name="discountValue" inputMode="decimal" required /></label>
        <label>Cantidad mínima<input name="minimumQuantity" type="number" min="1" defaultValue="1" /></label>
        <label>Prioridad<input name="priority" type="number" defaultValue="0" /></label>
        <label>Desde<input name="startsAt" type="datetime-local" required /></label>
        <label>Hasta<input name="endsAt" type="datetime-local" required /></label>
        <fieldset><legend>Productos (ninguno = todos)</legend>{products.map((product) =>
          <label key={product.id}><input type="checkbox" name="productIds" value={product.id} />{product.name}</label>)}</fieldset>
        <fieldset><legend>Medios de pago (ninguno = todos)</legend>{[
          "CASH", "BANK_TRANSFER", "EXTERNAL_TERMINAL", "EXTERNAL_WALLET",
          "CUSTOMER_ACCOUNT", "MERCADO_PAGO",
        ].map((method) => <label key={method}><input type="checkbox" name="paymentMethods" value={method} />{method}</label>)}</fieldset>
        <fieldset><legend>Días (ninguno = todos)</legend>{["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, index) =>
          <label key={day}><input type="checkbox" name="weekdays" value={index} />{day}</label>)}</fieldset>
        <button className="button button-primary">Crear promoción</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">{promotions.map((promotion) => <article className="ui-card" key={promotion.id}>
        <code>{promotion.code}</code><h2>{promotion.name}</h2>
        <p>{promotion.discountType} {promotion.discountValue} · {promotion.scopeType}</p>
        <p>{new Date(promotion.startsAt).toLocaleString("es-AR")} — {new Date(promotion.endsAt).toLocaleString("es-AR")}</p>
        <button className="button" onClick={() => void toggle(promotion)}>
          {promotion.active ? "Pausar" : "Activar"}
        </button>
      </article>)}</div>
    </main>
  );
}
