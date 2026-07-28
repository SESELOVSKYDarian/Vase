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

type FiscalDocument = {
  id: string;
  orderId: string;
  documentType: string;
  pointOfSale: number;
  voucherNumber: number | null;
  status: string;
  total: string;
  cae: string | null;
  qrUrl: string | null;
};

export default function CashierPage() {
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const headers = { authorization: `Bearer ${token()}` };
    const [cashResponse, fiscalResponse] = await Promise.all([
      fetch("/api/v1/cash", { headers, cache: "no-store" }),
      fetch("/api/v1/fiscal/documents", { headers, cache: "no-store" }),
    ]);
    const cashPayload = await cashResponse.json();
    const fiscalPayload = await fiscalResponse.json();
    if (!cashResponse.ok) throw new Error(cashPayload.error);
    if (!fiscalResponse.ok) throw new Error(fiscalPayload.error);
    setDrawers(cashPayload.drawers);
    setDocuments(fiscalPayload.documents);
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

  async function chargeMercadoPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/v1/payments/mercado-pago", {
      orderId: form.get("orderId"),
      kind: form.get("kind"),
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
  }

  async function issueFiscalDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/v1/fiscal/documents", {
      orderId: form.get("orderId"),
      documentType: form.get("documentType"),
      recipientDocType: Number(form.get("recipientDocType")),
      recipientDocNumber: String(form.get("recipientDocNumber") ?? "").replace(/\D/g, ""),
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
      <form className="inline-form" onSubmit={(event) =>
        void chargeMercadoPago(event).catch((cause) => setError(String(cause)))}>
        <label>ID de orden<input name="orderId" required /></label>
        <label>Mercado Pago
          <select name="kind">
            <option value="POINT">Point</option>
            <option value="QR">QR</option>
          </select>
        </label>
        <button className="button button-primary">Iniciar cobro integrado</button>
      </form>
      <form className="inline-form" onSubmit={(event) =>
        void issueFiscalDocument(event).catch((cause) => setError(String(cause)))}>
        <label>ID de orden pagada<input name="orderId" required /></label>
        <label>Comprobante
          <select name="documentType">
            <option value="INVOICE_B">Factura B</option>
            <option value="INVOICE_A">Factura A</option>
            <option value="INVOICE_C">Factura C</option>
          </select>
        </label>
        <label>Tipo de documento receptor
          <select name="recipientDocType" defaultValue="99">
            <option value="99">Consumidor final</option>
            <option value="80">CUIT</option>
            <option value="96">DNI</option>
          </select>
        </label>
        <label>Número de documento<input name="recipientDocNumber" defaultValue="0" inputMode="numeric" required /></label>
        <button className="button button-primary">Emitir en ARCA</button>
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
      <h2>Comprobantes fiscales</h2>
      <div className="catalog-grid">
        {documents.map((document) => (
          <article className="ui-card" key={document.id}>
            <h3>{document.documentType}</h3>
            <strong>{document.status}</strong>
            <p>
              {document.voucherNumber
                ? `PV ${document.pointOfSale} · N.º ${document.voucherNumber}`
                : "Pendiente de autorización"}
            </p>
            <p>ARS {document.total}</p>
            {document.cae ? <small>CAE {document.cae}</small> : null}
            {document.qrUrl ? <a href={document.qrUrl} target="_blank" rel="noreferrer">Abrir QR fiscal</a> : null}
          </article>
        ))}
      </div>
    </main>
  );
}
