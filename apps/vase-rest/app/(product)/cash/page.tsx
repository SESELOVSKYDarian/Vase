"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

function token() {
  try {
    return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}").sessionToken ?? "";
  } catch {
    return "";
  }
}

type Drawer = {
  id: string;
  stationId: string;
  status: string;
  expectedCash: string;
  countedCash: string | null;
  variance: string | null;
  revision: number;
};

export default function CashierPage() {
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/v1/cash", {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setDrawers(payload.drawers);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [refresh]);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/v1/cash", {
      action: "OPEN",
      stationId: form.get("stationId"),
      openingFloat: form.get("openingFloat"),
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function close(drawer: Drawer, form: FormData) {
    await mutate("/api/v1/cash", {
      action: "CLOSE",
      drawerId: drawer.id,
      countedCash: form.get("countedCash"),
      expectedRevision: drawer.revision,
      commandId: crypto.randomUUID(),
    });
    await refresh();
  }

  async function charge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tenderType = String(form.get("tenderType"));
    await mutate("/api/v1/payments", {
      orderId: form.get("orderId"),
      tenderType,
      amount: form.get("amount"),
      provider: tenderType === "CASH" ? undefined : form.get("provider"),
      reference: tenderType === "CASH" ? undefined : form.get("reference"),
      operator: tenderType === "CASH" ? undefined : form.get("operator"),
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function mutate(url: string, payload: unknown) {
    setError("");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error);
      throw new Error(body.error);
    }
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Caja y cobros</p>
      <h1>Turno de caja</h1>
      <form className="inline-form" onSubmit={(event) =>
        void open(event).catch((cause) => setError(String(cause)))}>
        <label>Puesto<input name="stationId" required /></label>
        <label>Fondo inicial<input name="openingFloat" inputMode="decimal" required /></label>
        <button className="button button-primary">Abrir caja</button>
      </form>
      <form className="inline-form" onSubmit={(event) =>
        void charge(event).catch((cause) => setError(String(cause)))}>
        <label>ID de orden<input name="orderId" required /></label>
        <label>Importe<input name="amount" inputMode="decimal" required /></label>
        <label>Medio
          <select name="tenderType">
            <option value="CASH">Efectivo</option>
            <option value="BANK_TRANSFER">Transferencia</option>
            <option value="EXTERNAL_TERMINAL">Terminal externa</option>
            <option value="EXTERNAL_WALLET">Billetera externa</option>
            <option value="CUSTOMER_ACCOUNT">Cuenta corriente</option>
          </select>
        </label>
        <label>Proveedor<input name="provider" /></label>
        <label>Referencia<input name="reference" /></label>
        <label>Operador<input name="operator" /></label>
        <button className="button button-primary">Registrar cobro</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {drawers.map((drawer) => (
          <article className="ui-card" key={drawer.id}>
            <h2>{drawer.stationId}</h2>
            <strong>{drawer.status}</strong>
            <p>Efectivo esperado: ARS {drawer.expectedCash}</p>
            {drawer.status === "OPEN" ? (
              <form onSubmit={(event) => {
                event.preventDefault();
                void close(drawer, new FormData(event.currentTarget))
                  .catch((cause) => setError(String(cause)));
              }}>
                <label>Efectivo contado<input name="countedCash" required /></label>
                <button className="button">Cerrar y calcular diferencia</button>
              </form>
            ) : <p>Diferencia: ARS {drawer.variance}</p>}
          </article>
        ))}
      </div>
    </main>
  );
}
