"use client";

import { useEffect, useState } from "react";

type Table = {
  id: string; code: string; name: string; capacity: number;
  x: string; y: string; width: string; height: string;
  status: string; revision: number; mergedIntoId: string | null;
};
type Floor = { id: string; name: string; tables: Table[] };

function staffToken() {
  try {
    return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}").sessionToken ?? "";
  } catch { return ""; }
}

export default function SalonPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    const response = await fetch("/api/v1/salon", {
      headers: { authorization: `Bearer ${staffToken()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setFloors(payload.floors);
  }
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, []);

  async function transition(table: Table, to: string) {
    const response = await fetch("/api/v1/salon", {
      method: "POST",
      headers: {
        authorization: `Bearer ${staffToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "TRANSITION", tableId: table.id,
        expectedRevision: table.revision, to,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    await refresh();
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
