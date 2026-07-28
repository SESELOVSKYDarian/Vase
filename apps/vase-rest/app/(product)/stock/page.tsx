"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type InventoryData = {
  balances: Array<{
    id: string;
    onHand: string;
    revision: number;
    ingredient: { name: string; baseUnit: string };
    warehouse: { name: string };
  }>;
  movements: Array<{
    id: string;
    kind: string;
    quantity: string;
    balanceAfter: string;
    occurredAt: string;
  }>;
  allocations: Array<{
    id: string;
    available: string;
    safetyStock: string;
    branch: { name: string };
    ingredient: { name: string };
  }>;
};

export default function StockPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void Promise.all([
      readLocalEdgeClient().state("INVENTORY_BALANCE"),
      readLocalEdgeClient().state("INVENTORY_MOVEMENT"),
      readLocalEdgeClient().state("INVENTORY_ALLOCATION"),
    ])
      .then(([balances, movements, allocations]) => {
        setData({
          balances: (balances as {
            aggregates: Array<{ state: InventoryData["balances"][number] }>;
          }).aggregates.map((item) => item.state),
          movements: (movements as {
            aggregates: Array<{ state: InventoryData["movements"][number] }>;
          }).aggregates.map((item) => item.state),
          allocations: (allocations as {
            aggregates: Array<{ state: InventoryData["allocations"][number] }>;
          }).aggregates.map((item) => item.state),
        });
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Error de inventario"));
  }, []);
  return (
    <main className="product-content">
      <p className="eyebrow">Inventario transaccional</p>
      <h1>Stock y cupos offline</h1>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {data?.balances.map((balance) => (
          <article className="ui-card" key={balance.id}>
            <Badge>{balance.warehouse.name}</Badge>
            <strong>{balance.ingredient.name}</strong>
            <span>{balance.onHand} {balance.ingredient.baseUnit}</span>
            <small>Revisión {balance.revision}</small>
          </article>
        ))}
      </div>
      <h2>Asignaciones por sucursal</h2>
      <div className="catalog-grid">
        {data?.allocations.map((allocation) => (
          <article className="ui-card" key={allocation.id}>
            <strong>{allocation.branch.name} · {allocation.ingredient.name}</strong>
            <span>Disponible {allocation.available}</span>
            <small>Reserva de seguridad {allocation.safetyStock}</small>
          </article>
        ))}
      </div>
      <h2>Historial inmutable</h2>
      <div className="branch-list">
        {data?.movements.map((movement) => (
          <article key={movement.id}>
            <code>{movement.kind}</code>
            <strong>{movement.quantity}</strong>
            <span>Saldo {movement.balanceAfter} · {new Date(movement.occurredAt).toLocaleString("es-AR")}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
