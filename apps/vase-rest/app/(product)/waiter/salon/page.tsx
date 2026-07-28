"use client";

import { useEffect, useState } from "react";
import { readLocalEdgeClient } from "@/lib/edge/local-edge-client";

type Table = {
  id: string;
  floorId?: string;
  code: string;
  name: string;
  capacity: number;
  x: string;
  y: string;
  width: string;
  height: string;
  status: string;
  revision: number;
  mergeGroupId: string | null;
  mergedIntoId: string | null;
  aggregateVersion: number;
};

export default function SalonPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [error, setError] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  async function refresh() {
    const payload = await readLocalEdgeClient().state("TABLE") as {
      aggregates: Array<{ version: number; state: Omit<Table, "aggregateVersion"> }>;
    };
    setTables(payload.aggregates.map((aggregate) => ({
      ...aggregate.state,
      aggregateVersion: aggregate.version,
    })));
  }

  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
    const interval = setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => clearInterval(interval);
  }, []);

  async function command(
    table: Table,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    setError("");
    try {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "TABLE",
        aggregateId: table.id,
        expectedVersion: table.aggregateVersion,
        eventType,
        idempotencyKey: crypto.randomUUID(),
        payload,
      });
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "REST_EDGE_COMMAND_FAILED");
      return false;
    }
  }

  async function transition(table: Table) {
    const to = table.status === "AVAILABLE" ? "OCCUPIED"
      : table.status === "OCCUPIED" ? "DIRTY"
        : table.status === "DIRTY" ? "CLEANING" : "AVAILABLE";
    await command(table, `TABLE_${to}`, {});
  }

  async function merge() {
    if (selected.length < 2) return;
    const anchor = tables.find((table) => table.id === selected[0]);
    if (!anchor) return;
    if (await command(anchor, "TABLES_MERGED", { tableIds: selected })) {
      setSelected([]);
      setMergeMode(false);
    }
  }

  function select(table: Table) {
    if (
      table.status !== "AVAILABLE" ||
      table.mergeGroupId ||
      table.mergedIntoId
    ) {
      setError("Sólo se pueden unir mesas disponibles e independientes.");
      return;
    }
    setSelected((current) => current.includes(table.id)
      ? current.filter((id) => id !== table.id)
      : [...current, table.id]);
  }

  const visibleTables = tables.filter((table) => !table.mergedIntoId);

  return (
    <main className="product-content">
      <p className="eyebrow">Salón en vivo</p>
      <h1>Mesas</h1>
      {error ? <p role="alert">{error}</p> : null}
      <div className="toolbar">
        <button className="button" type="button" onClick={() => {
          setMergeMode((current) => !current);
          setSelected([]);
        }}>{mergeMode ? "Cancelar unión" : "Unir mesas"}</button>
        {mergeMode
          ? <button className="button button-primary" type="button"
              disabled={selected.length < 2} onClick={() => void merge()}>
              Unir {selected.length} mesas
            </button>
          : null}
      </div>
      <section>
        <h2>Sucursal</h2>
        <div className="floor-canvas">
          {visibleTables.map((table) => {
            const group = table.mergeGroupId
              ? tables.filter((candidate) => candidate.mergeGroupId === table.mergeGroupId)
              : [table];
            const groupCapacity = group.reduce((sum, candidate) => sum + candidate.capacity, 0);
            return (
              <div
                key={table.id}
                className={`dining-table status-${table.status.toLowerCase()} ${
                  selected.includes(table.id) ? "is-selected" : ""
                }`}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${table.width}px`,
                  height: `${table.height}px`,
                }}
              >
                <button type="button" onClick={() =>
                  mergeMode ? select(table) : void transition(table)}>
                  <strong>{group.map((candidate) => candidate.code).join(" + ")}</strong>
                  <small>{groupCapacity} personas</small>
                  <span>{table.status}</span>
                </button>
                {table.mergeGroupId && table.status === "AVAILABLE"
                  ? <button type="button" className="button" onClick={() =>
                      void command(table, "TABLES_SPLIT", {})}>Separar</button>
                  : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
