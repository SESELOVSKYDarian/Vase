"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

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
    void fetch("/api/v1/inventory", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setData(payload);
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
