"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Product = { id: string; categoryId: string; name: string; sku: string };
type Category = { id: string; name: string; products: Product[] };
type Order = {
  id: string;
  orderNumber: number | null;
  status: string;
  revision: number;
  aggregateVersion: number;
  total: string;
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    lineTotal: string;
    status: string;
    notes?: string;
  }>;
};

export default function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const client = readLocalEdgeClient();
    const [orders, catalog] = await Promise.all([
      client.state("ORDER"),
      client.state("CATALOG"),
    ]) as [
      { aggregates: Array<{ aggregateId: string; version: number; state: Order }> },
      { aggregates: Array<{ state: {
        categories: Array<{ id: string; name: string }>;
        products: Product[];
      } }> },
    ];
    const found = orders.aggregates.find((item) => item.aggregateId === orderId);
    if (!found) throw new Error("EDGE_ORDER_NOT_FOUND");
    setOrder({ ...found.state, aggregateVersion: found.version });
    const snapshot = catalog.aggregates[0]?.state;
    setCategories((snapshot?.categories ?? []).map((category) => ({
      ...category,
      products: (snapshot?.products ?? []).filter((product) =>
        product.categoryId === category.id),
    })));
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [orderId]);

  async function command(action: "ADD_ITEM" | "SUBMIT", payload: Record<string, unknown>) {
    if (!order) return;
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "ORDER",
        aggregateId: orderId,
        expectedVersion: order.aggregateVersion,
        eventType: action === "ADD_ITEM"
          ? "ORDER_ITEM_ADDED" : "ORDER_SUBMITTED",
        idempotencyKey: crypto.randomUUID(),
        payload,
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_ORDER_COMMAND_FAILED");
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await command("ADD_ITEM", {
      productId: form.get("productId"),
      quantity: Number(form.get("quantity")),
      course: Number(form.get("course")),
      notes: String(form.get("notes") ?? "") || undefined,
      modifiers: [],
    });
    event.currentTarget.reset();
  }
  if (!order) {
    return <main className="product-content"><p>{error || "Cargando pedido…"}</p></main>;
  }
  return (
    <main className="product-content">
      <p className="eyebrow">
        {order.orderNumber ? `Comanda #${order.orderNumber}` : "Comanda offline pendiente"}
      </p>
      <h1>ARS {order.total}</h1>
      {order.status === "OPEN" ? (
        <form className="inline-form" onSubmit={add}>
          <label>Producto
            <select name="productId" required>
              <option value="">Seleccionar</option>
              {categories.map((category) => (
                <optgroup label={category.name} key={category.id}>
                  {category.products.map((product) => (
                    <option value={product.id} key={product.id}>{product.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required /></label>
          <label>Paso<input name="course" type="number" min="1" defaultValue="1" required /></label>
          <label>Notas<input name="notes" /></label>
          <button className="button button-primary">Agregar</button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="branch-list">
        {order.items.map((item) => (
          <article key={item.id}>
            <code>{item.status}</code>
            <strong>{item.quantity} × {item.nameSnapshot}</strong>
            <span>ARS {item.lineTotal} {item.notes}</span>
          </article>
        ))}
      </div>
      {order.status === "OPEN" && order.items.length ? (
        <button className="button button-primary" onClick={() =>
          void command("SUBMIT", {})}>
          Enviar a cocina
        </button>
      ) : null}
    </main>
  );
}
