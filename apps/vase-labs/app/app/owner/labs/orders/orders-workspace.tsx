"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, ChevronRight, CircleAlert, Clock3, PackageCheck, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";

type OrderItem = {
  productId?: string;
  sku?: string | null;
  name?: string;
  imageUrl?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  sourceStatus: string;
  operationalStatus: string;
  notificationStatus: string | null;
  notificationError: string | null;
  channel: string;
  currency: string;
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  fulfillment: { type?: string; pickupLabel?: string; address?: string } | null;
  items: OrderItem[];
  updatedAt: string;
  events: Array<{ id: string; toStatus: string; notificationStatus: string | null; createdAt: string }>;
};

const statusCopy: Record<string, string> = {
  PROCESSING: "En proceso",
  PREPARING: "En preparación",
  READY: "Listo",
  CANCELLED: "Cancelado",
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function publicNumber(value: string) {
  return value.replace(/^LABS-/i, "");
}

function statusTone(status: string) {
  if (status === "READY") return "labs-order-status is-ready";
  if (status === "CANCELLED") return "labs-order-status is-cancelled";
  if (status === "PREPARING") return "labs-order-status is-preparing";
  return "labs-order-status";
}

export default function OrdersWorkspace({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected]);

  async function changeStatus(status: string, retryNotification = false) {
    if (!selected) return;
    setFeedback(null);
    const response = await fetch(`/api/labs/orders/${selected.id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, retryNotification }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload.error || "No se pudo actualizar el pedido.");
      return;
    }
    setFeedback(payload.order?.notificationStatus === "FAILED"
      ? "El pedido quedó listo, pero no se pudo enviar el aviso."
      : status === "READY" ? "Pedido listo y cliente avisado." : "Estado actualizado.");
    startTransition(() => router.refresh());
  }

  if (orders.length === 0) {
    return (
      <div className="labs-orders-empty">
        <PackageCheck size={28} />
        <p>Tu primer pedido aparecerá acá</p>
        <span>La IA lo va a crear cuando el cliente confirme productos, datos y entrega.</span>
      </div>
    );
  }

  return (
    <>
      <section className="labs-orders-ledger" aria-label="Listado de pedidos">
        <div className="labs-orders-ledger-head">
          <span>Pedido y cliente</span><span>Canal</span><span>Estado</span><span>Total</span><span />
        </div>
        {orders.map((order) => (
          <button className="labs-order-row" key={order.id} onClick={() => { setSelectedId(order.id); setFeedback(null); }}>
            <span className="labs-order-identity">
              <strong>N.º {publicNumber(order.orderNumber)}</strong>
              <small>{order.customerName || order.customerPhone || "Cliente sin nombre"} · {date(order.updatedAt)}</small>
            </span>
            <span className="labs-order-channel">{order.channel === "MESSENGER" ? "Facebook" : order.channel.toLowerCase()}</span>
            <span className={statusTone(order.operationalStatus)}>{statusCopy[order.operationalStatus] || order.operationalStatus}</span>
            <strong className="labs-order-total">{money(order.totalAmount, order.currency)}</strong>
            <ChevronRight size={17} />
          </button>
        ))}
      </section>

      {selected ? (
        <div className="labs-order-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}>
          <section className="labs-order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <header className="labs-order-modal-header">
              <div>
                <span className="labs-order-kicker">Pedido · {selected.channel}</span>
                <h2 id="order-modal-title">N.º {publicNumber(selected.orderNumber)}</h2>
                <p>{selected.customerName || "Cliente"} · creado {date(selected.updatedAt)}</p>
              </div>
              <div className="labs-order-modal-head-actions">
                <span className={statusTone(selected.operationalStatus)}>{statusCopy[selected.operationalStatus]}</span>
                <button className="labs-order-close" onClick={() => setSelectedId(null)} aria-label="Cerrar detalle"><X size={19} /></button>
              </div>
            </header>

            <div className="labs-order-modal-body">
              <div className="labs-order-main">
                <section className="labs-order-panel">
                  <div className="labs-order-section-title"><span>Detalle del pedido</span><small>{selected.items.length} productos</small></div>
                  <div className="labs-order-items">
                    {selected.items.map((item, index) => (
                      <div className="labs-order-item" key={`${item.productId}-${index}`}>
                        <div className="labs-order-item-art">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <PackageCheck size={20} />}</div>
                        <div><strong>{item.name || item.productId || "Producto"}</strong><small>SKU {item.sku || item.productId || "—"}</small></div>
                        <span>{item.quantity || 1} × {money(item.unitPrice || 0, selected.currency)}</span>
                        <strong>{money(item.totalAmount || 0, selected.currency)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="labs-order-totals">
                    <span>Subtotal <strong>{money(selected.subtotalAmount, selected.currency)}</strong></span>
                    <span>Envío <strong>{selected.shippingAmount ? money(selected.shippingAmount, selected.currency) : "Sin cargo"}</strong></span>
                    <span className="is-total">Total <strong>{money(selected.totalAmount, selected.currency)}</strong></span>
                  </div>
                </section>
                <section className="labs-order-panel labs-order-timeline">
                  <div className="labs-order-section-title"><span>Actividad</span><small>Historial operativo</small></div>
                  {selected.events.length ? selected.events.map((event) => (
                    <div key={event.id}><Check size={14} /><span><strong>{statusCopy[event.toStatus] || event.toStatus}</strong><small>{date(event.createdAt)}{event.notificationStatus ? ` · Aviso ${event.notificationStatus.toLowerCase()}` : ""}</small></span></div>
                  )) : <div><Clock3 size={14} /><span><strong>Pedido creado</strong><small>{date(selected.updatedAt)}</small></span></div>}
                </section>
              </div>

              <aside className="labs-order-aside">
                <section>
                  <span className="labs-order-kicker">Cliente</span>
                  <strong>{selected.customerName || "Sin nombre"}</strong>
                  <p>{selected.customerPhone || "Sin teléfono"}<br />{selected.customerEmail || ""}</p>
                </section>
                <section>
                  <span className="labs-order-kicker">{selected.fulfillment?.type === "DELIVERY" ? "Entrega" : "Retiro"}</span>
                  <strong>{selected.fulfillment?.pickupLabel || selected.fulfillment?.address || "A coordinar"}</strong>
                  <p>El aviso se enviará por {selected.channel.toLowerCase()}.</p>
                </section>
                {selected.notificationStatus === "FAILED" ? (
                  <div className="labs-order-alert"><CircleAlert size={16} /><span>No se pudo enviar el último aviso.<small>{selected.notificationError}</small></span></div>
                ) : null}
                {feedback ? <p className="labs-order-feedback">{feedback}</p> : null}
                <div className="labs-order-actions">
                  {selected.operationalStatus === "PROCESSING" ? <button onClick={() => changeStatus("PREPARING")} disabled={isPending}><Truck size={16} /> Empezar preparación</button> : null}
                  {selected.operationalStatus !== "READY" && selected.operationalStatus !== "CANCELLED" ? <button className="is-primary" onClick={() => changeStatus("READY")} disabled={isPending}><PackageCheck size={16} /> Marcar listo y avisar</button> : null}
                  {selected.operationalStatus === "READY" && selected.notificationStatus === "FAILED" ? <button className="is-primary" onClick={() => changeStatus("READY", true)} disabled={isPending}>Reintentar aviso</button> : null}
                  {selected.operationalStatus !== "CANCELLED" ? <button className="is-danger" onClick={() => changeStatus("CANCELLED")} disabled={isPending}>Cancelar pedido</button> : null}
                </div>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
