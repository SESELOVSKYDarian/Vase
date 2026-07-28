"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Product = {
  id: string; categoryId: string; name: string; sku: string;
  modifierOptions: Array<{ id: string; name: string; priceDelta: string }>;
};
type Category = { id: string; name: string; products: Product[] };
type Order = {
  id: string;
  orderNumber: number | null;
  status: string;
  revision: number;
  aggregateVersion: number;
  total: string;
  tableId: string | null;
  guestCount: number;
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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [mergeCandidates, setMergeCandidates] = useState<Array<{
    id: string; version: number; orderNumber: number | null;
  }>>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [tables, setTables] = useState<Array<{
    id: string; code: string; capacity: number; status: string; mergedIntoId: string | null;
  }>>([]);

  async function refresh() {
    const client = readLocalEdgeClient();
    const [orders, catalog, tableState] = await Promise.all([
      client.state("ORDER"),
      client.state("CATALOG"),
      client.state("TABLE"),
    ]) as [
      { aggregates: Array<{ aggregateId: string; version: number; state: Order }> },
      { aggregates: Array<{ state: {
        categories: Array<{ id: string; name: string }>;
        products: Product[];
      } }> },
      { aggregates: Array<{ state: {
        id: string; code: string; capacity: number; status: string; mergedIntoId: string | null;
      } }> },
    ];
    const found = orders.aggregates.find((item) => item.aggregateId === orderId);
    if (!found) throw new Error("EDGE_ORDER_NOT_FOUND");
    sessionStorage.setItem(`vase-rest-order-version:${orderId}`, String(found.version));
    setOrder({ ...found.state, aggregateVersion: found.version });
    setMergeCandidates(orders.aggregates.flatMap((item) =>
      item.aggregateId !== orderId && item.state.status === "OPEN"
        ? [{ id: item.aggregateId, version: item.version, orderNumber: item.state.orderNumber }]
        : []));
    setTables(tableState.aggregates.map((item) => item.state));
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

  async function command(
    action: "ADD_ITEM" | "UPDATE_DETAILS" | "SUBMIT" | "SPLIT" | "MERGE",
    payload: Record<string, unknown>,
  ) {
    if (!order) return;
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "ORDER",
        aggregateId: orderId,
        expectedVersion: order.aggregateVersion,
        eventType: action === "ADD_ITEM" ? "ORDER_ITEM_ADDED"
          : action === "UPDATE_DETAILS" ? "ORDER_DETAILS_UPDATED"
          : action === "SUBMIT" ? "ORDER_SUBMITTED"
            : action === "SPLIT" ? "ORDER_SPLIT" : "ORDER_MERGED",
        idempotencyKey: crypto.randomUUID(),
        payload,
      });
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_ORDER_COMMAND_FAILED");
      return false;
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
      paymentMethod: String(form.get("paymentMethod") ?? "") || undefined,
      modifiers: form.getAll("modifierOptionId").map((optionId) => ({
        optionId, quantity: 1,
      })),
    });
    event.currentTarget.reset();
  }
  async function cancel() {
    const reason = prompt("Motivo de cancelación");
    if (!reason || !order) return;
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "ORDER",
        aggregateId: order.id,
        expectedVersion: order.aggregateVersion,
        eventType: "ORDER_CANCELLED",
        idempotencyKey: crypto.randomUUID(),
        payload: { reason },
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "EDGE_ORDER_CANCEL_FAILED");
    }
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
            <select name="productId" required value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}>
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
          {categories.flatMap((category) => category.products)
            .find((product) => product.id === selectedProductId)?.modifierOptions
            .map((option) => <label key={option.id}>
              <input type="checkbox" name="modifierOptionId" value={option.id} />
              {option.name} · ARS {option.priceDelta}
            </label>)}
          <label>Cantidad<input name="quantity" type="number" min="1" defaultValue="1" required /></label>
          <label>Paso<input name="course" type="number" min="1" defaultValue="1" required /></label>
          <label>Medio previsto
            <select name="paymentMethod" defaultValue="">
              <option value="">Sin restricciÃ³n</option>
              <option value="CASH">Efectivo</option>
              <option value="BANK_TRANSFER">Transferencia</option>
              <option value="EXTERNAL_TERMINAL">Tarjeta externa</option>
              <option value="EXTERNAL_WALLET">Billetera externa</option>
              <option value="CUSTOMER_ACCOUNT">Cuenta corriente</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
            </select>
          </label>
          <label>Notas<input name="notes" /></label>
          <button className="button button-primary">Agregar</button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"].includes(order.status)
        ? <form className="inline-form" onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const rawTableId = String(form.get("tableId") ?? "");
            void command("UPDATE_DETAILS", {
              tableId: rawTableId || null,
              guestCount: Number(form.get("guestCount")),
            });
          }}>
            <label>Mesa
              <select name="tableId" defaultValue={order.tableId ?? ""}>
                <option value="">Mostrador / sin mesa</option>
                {tables.filter((table) =>
                  !table.mergedIntoId &&
                  (table.id === order.tableId ||
                    ["AVAILABLE", "RESERVED"].includes(table.status)))
                  .map((table) => <option value={table.id} key={table.id}>
                    Mesa {table.code} · {table.capacity} personas
                  </option>)}
              </select>
            </label>
            <label>Cubiertos
              <input name="guestCount" type="number" min="1" max="500"
                defaultValue={order.guestCount} required />
            </label>
            <button className="button" type="submit">Actualizar mesa</button>
          </form>
        : null}
      <div className="branch-list">
        {order.items.map((item) => (
          <article key={item.id}>
            {order.status === "OPEN" ? <input
              type="checkbox"
              aria-label={`Separar ${item.nameSnapshot}`}
              checked={selectedItemIds.includes(item.id)}
              onChange={(event) => setSelectedItemIds((current) =>
                event.target.checked
                  ? [...current, item.id]
                  : current.filter((id) => id !== item.id))}
            /> : null}
            <code>{item.status}</code>
            <strong>{item.quantity} × {item.nameSnapshot}</strong>
            <span>ARS {item.lineTotal} {item.notes}</span>
          </article>
        ))}
      </div>
      {order.status === "OPEN" && order.items.length ? (
        <div className="inline-form">
          <button className="button button-primary" onClick={() =>
            void command("SUBMIT", {})}>Enviar a cocina</button>
          <button className="button" disabled={!selectedItemIds.length} onClick={() => {
            const newOrderId = crypto.randomUUID();
            void command("SPLIT", {
              itemIds: selectedItemIds,
              newOrderId,
            }).then((ok) => {
              if (!ok) return;
              setSelectedItemIds([]);
              location.assign(`/waiter/orders/${newOrderId}`);
            });
          }}>Separar selección</button>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const sourceOrderId = String(form.get("sourceOrderId"));
            const sourceExpectedVersion = mergeCandidates.find((candidate) =>
              candidate.id === sourceOrderId)?.version ?? 0;
            if (!sourceExpectedVersion) {
              setError("Abrí el pedido origen una vez antes de fusionarlo para validar su versión.");
              return;
            }
            void command("MERGE", { sourceOrderId, sourceExpectedVersion });
          }}>
            <label>Pedido a fusionar<select name="sourceOrderId" required>
              <option value="">Seleccionar</option>
              {mergeCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>
                {candidate.orderNumber ? `#${candidate.orderNumber}` : candidate.id}
              </option>)}
            </select></label>
            <button className="button">Fusionar</button>
          </form>
        </div>
      ) : null}
      {["OPEN", "SUBMITTED", "PARTIALLY_READY"].includes(order.status) ? (
        <button className="button" onClick={() => void cancel()}>Cancelar pedido</button>
      ) : null}
      {order.items.length ? (
        <button className="button" onClick={() => {
          setError("");
          void readLocalEdgeClient().printOrderReceipt(order.id, crypto.randomUUID())
            .catch((cause) => setError(
              cause instanceof Error ? cause.message : "No se pudo imprimir el comprobante.",
            ));
        }}>Imprimir comprobante no fiscal</button>
      ) : null}
    </main>
  );
}
