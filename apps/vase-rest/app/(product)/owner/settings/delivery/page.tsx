"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = { id: string; name: string };
type Connection = {
  id: string;
  branch: Branch;
  provider: string;
  environment: string;
  status: string;
  storeId: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasWebhookSecret: boolean;
  webhookPath: string;
  lastError: string | null;
};

export default function DeliverySettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const [branchesResponse, deliveryResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/integrations/delivery", { cache: "no-store" }),
    ]);
    const branchesPayload = await branchesResponse.json();
    const deliveryPayload = await deliveryResponse.json();
    if (!branchesResponse.ok) throw new Error(branchesPayload.error);
    if (!deliveryResponse.ok) throw new Error(deliveryPayload.error);
    setBranches(branchesPayload.branches);
    setConnections(deliveryPayload.connections);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/integrations/delivery", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: form.get("branchId"),
        provider: form.get("provider"),
        environment: form.get("environment"),
        storeId: form.get("storeId"),
        clientId: String(form.get("clientId") ?? "") || undefined,
        clientSecret: String(form.get("clientSecret") ?? "") || undefined,
        webhookSecret: String(form.get("webhookSecret") ?? "") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setMessage(
      "Credenciales cifradas. La conexión seguirá pendiente hasta que el proveedor apruebe a Vase y se complete la certificación.",
    );
    event.currentTarget.reset();
    await refresh();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Configuración · Delivery</p>
      <h1>Canales de delivery</h1>
      <p>
        Las credenciales se guardan por sucursal. Cargar datos no activa un canal:
        producción exige aprobación y certificación oficial del proveedor.
      </p>
      <form className="ui-card" onSubmit={(event) =>
        void save(event).catch((cause) => setError(String(cause)))}>
        <div className="inline-form">
          <label>Sucursal
            <select name="branchId" required>
              <option value="">Seleccionar</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label>Proveedor
            <select name="provider">
              <option value="PEDIDOS_YA">PedidosYa</option>
              <option value="RAPPI">Rappi</option>
              <option value="GLOVO">Glovo</option>
              <option value="UBER_EATS">Uber Eats</option>
            </select>
          </label>
          <label>Ambiente
            <select name="environment">
              <option value="SANDBOX">Sandbox</option>
              <option value="PRODUCTION">Producción</option>
            </select>
          </label>
          <label>ID de tienda<input name="storeId" required /></label>
          <label>Client ID<input name="clientId" autoComplete="off" /></label>
          <label>Client secret<input name="clientSecret" type="password" autoComplete="new-password" /></label>
          <label>Secreto webhook<input name="webhookSecret" type="password" autoComplete="new-password" /></label>
        </div>
        <button className="button button-primary">Guardar solicitud de conexión</button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {connections.map((connection) => (
          <article className="ui-card" key={connection.id}>
            <p className="eyebrow">{connection.provider} · {connection.environment}</p>
            <h2>{connection.branch.name}</h2>
            <strong>{connection.status}</strong>
            <p>Tienda {connection.storeId}</p>
            <code>{connection.webhookPath}</code>
            <p>
              API {connection.hasClientId && connection.hasClientSecret ? "configurada" : "incompleta"}
              {" · "}Webhook {connection.hasWebhookSecret ? "configurado" : "incompleto"}
            </p>
            {connection.lastError ? <p role="alert">{connection.lastError}</p> : null}
          </article>
        ))}
      </div>
    </main>
  );
}
