"use client";

import { useEffect, useMemo, useState } from "react";

type Pricing = { id: string; version: number; currency: string; setupPrice: number; monthlyPrice: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" };
type Tenant = {
  id: string;
  name: string;
  managementContract: null | { integrationProvider: "EXTERNAL_API" | "VASE_MANAGEMENT"; provisioningStatus: string };
  tenantModules: Array<{ isActive: boolean }>;
  memberships: Array<{ user: { id: string; name: string; email: string }; role: "OWNER" | "MANAGER" | "MEMBER" }>;
  managementIdentityLinks: Array<{ userId: string; isActive: boolean }>;
};
type Payload = { pricing: Pricing[]; tenants: Tenant[] };

const ars = (value: number | undefined, fallback: number) => `$ ${(value ?? fallback).toLocaleString("es-AR")}`;

/** Admin › Productos › Management: precio, en qué cuentas está prendido y quién lo usa. */
export function ManagementControlCenter() {
  const [data, setData] = useState<Payload>({ pricing: [], tenants: [] });
  const [loaded, setLoaded] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const tenant = useMemo(() => data.tenants.find((item) => item.id === selectedTenant) ?? data.tenants[0], [data.tenants, selectedTenant]);

  async function load() {
    const response = await fetch("/api/admin/management");
    if (response.ok) setData(await response.json());
    setLoaded(true);
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  async function command(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/management", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      setData(payload);
      setMessage({ ok: true, text: "Listo, guardado." });
    } else setMessage({ ok: false, text: payload.error ?? "No pudimos guardar el cambio." });
    setBusy(false);
  }

  const published = data.pricing.find((item) => item.status === "PUBLISHED");
  const draft = data.pricing.find((item) => item.status === "DRAFT");
  const active = tenant?.tenantModules[0]?.isActive ?? false;

  return (
    <div className="vpa-stack">
      <section className="vpa-g2">
        <div className="vpa-card stack">
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Precio vigente</h3>
              <p>Lo que paga una cuenta nueva.</p>
            </div>
          </div>
          <div className="vpa-facts">
            <div>
              <div className="vpa-lab">Alta</div>
              <b>{ars(published?.setupPrice, 350000)}</b>
            </div>
            <div>
              <div className="vpa-lab">Por mes</div>
              <b>{ars(published?.monthlyPrice, 95000)}</b>
            </div>
          </div>
        </div>

        <form
          className="vpa-card stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void command({ operation: "SAVE_DRAFT", setupPrice: Number(form.get("setup")), monthlyPrice: Number(form.get("monthly")), currency: "ARS" });
          }}
        >
          <div className="vpa-sech">
            <div className="vpa-g1">
              <h3>Cambiar el precio</h3>
              <p>Se guarda como borrador; vale cuando lo publicás.</p>
            </div>
          </div>
          <div className="vpa-two">
            <label className="vpa-fld">
              <span>Alta</span>
              <input className="vpa-inp" name="setup" type="number" required defaultValue={published?.setupPrice ?? 350000} />
            </label>
            <label className="vpa-fld">
              <span>Por mes</span>
              <input className="vpa-inp" name="monthly" type="number" required defaultValue={published?.monthlyPrice ?? 95000} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={busy} className="vpa-btn line">
              Guardar borrador
            </button>
            {draft ? (
              <button type="button" disabled={busy} onClick={() => command({ operation: "PUBLISH", pricingId: draft.id })} className="vpa-btn acc">
                Publicar {ars(draft.monthlyPrice, 0)} por mes
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="vpa-card stack">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Cuentas</h3>
            <p>Elegí una para prenderle Management y decidir quién lo usa.</p>
          </div>
          <select className="vpa-inp" style={{ width: "auto", minWidth: 240 }} value={tenant?.id ?? ""} onChange={(event) => setSelectedTenant(event.target.value)} aria-label="Cuenta">
            {data.tenants.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {!loaded ? (
          <div className="vpa-empty">Cargando…</div>
        ) : !tenant ? (
          <div className="vpa-empty">No hay cuentas.</div>
        ) : (
          <>
            <div className="vpa-tw">
              <table className="vpa-tbl">
                <tbody>
                  <tr>
                    <td>
                      <b>Management</b>
                      <span className="sub">{tenant.managementContract?.provisioningStatus ? `Estado: ${tenant.managementContract.provisioningStatus}` : "Todavía no se preparó"}</span>
                    </td>
                    <td>
                      <span className={`vpa-tag ${active ? "g" : ""}`}>
                        <i />
                        {active ? "Prendido" : "Apagado"}
                      </span>
                    </td>
                    <td className="r">
                      <button disabled={busy || !published} onClick={() => command({ operation: "ASSIGN_TENANT", tenantId: tenant.id, active: !active })} className={`vpa-btn sm ${active ? "line danger" : "acc"}`}>
                        {active ? "Apagar" : "Prender con el precio vigente"}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <b>De dónde salen los productos</b>
                      <span className="sub">{tenant.managementContract?.integrationProvider === "VASE_MANAGEMENT" ? "De Vase Management" : "De su sistema externo"}</span>
                    </td>
                    <td />
                    <td className="r">
                      <button
                        disabled={busy || !tenant.managementContract}
                        onClick={() =>
                          command({
                            operation: "SET_PROVIDER",
                            tenantId: tenant.id,
                            provider: tenant.managementContract?.integrationProvider === "VASE_MANAGEMENT" ? "EXTERNAL_API" : "VASE_MANAGEMENT",
                          })
                        }
                        className="vpa-btn line sm"
                      >
                        Cambiar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="vpa-lab">Quién lo usa</div>
              <div className="vpa-tw">
                <table className="vpa-tbl">
                  <tbody>
                    {tenant.memberships.map(({ user, role }) => {
                      const link = tenant.managementIdentityLinks.find((item) => item.userId === user.id);
                      return (
                        <tr key={user.id}>
                          <td className="wrap">
                            <b>{user.name}</b>
                            <span className="sub">{user.email}</span>
                          </td>
                          <td>
                            <span className={`vpa-tag ${link?.isActive ? "g" : ""}`}>
                              <i />
                              {link?.isActive ? "Puede usarlo" : "Sin acceso"}
                            </span>
                          </td>
                          <td className="r">
                            <button
                              disabled={busy || !active}
                              onClick={() => command({ operation: "ASSIGN_USER", tenantId: tenant.id, userId: user.id, active: !link?.isActive, role })}
                              className="vpa-btn line sm"
                            >
                              {link?.isActive ? "Sacar acceso" : "Dar acceso"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {message ? (
          <p role="status" className={message.ok ? "vpa-notice" : "vpa-saveerr"} style={{ margin: 0 }}>
            {message.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}
