"use client";

import { use, useEffect, useState, type FormEvent } from "react";

function token() {
  try { return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}").sessionToken ?? ""; }
  catch { return ""; }
}
type Product = { id: string; name: string; sku: string };
type Category = { id: string; name: string; products: Product[] };
type Order = {
  id: string; orderNumber: number; status: string; revision: number; total: string;
  items: Array<{
    id: string; nameSnapshot: string; quantity: number; lineTotal: string;
    status: string; notes?: string;
  }>;
};

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const headers = { authorization: `Bearer ${token()}` };
    const [orderResponse, catalogResponse] = await Promise.all([
      fetch(`/api/v1/orders?orderId=${orderId}`, { headers, cache: "no-store" }),
      fetch("/api/v1/catalog", { headers, cache: "no-store" }),
    ]);
    const [orderPayload, catalogPayload] = await Promise.all([
      orderResponse.json(), catalogResponse.json(),
    ]);
    if (!orderResponse.ok) throw new Error(orderPayload.error);
    if (!catalogResponse.ok) throw new Error(catalogPayload.error);
    setOrder(orderPayload.order); setCategories(catalogPayload.categories);
  }
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [orderId]);
  async function command(body: Record<string, unknown>) {
    const response = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
      body: JSON.stringify({ ...body, orderId, commandId: crypto.randomUUID() }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await refresh();
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command({
      action: "ADD_ITEM", expectedRevision: order!.revision,
      productId: form.get("productId"), quantity: Number(form.get("quantity")),
      course: Number(form.get("course")), notes: form.get("notes") || undefined,
      modifiers: [],
    });
    event.currentTarget.reset();
  }
  if (!order) return <main className="product-content"><p>{error || "Cargando pedido…"}</p></main>;
  return (
    <main className="product-content">
      <p className="eyebrow">Comanda #{order.orderNumber}</p><h1>ARS {order.total}</h1>
      {order.status === "OPEN" ? (
        <form className="inline-form" onSubmit={add}>
          <label>Producto<select name="productId" required>
            <option value="">Seleccionar</option>
            {categories.map((category) => (
              <optgroup label={category.name} key={category.id}>
                {category.products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
              </optgroup>
            ))}
          </select></label>
          <label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required /></label>
          <label>Paso<input name="course" type="number" min="1" defaultValue="1" required /></label>
          <label>Notas<input name="notes" /></label>
          <button className="button button-primary">Agregar</button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="branch-list">
        {order.items.map((item) => (
          <article key={item.id}><code>{item.status}</code>
            <strong>{item.quantity} × {item.nameSnapshot}</strong><span>ARS {item.lineTotal} {item.notes}</span>
          </article>
        ))}
      </div>
      {order.status === "OPEN" && order.items.length ? (
        <button className="button button-primary" onClick={() => void command({
          action: "SUBMIT", expectedRevision: order.revision,
        })}>Enviar a cocina</button>
      ) : null}
    </main>
  );
}
