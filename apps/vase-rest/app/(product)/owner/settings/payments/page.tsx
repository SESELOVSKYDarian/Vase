"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = { id: string; name: string };
type Connection = {
  id: string;
  branch: Branch;
  status: string;
  environment: string;
  providerAccount: string | null;
  hasWebhookSecret: boolean;
  tokenExpiresAt: string | null;
  config: {
    terminalId?: string | null;
    externalPosId?: string | null;
    qrMode?: string;
  };
};

export default function PaymentSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const [branchesResponse, connectionsResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/integrations/mercado-pago", { cache: "no-store" }),
    ]);
    const branchPayload = await branchesResponse.json();
    const connectionPayload = await connectionsResponse.json();
    if (!branchesResponse.ok) throw new Error(branchPayload.error);
    if (!connectionsResponse.ok) throw new Error(connectionPayload.error);
    setBranches(branchPayload.branches);
    setConnections(connectionPayload.connections);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [refresh]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/integrations/mercado-pago", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: form.get("branchId"),
        webhookSecret: String(form.get("webhookSecret") || "") || undefined,
        terminalId: String(form.get("terminalId") || "") || undefined,
        externalPosId: String(form.get("externalPosId") || "") || undefined,
        qrMode: form.get("qrMode"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    await refresh();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Configuración · Pagos</p>
      <h1>Mercado Pago</h1>
      <p>Cada sucursal vincula su propia cuenta. Los tokens y secretos nunca se muestran nuevamente.</p>
      <div className="catalog-grid">
        {branches.map((branch) => {
          const connection = connections.find((item) => item.branch.id === branch.id);
          return (
            <article className="ui-card" key={branch.id}>
              <h2>{branch.name}</h2>
              <strong>{connection?.status ?? "UNCONFIGURED"}</strong>
              <p>{connection?.providerAccount ?? "Sin cuenta vinculada"}</p>
              <a className="button button-primary" href={
                `/api/v1/integrations/mercado-pago/oauth/start?branchId=${encodeURIComponent(branch.id)}&environment=SANDBOX`
              }>Conectar sandbox</a>
              <a className="button" href={
                `/api/v1/integrations/mercado-pago/oauth/start?branchId=${encodeURIComponent(branch.id)}&environment=PRODUCTION`
              }>Conectar producción</a>
              {connection ? (
                <form onSubmit={(event) => void save(event).catch((cause) => setError(String(cause)))}>
                  <input type="hidden" name="branchId" value={branch.id} />
                  <label>Terminal Point<input name="terminalId" defaultValue={connection.config.terminalId ?? ""} /></label>
                  <label>ID de caja QR<input name="externalPosId" defaultValue={connection.config.externalPosId ?? ""} /></label>
                  <label>Modo QR<select name="qrMode" defaultValue={connection.config.qrMode ?? "dynamic"}>
                    <option value="dynamic">Dinámico</option>
                    <option value="hybrid">Híbrido</option>
                    <option value="static">Estático</option>
                  </select></label>
                  <label>Secreto webhook<input name="webhookSecret" type="password" placeholder={
                    connection.hasWebhookSecret ? "Configurado; dejá vacío para conservar" : "Pegá el secreto"
                  } /></label>
                  <button className="button">Guardar configuración</button>
                </form>
              ) : null}
              <small>QR requiere la validación alternativa aprobada por Mercado Pago antes de producción.</small>
            </article>
          );
        })}
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
