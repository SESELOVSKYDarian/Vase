"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

function token() {
  try {
    return JSON.parse(sessionStorage.getItem("vase-rest-staff-session") ?? "{}")
      .sessionToken ?? "";
  } catch {
    return "";
  }
}

type Movement = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reason: string;
  createdAt: string;
};
type Account = {
  id: string;
  code: string;
  name: string;
  status: string;
  creditLimit: string | null;
  balance: string;
  movements: Movement[];
};

export default function CustomerAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/v1/accounts", {
      headers: { authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setAccounts(payload.accounts);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(String(cause)));
  }, [refresh]);

  async function mutate(payload: unknown) {
    setError("");
    const response = await fetch("/api/v1/accounts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    await refresh();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate({
      action: "CREATE",
      code: form.get("code"),
      name: form.get("name"),
      taxId: String(form.get("taxId") ?? "") || undefined,
      email: String(form.get("email") ?? "") || undefined,
      phone: String(form.get("phone") ?? "") || undefined,
      creditLimit: String(form.get("creditLimit") ?? "") || undefined,
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
  }

  async function movement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action"));
    await mutate({
      action,
      accountId: form.get("accountId"),
      amount: form.get("amount"),
      direction: action === "ADJUSTMENT" ? form.get("direction") : undefined,
      reason: form.get("reason"),
      commandId: crypto.randomUUID(),
    });
    event.currentTarget.reset();
  }

  return (
    <main className="product-content">
      <p className="eyebrow">Caja · Clientes</p>
      <h1>Cuentas corrientes</h1>
      <form className="inline-form" onSubmit={(event) =>
        void create(event).catch((cause) => setError(String(cause)))}>
        <label>Código<input name="code" required /></label>
        <label>Cliente<input name="name" required /></label>
        <label>CUIT/DNI<input name="taxId" /></label>
        <label>Email<input name="email" type="email" /></label>
        <label>Teléfono<input name="phone" /></label>
        <label>Límite de crédito<input name="creditLimit" inputMode="decimal" /></label>
        <button className="button button-primary">Crear cuenta</button>
      </form>
      <form className="inline-form" onSubmit={(event) =>
        void movement(event).catch((cause) => setError(String(cause)))}>
        <label>Cuenta
          <select name="accountId" required>
            <option value="">Seleccionar</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>Operación
          <select name="action">
            <option value="PAYMENT">Registrar pago</option>
            <option value="CHARGE">Registrar cargo</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </label>
        <label>Dirección del ajuste
          <select name="direction" defaultValue="DEBIT">
            <option value="DEBIT">Débito</option>
            <option value="CREDIT">Crédito</option>
          </select>
        </label>
        <label>Importe<input name="amount" inputMode="decimal" required /></label>
        <label>Motivo<input name="reason" required /></label>
        <button className="button button-primary">Registrar movimiento</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <div className="catalog-grid">
        {accounts.map((account) => (
          <article className="ui-card" key={account.id}>
            <p className="eyebrow">{account.code}</p>
            <h2>{account.name}</h2>
            <strong>Saldo ARS {account.balance}</strong>
            <p>Límite: {account.creditLimit ? `ARS ${account.creditLimit}` : "sin límite"}</p>
            <details>
              <summary>Últimos movimientos</summary>
              {account.movements.map((item) => (
                <p key={item.id}>
                  {item.type} · ARS {item.amount} · saldo {item.balanceAfter}<br />
                  <small>{item.reason}</small>
                </p>
              ))}
            </details>
          </article>
        ))}
      </div>
    </main>
  );
}
