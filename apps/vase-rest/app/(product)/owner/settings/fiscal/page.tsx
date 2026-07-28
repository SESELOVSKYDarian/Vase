"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Branch = { id: string; name: string };
type Connection = {
  branch: Branch;
  environment: string;
  status: string;
  cuit: string;
  legalName: string;
  pointOfSale: number;
  certificateNotAfter: string;
  authorizedVoucherTypes: string[];
};

const voucherTypes = [
  ["INVOICE_A", "Factura A"],
  ["INVOICE_B", "Factura B"],
  ["INVOICE_C", "Factura C"],
  ["CREDIT_NOTE_A", "Nota de crédito A"],
  ["CREDIT_NOTE_B", "Nota de crédito B"],
  ["CREDIT_NOTE_C", "Nota de crédito C"],
  ["DEBIT_NOTE_A", "Nota de débito A"],
  ["DEBIT_NOTE_B", "Nota de débito B"],
  ["DEBIT_NOTE_C", "Nota de débito C"],
] as const;

export default function FiscalSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const [branchResponse, fiscalResponse] = await Promise.all([
      fetch("/api/v1/branches", { cache: "no-store" }),
      fetch("/api/v1/integrations/arca", { cache: "no-store" }),
    ]);
    const branchPayload = await branchResponse.json();
    const fiscalPayload = await fiscalResponse.json();
    if (!branchResponse.ok) throw new Error(branchPayload.error);
    if (!fiscalResponse.ok) throw new Error(fiscalPayload.error);
    setBranches(branchPayload.branches);
    setConnections(fiscalPayload.connections);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [refresh]);

  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const certificate = form.get("certificate");
    const privateKey = form.get("privateKey");
    if (!(certificate instanceof File) || !(privateKey instanceof File)) {
      throw new Error("Seleccioná el certificado y la clave privada.");
    }
    const response = await fetch("/api/v1/integrations/arca", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branchId: form.get("branchId"),
        environment: form.get("environment"),
        cuit: String(form.get("cuit") ?? "").replace(/\D/g, ""),
        legalName: form.get("legalName"),
        pointOfSale: Number(form.get("pointOfSale")),
        certificatePem: await certificate.text(),
        privateKeyPem: await privateKey.text(),
        passphrase: String(form.get("passphrase") ?? "") || undefined,
        authorizedVoucherTypes: form.getAll("voucherTypes"),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setMessage(
      payload.status === "PRODUCTION_PENDING_SMOKE"
        ? "Credenciales guardadas. Verificá la conexión para habilitar producción."
        : "Credenciales de homologación verificadas localmente y guardadas.",
    );
    event.currentTarget.reset();
    await refresh();
  }

  async function verify(branchId: string) {
    setError("");
    setMessage("");
    const response = await fetch("/api/v1/integrations/arca", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchId, action: "VERIFY_CONNECTION" }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setMessage(
      `Conexión confirmada por ARCA. Último comprobante ${payload.checkedVoucherType}: ${payload.lastAuthorized}.`,
    );
    await refresh();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Configuración · Fiscal</p>
      <h1>ARCA · Facturación electrónica</h1>
      <p>
        La configuración es independiente por sucursal y punto de venta. El certificado,
        la clave privada y el ticket de acceso se almacenan cifrados y nunca se devuelven.
      </p>
      <form className="ui-card" onSubmit={(event) =>
        void configure(event).catch((cause) => setError(String(cause)))}>
        <h2>Configurar credenciales</h2>
        <div className="inline-form">
          <label>Sucursal
            <select name="branchId" required>
              <option value="">Seleccionar</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label>Ambiente
            <select name="environment" defaultValue="SANDBOX">
              <option value="SANDBOX">Homologación</option>
              <option value="PRODUCTION">Producción</option>
            </select>
          </label>
          <label>CUIT<input name="cuit" inputMode="numeric" required /></label>
          <label>Razón social<input name="legalName" required /></label>
          <label>Punto de venta<input name="pointOfSale" type="number" min="1" max="99999" required /></label>
          <label>Certificado X.509 (.crt/.pem)
            <input name="certificate" type="file" accept=".crt,.pem,text/plain" required />
          </label>
          <label>Clave privada (.key/.pem)
            <input name="privateKey" type="file" accept=".key,.pem,text/plain" required />
          </label>
          <label>Contraseña de clave, si corresponde
            <input name="passphrase" type="password" autoComplete="new-password" />
          </label>
        </div>
        <fieldset>
          <legend>Comprobantes autorizados para esta sucursal</legend>
          <div className="inline-form">
            {voucherTypes.map(([value, label]) => (
              <label key={value}>
                <input name="voucherTypes" type="checkbox" value={value} /> {label}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="button button-primary">Validar y guardar</button>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {connections.map((connection) => (
          <article className="ui-card" key={connection.branch.id}>
            <p className="eyebrow">{connection.environment}</p>
            <h2>{connection.branch.name}</h2>
            <strong>{connection.status}</strong>
            <p>{connection.legalName} · CUIT {connection.cuit}</p>
            <p>Punto de venta {connection.pointOfSale}</p>
            <small>
              Certificado válido hasta {new Date(connection.certificateNotAfter).toLocaleDateString("es-AR")}
            </small>
            <button className="button" onClick={() =>
              void verify(connection.branch.id).catch((cause) => setError(String(cause)))}>
              Verificar conexión real
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
