"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  readCloudStaffToken,
  readLocalEdgeClient,
} from "@/lib/edge/local-edge-client";

function token() {
  return readCloudStaffToken();
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
type OrderOption = {
  id: string; orderNumber: number | null; status: string; total: string;
};
type PaymentOption = {
  id: string; tenderType: string; amount: string;
  status: string; order: { orderNumber: number };
};
type AccountOption = { id: string; code: string; name: string };

export default function CashierPage() {
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [payments, setPayments] = useState<PaymentOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const client = readLocalEdgeClient();
    const [local, localOrders] = await Promise.all([
      client.state("CASH_DRAWER"),
      client.state("ORDER"),
    ]) as [{
      aggregates: Array<{ version: number; state: Drawer }>;
    }, {
      aggregates: Array<{ state: OrderOption }>;
    }];
    setDrawers(local.aggregates.map((item) => ({
      ...item.state,
      revision: item.version,
    })));
    setOrders(localOrders.aggregates.map((item) => item.state)
      .filter((order) => !["CANCELLED", "MERGED", "REFUNDED"].includes(order.status))
      .sort((left, right) => (right.orderNumber ?? 0) - (left.orderNumber ?? 0)));
    const cloudToken = token();
    if (!cloudToken) {
      setDocuments([]);
      return;
    }
    const headers = { authorization: `Bearer ${cloudToken}` };
    const [fiscalResponse, paymentResponse, accountResponse] = await Promise.all([
      fetch("/api/v1/fiscal/documents", { headers, cache: "no-store" }),
      fetch("/api/v1/payments", { headers, cache: "no-store" }),
      fetch("/api/v1/accounts", { headers, cache: "no-store" }),
    ]);
    const [fiscalPayload, paymentPayload, accountPayload] = await Promise.all([
      fiscalResponse.json(), paymentResponse.json(), accountResponse.json(),
    ]);
    if (!fiscalResponse.ok) throw new Error(fiscalPayload.error);
    if (!paymentResponse.ok) throw new Error(paymentPayload.error);
    if (!accountResponse.ok) throw new Error(accountPayload.error);
    setDocuments(fiscalPayload.documents);
    setPayments(paymentPayload.payments);
    setAccounts(accountPayload.accounts);
  }, []);
  useEffect(() => { void refresh().catch((cause) => setError(String(cause))); }, [refresh]);

  async function open(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await readLocalEdgeClient().command({
      eventId: crypto.randomUUID(),
      aggregateType: "CASH_DRAWER",
      aggregateId: crypto.randomUUID(),
      expectedVersion: 0,
      eventType: "CASH_DRAWER_OPENED",
      idempotencyKey: crypto.randomUUID(),
      payload: {
        stationId: form.get("stationId"),
        openingFloat: form.get("openingFloat"),
      },
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function close(drawer: Drawer, form: FormData) {
    await readLocalEdgeClient().command({
      eventId: crypto.randomUUID(),
      aggregateType: "CASH_DRAWER",
      aggregateId: drawer.id,
      expectedVersion: drawer.revision,
      eventType: "CASH_DRAWER_CLOSED",
      idempotencyKey: crypto.randomUUID(),
      payload: { countedCash: form.get("countedCash") },
    });
    await refresh();
  }

  async function movement(drawer: Drawer, form: FormData) {
    await readLocalEdgeClient().command({
      eventId: crypto.randomUUID(),
      aggregateType: "CASH_DRAWER",
      aggregateId: drawer.id,
      expectedVersion: drawer.revision,
      eventType: "CASH_MOVEMENT_RECORDED",
      idempotencyKey: crypto.randomUUID(),
      payload: {
        type: form.get("type"),
        amount: form.get("amount"),
        reason: form.get("reason"),
      },
    });
    await refresh();
  }

  async function charge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tenderType = String(form.get("tenderType"));
    const paymentPayload = {
      orderId: form.get("orderId"),
      tenderType,
      amount: form.get("amount"),
      provider: ["CASH", "CUSTOMER_ACCOUNT"].includes(tenderType)
        ? undefined : form.get("provider"),
      reference: ["CASH", "CUSTOMER_ACCOUNT"].includes(tenderType)
        ? undefined : form.get("reference"),
      operator: ["CASH", "CUSTOMER_ACCOUNT"].includes(tenderType)
        ? undefined : form.get("operator"),
      customerAccountId: tenderType === "CUSTOMER_ACCOUNT"
        ? form.get("customerAccountId") : undefined,
      commandId: crypto.randomUUID(),
    };
    if (tenderType === "CASH") {
      await readLocalEdgeClient().command({
        eventId: crypto.randomUUID(),
        aggregateType: "PAYMENT",
        aggregateId: crypto.randomUUID(),
        expectedVersion: 0,
        eventType: "CASH_PAYMENT_APPLIED",
        idempotencyKey: String(paymentPayload.commandId),
        payload: {
          orderId: paymentPayload.orderId,
          amount: paymentPayload.amount,
        },
      });
    } else {
      await mutate("/api/v1/payments", paymentPayload);
    }
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

  async function refund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate("/api/v1/payments/refunds", {
      paymentId: form.get("paymentId"),
      amount: form.get("amount"),
      reason: form.get("reason"),
      externalReference: String(form.get("externalReference") ?? "") || undefined,
      operator: String(form.get("operator") ?? "") || undefined,
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function mutate(url: string, payload: unknown) {
    setError("");
    if (!token()) throw new Error("REST_CLOUD_CONNECTION_REQUIRED");
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
        <label>Orden<select name="orderId" required><option value="">Seleccionar</option>
          {orders.filter((order) => order.status !== "PAID").map((order) => (
            <option key={order.id} value={order.id}>
              #{order.orderNumber ?? "offline"} · ARS {order.total} · {order.status}
            </option>
          ))}
        </select></label>
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
        <label>Cuenta corriente<select name="customerAccountId"><option value="">No aplica</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>
            {account.code} · {account.name}
          </option>)}
        </select></label>
        <button className="button button-primary">Registrar cobro</button>
      </form>
      <p>
        <a href="/cash/accounts">Administrar cuentas corrientes</a>
        {" · "}
        <a href="/cash/reconciliation">Revisar conciliación</a>
      </p>
      <form className="inline-form" onSubmit={(event) =>
        void chargeMercadoPago(event).catch((cause) => setError(String(cause)))}>
        <label>Orden<select name="orderId" required><option value="">Seleccionar</option>
          {orders.filter((order) => order.status !== "PAID").map((order) => (
            <option key={order.id} value={order.id}>#{order.orderNumber ?? "offline"} · ARS {order.total}</option>
          ))}
        </select></label>
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
        <label>Orden pagada<select name="orderId" required><option value="">Seleccionar</option>
          {orders.filter((order) => order.status === "PAID").map((order) => (
            <option key={order.id} value={order.id}>#{order.orderNumber ?? "offline"} · ARS {order.total}</option>
          ))}
        </select></label>
        <label>Comprobante
          <select name="documentType">
            <option value="INVOICE_B">Factura B</option>
            <option value="INVOICE_A">Factura A</option>
            <option value="INVOICE_C">Factura C</option>
            <option value="CREDIT_NOTE_A">Nota de crédito A</option>
            <option value="CREDIT_NOTE_B">Nota de crédito B</option>
            <option value="CREDIT_NOTE_C">Nota de crédito C</option>
            <option value="DEBIT_NOTE_A">Nota de débito A</option>
            <option value="DEBIT_NOTE_B">Nota de débito B</option>
            <option value="DEBIT_NOTE_C">Nota de débito C</option>
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
      <form className="inline-form" onSubmit={(event) =>
        void refund(event).catch((cause) => setError(String(cause)))}>
        <label>Pago<select name="paymentId" required><option value="">Seleccionar</option>
          {payments.filter((payment) => payment.status !== "REFUNDED").map((payment) => (
            <option key={payment.id} value={payment.id}>
              Orden #{payment.order.orderNumber} · {payment.tenderType} · ARS {payment.amount}
            </option>
          ))}
        </select></label>
        <label>Importe a devolver<input name="amount" inputMode="decimal" required /></label>
        <label>Motivo<input name="reason" required /></label>
        <label>Referencia externa, si aplica<input name="externalReference" /></label>
        <label>Operador externo, si aplica<input name="operator" /></label>
        <button className="button">Registrar devolución</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {drawers.map((drawer) => (
          <article className="ui-card" key={drawer.id}>
            <h2>{drawer.stationId}</h2>
            <strong>{drawer.status}</strong>
            <p>Efectivo esperado: ARS {drawer.expectedCash}</p>
            {drawer.status === "OPEN" ? (
              <>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  void movement(drawer, new FormData(event.currentTarget))
                    .catch((cause) => setError(String(cause)));
                }}>
                  <label>Movimiento<select name="type">
                    <option value="PAID_IN">Ingreso</option>
                    <option value="PAID_OUT">Retiro</option>
                  </select></label>
                  <label>Importe<input name="amount" inputMode="decimal" required /></label>
                  <label>Motivo<input name="reason" required /></label>
                  <button className="button">Registrar movimiento</button>
                </form>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  void close(drawer, new FormData(event.currentTarget))
                    .catch((cause) => setError(String(cause)));
                }}>
                  <label>Efectivo contado<input name="countedCash" required /></label>
                  <button className="button">Cerrar y calcular diferencia</button>
                </form>
              </>
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
