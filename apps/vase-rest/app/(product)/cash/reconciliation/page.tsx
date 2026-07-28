"use client";

import { useCallback, useEffect, useState } from "react";

function token() {
  try {
    return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}")
      .sessionToken ?? "";
  } catch {
    return "";
  }
}

type Discrepancy = {
  code: string;
  entityType: string;
  entityId: string;
  detail: string;
};

export default function ReconciliationPage() {
  const [items, setItems] = useState<Discrepancy[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/v1/reconciliation", {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setItems(payload.discrepancies);
    setGeneratedAt(payload.generatedAt);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [refresh]);

  async function download() {
    const response = await fetch("/api/v1/reconciliation?format=csv", {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error);
    }
    const href = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "vase-rest-conciliacion.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Caja · Control</p>
      <h1>Conciliación</h1>
      <p>
        Compara órdenes, cobros, Mercado Pago, devoluciones y comprobantes fiscales
        registrados en PostgreSQL.
      </p>
      <button className="button" onClick={() =>
        void download().catch((cause) => setError(String(cause)))}>
        Exportar CSV seguro
      </button>
      {generatedAt ? <small>Calculado {new Date(generatedAt).toLocaleString("es-AR")}</small> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!items.length && !error ? <p>Sin diferencias pendientes.</p> : null}
      <div className="catalog-grid">
        {items.map((item) => (
          <article className="ui-card" key={`${item.code}:${item.entityId}`}>
            <p className="eyebrow">{item.entityType}</p>
            <h2>{item.code}</h2>
            <code>{item.entityId}</code>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
