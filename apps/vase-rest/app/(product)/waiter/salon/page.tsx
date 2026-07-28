"use client";

import { useEffect, useState } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Table = {
  id: string; code: string; name: string; capacity: number;
  x: string; y: string; width: string; height: string;
  status: string; revision: number; mergedIntoId: string | null;
};
type Floor = { id: string; name: string; tables: Array<Table & { aggregateVersion: number }> };

export default function SalonPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const payload = await readLocalEdgeClient().state("TABLE") as {
      aggregates: Array<{ version: number; state: Table }>;
    };
    setFloors([{
      id: "edge-floor",
      name: "Sucursal",
      tables: payload.aggregates.map((aggregate) => ({
        ...aggregate.state,
        aggregateVersion: aggregate.version,
      })),
    }]);
  }
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, []);

  async function transition(table: Table, to: string) {
    try {
      const version = (table as Table & { aggregateVersion: number }).aggregateVersion;
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "TABLE",
        aggregateId: table.id,
        expectedVersion: version,
        eventType: `TABLE_${to}`,
        idempotencyKey: crypto.randomUUID(),
        payload: { ...table, status: to, revision: version + 1 },
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "REST_EDGE_COMMAND_FAILED");
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Salón en vivo</p><h1>Mesas</h1>
      {error ? <p role="alert">{error}</p> : null}
      {floors.map((floor) => (
        <section key={floor.id}>
          <h2>{floor.name}</h2>
          <div className="floor-canvas">
            {floor.tables.filter((table) => !table.mergedIntoId).map((table) => (
              <button
                key={table.id}
                className={`dining-table status-${table.status.toLowerCase()}`}
                style={{
                  left: `${table.x}px`, top: `${table.y}px`,
                  width: `${table.width}px`, height: `${table.height}px`,
                }}
                onClick={() => void transition(
                  table,
                  table.status === "AVAILABLE" ? "OCCUPIED"
                    : table.status === "OCCUPIED" ? "DIRTY"
                      : table.status === "DIRTY" ? "CLEANING" : "AVAILABLE",
                )}
              >
                <strong>{table.code}</strong><small>{table.capacity} personas</small>
                <span>{table.status}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
