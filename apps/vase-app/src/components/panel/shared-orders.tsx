"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { changeOrderStatusAction } from "@/app/(platform)/app/pedidos/actions";
import type { SharedOrders } from "@/server/services/business-shared";

type Order = SharedOrders["items"][number];

// Cómo se ve cada estado (los mismos que en la tienda) y qué se puede hacer desde cada uno.
export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Nuevo", tone: "b" },
  pending_payment: { label: "Esperando el pago", tone: "y" },
  unpaid: { label: "Sin pagar", tone: "y" },
  paid: { label: "Pagado", tone: "g" },
  processing: { label: "Preparando", tone: "p" },
  cancelled: { label: "Cancelado", tone: "" },
  draft: { label: "Borrador", tone: "" },
};

const NEXT: Array<{ id: string; label: string }> = [
  { id: "paid", label: "Marcar pagado" },
  { id: "processing", label: "Preparando" },
  { id: "pending_payment", label: "Esperando el pago" },
  { id: "cancelled", label: "Cancelar pedido" },
];

function money(value: number | null, currency: string) {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$ ${value.toLocaleString("es-AR")}`;
  }
}

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date);
}

/** Pedidos (Compartido): la lista y, al tocar uno, el detalle con lo que se puede hacer. */
export function SharedOrdersBoard({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const open = orders.find((order) => order.id === openId) ?? null;

  const change = (status: string) => {
    if (!open) return;
    startTransition(async () => {
      const mails = status === "paid" || status === "cancelled";
      const result = await changeOrderStatusAction({ orderId: open.id, status: status as never, notifyCustomer: mails && notify, reason: reason.trim() || undefined });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setReason("");
        router.refresh();
      }
    });
  };

  if (orders.length === 0) return <div className="vpa-empty" style={{ margin: "8px 0" }}>Todavía no te llegaron pedidos.</div>;

  return (
    <>
      <div className="vpa-tw">
        <table className="vpa-tbl vpa-click">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th className="r">Unidades</th>
              <th className="r">Total</th>
              <th>Por</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = ORDER_STATUS[order.status] ?? { label: order.status, tone: "" };
              return (
                <tr
                  key={order.id}
                  tabIndex={0}
                  onClick={() => {
                    setOpenId(order.id);
                    setMessage(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setOpenId(order.id);
                  }}
                >
                  <td className="vpa-mut">{shortDate(order.createdAt)}</td>
                  <td>
                    <b>{order.customerName ?? "Sin nombre"}</b>
                  </td>
                  <td className="r">{order.units.toLocaleString("es-AR")}</td>
                  <td className="r">{money(order.total, order.currency)}</td>
                  <td className="vpa-mut">{order.whatsapp ? "WhatsApp" : "Tienda"}</td>
                  <td>
                    <span className={`vpa-tag ${status.tone}`}>
                      <i />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="vpa-ov" onClick={() => setOpenId(null)}>
          <div className="vpa-dr" role="dialog" aria-label="Detalle del pedido" onClick={(event) => event.stopPropagation()}>
            <div className="vpa-mh">
              <div>
                <h3>{open.customerName ?? "Pedido"}</h3>
                <p>
                  {shortDate(open.createdAt)} · {open.whatsapp ? "Por WhatsApp" : "Por la tienda"} · {(ORDER_STATUS[open.status] ?? { label: open.status }).label}
                </p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpenId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="vpa-drb">
              <section className="vpa-ordbox">
                {open.lines.map((line, index) => (
                  <div className="vpa-ordline" key={`${line.sku ?? line.name}-${index}`}>
                    <span className="q">{line.qty}×</span>
                    <span className="vpa-g1">
                      <b>{line.name}</b>
                      {line.sku ? <span>Código {line.sku}</span> : null}
                    </span>
                    <b>{money(line.total, open.currency)}</b>
                  </div>
                ))}
                {open.shipping ? (
                  <div className="vpa-ordline sum">
                    <span className="vpa-g1">Envío</span>
                    <b>{money(open.shipping, open.currency)}</b>
                  </div>
                ) : null}
                <div className="vpa-ordline sum total">
                  <span className="vpa-g1">Total</span>
                  <b>{money(open.total, open.currency)}</b>
                </div>
              </section>

              <section className="vpa-ordbox">
                <b style={{ fontSize: 13 }}>Cliente</b>
                <span className="vpa-note">{[open.customerEmail, open.customerPhone, open.address].filter(Boolean).join(" · ") || "Sin datos de contacto"}</span>
                {open.customerPhone ? (
                  <a className="vpa-btn line sm" style={{ alignSelf: "flex-start" }} href={`https://wa.me/${open.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={14} aria-hidden="true" /> Escribirle por WhatsApp
                  </a>
                ) : null}
              </section>

              <section className="vpa-ordbox">
                <b style={{ fontSize: 13 }}>Cambiar el estado</b>
                <div className="vpa-ordacts">
                  {NEXT.filter((item) => item.id !== open.status).map((item) => (
                    <button key={item.id} type="button" className={item.id === "cancelled" ? "vpa-btn soft sm danger" : item.id === "paid" ? "vpa-btn acc sm" : "vpa-btn line sm"} disabled={pending} onClick={() => change(item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
                {open.customerEmail ? (
                  <label className="vpa-check">
                    <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
                    Avisarle por correo si lo marco pagado o cancelado
                  </label>
                ) : null}
                {notify && open.customerEmail ? (
                  <input className="vpa-inp" value={reason} maxLength={400} onChange={(event) => setReason(event.target.value)} placeholder="Si lo cancelás, contale por qué" aria-label="Motivo" />
                ) : null}
                {message ? (
                  <span role="status" className="vpa-note" style={{ color: message.ok ? "var(--ok)" : "var(--red)" }}>
                    {message.text}
                  </span>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
