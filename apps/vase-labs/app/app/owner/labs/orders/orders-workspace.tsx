"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronRight, CircleAlert, PackageCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { PanelEmpty, PanelTag, type PanelTone } from "@vase/ui/panel";

type OrderItem = {
  productId?: string;
  sku?: string | null;
  name?: string;
  imageUrl?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
};

export type OrderRow = {
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

const STATUS: Record<string, { label: string; tone: PanelTone }> = {
  PROCESSING: { label: "Nuevo", tone: "b" },
  PREPARING: { label: "Preparando", tone: "y" },
  READY: { label: "Listo", tone: "g" },
  SHIPPED: { label: "Despachado", tone: "g" },
  CANCELLED: { label: "Cancelado", tone: "n" },
};

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Por preparar" },
  { id: "listos", label: "Listos" },
  { id: "cancelados", label: "Cancelados" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function inFilter(status: string, filter: FilterId) {
  if (filter === "activos") return status === "PROCESSING" || status === "PREPARING";
  if (filter === "listos") return status === "READY" || status === "SHIPPED";
  if (filter === "cancelados") return status === "CANCELLED";
  return true;
}

/** Los pasos dependen de si se retira o se envía. */
function stepsFor(order: OrderRow) {
  const delivery = order.fulfillment?.type === "DELIVERY";
  return [
    { status: "PROCESSING", label: "Nuevo" },
    { status: "PREPARING", label: "Preparando" },
    { status: "READY", label: delivery ? "Listo para enviar" : "Listo para retirar" },
    ...(delivery ? [{ status: "SHIPPED", label: "Despachado" }] : []),
  ];
}

const CHANNEL_NAME: Record<string, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", MESSENGER: "Messenger", FACEBOOK: "Messenger" };
const CHANNEL_COLOR: Record<string, string> = { WHATSAPP: "#25d366", INSTAGRAM: "linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af)", MESSENGER: "#1877f2", FACEBOOK: "#1877f2" };
const CHANNEL_ICON: Record<string, string> = { WHATSAPP: "whatsapp", INSTAGRAM: "instagram", MESSENGER: "facebook", FACEBOOK: "facebook" };

function when(value: string) {
  const at = new Date(value);
  const minutes = Math.round((Date.now() - at.getTime()) / 60_000);
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`;
  if (minutes < 60 * 24) return `hace ${Math.round(minutes / 60)} h`;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(at);
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function publicNumber(value: string) {
  return value.replace(/^LABS-/i, "");
}

function noticeFor(order: OrderRow, status: string) {
  const number = publicNumber(order.orderNumber);
  const place = order.fulfillment?.pickupLabel || order.fulfillment?.address;
  if (status === "PREPARING") return `Estamos preparando tu pedido N.º ${number}.`;
  if (status === "CANCELLED") return `Tu pedido N.º ${number} fue cancelado.`;
  if (status === "SHIPPED") return `Tu pedido N.º ${number} ya fue despachado.`;
  return `¡Tu pedido N.º ${number} ya está listo!${place ? ` Podés retirarlo en ${place}.` : ""}`;
}

export default function OrdersWorkspace({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterId>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [isPending, startTransition] = useTransition();
  const selected = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);
  const visible = orders.filter((order) => inFilter(order.operationalStatus, filter));

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected]);

  function closeDrawer() {
    setSelectedId(null);
    setPendingStatus(null);
    setFeedback(null);
  }

  function askStatus(status: string) {
    if (!selected) return;
    setPendingStatus(status);
    setNotice(noticeFor(selected, status));
    setFeedback(null);
  }

  async function changeStatus(status: string, retryNotification = false) {
    if (!selected) return;
    setFeedback(null);
    const response = await fetch(`/api/labs/orders/${selected.id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, retryNotification, notificationText: notice, carrier, trackingUrl: tracking }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(payload.error || "No se pudo actualizar el pedido.");
      return;
    }
    setFeedback(payload.order?.notificationStatus === "FAILED" ? "Quedó actualizado, pero no se pudo enviar el aviso." : "Listo, le avisamos al cliente.");
    setPendingStatus(null);
    startTransition(() => router.refresh());
  }

  if (orders.length === 0) {
    return <PanelEmpty>Tu primer pedido va a aparecer acá. Lo crea el asistente cuando el cliente confirma productos, datos y entrega.</PanelEmpty>;
  }

  const steps = selected ? stepsFor(selected) : [];
  const current = selected ? steps.findIndex((step) => step.status === selected.operationalStatus) : -1;
  const cancelled = selected?.operationalStatus === "CANCELLED";

  return (
    <>
      <section className="vpa-card" aria-label="Pedidos">
        <div className="vpa-sech">
          <div className="vpa-seg" role="tablist" aria-label="Filtrar pedidos">
            {FILTERS.map((item) => {
              const count = orders.filter((order) => inFilter(order.operationalStatus, item.id)).length;
              return (
                <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "on" : ""} onClick={() => setFilter(item.id)}>
                  {item.label} {count ? <span className="vpa-mut">{count}</span> : null}
                </button>
              );
            })}
          </div>
          <span className="vpa-mut" style={{ fontSize: 12.5 }}>Tocá un pedido para ver el detalle y cambiar su estado.</span>
        </div>
        {visible.length ? (
          visible.map((order) => {
            const state = STATUS[order.operationalStatus] ?? { label: order.operationalStatus, tone: "n" as PanelTone };
            const orderSteps = stepsFor(order);
            const at = orderSteps.findIndex((step) => step.status === order.operationalStatus);
            return (
              <button key={order.id} type="button" className="vpa-ordrow" onClick={() => { setSelectedId(order.id); setPendingStatus(null); setFeedback(null); }}>
                <span className="lx-chico sm" style={{ background: CHANNEL_COLOR[order.channel] ?? "var(--soft)" }} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {CHANNEL_ICON[order.channel] ? <img src={`/icons/channels/${CHANNEL_ICON[order.channel]}.svg`} alt="" /> : null}
                </span>
                <div className="vpa-g1">
                  <b>N.º {publicNumber(order.orderNumber)} · {order.customerName || order.customerPhone || "Cliente sin nombre"}</b>
                  <span>
                    {order.items.map((item) => `${item.quantity || 1}× ${item.name || "Producto"}`).join(", ") || CHANNEL_NAME[order.channel] || order.channel}
                  </span>
                </div>
                {at >= 0 ? (
                  <span className="vpa-dots" aria-hidden="true">
                    {orderSteps.map((step, index) => <i key={step.status} className={index <= at ? "on" : ""} />)}
                  </span>
                ) : null}
                <PanelTag tone={state.tone}>{state.label}</PanelTag>
                <b style={{ minWidth: 96, textAlign: "right" }}>{money(order.totalAmount, order.currency)}</b>
                <small className="vpa-mut" style={{ minWidth: 72, textAlign: "right", fontSize: 12 }} title={date(order.updatedAt)}>{when(order.updatedAt)}</small>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            );
          })
        ) : (
          <PanelEmpty>No hay pedidos en esta pestaña.</PanelEmpty>
        )}
      </section>

      {selected ? (
        <div className="vpa-ov" style={{ position: "fixed" }} onClick={closeDrawer}>
          <div className="vpa-dr" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(event) => event.stopPropagation()}>
            <div className="vpa-mh">
              <div className="vpa-g1">
                <h3 id="order-title">Pedido N.º {publicNumber(selected.orderNumber)}</h3>
                <p>{selected.customerName || "Cliente"} · {CHANNEL_NAME[selected.channel] ?? selected.channel} · {date(selected.updatedAt)}</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={closeDrawer}>
                <X size={18} />
              </button>
            </div>

            <div className="vpa-drb">
              <div>
                <div className="vpa-lab">Estado</div>
                {cancelled ? (
                  <PanelTag tone="n">Cancelado</PanelTag>
                ) : (
                  <div className="vpa-stepper">
                    {steps.map((step, index) => {
                      const done = index < current;
                      const now = index === current;
                      const next = index === current + 1;
                      return (
                        <button
                          key={step.status}
                          type="button"
                          className={`vpa-stp${done ? " done" : now ? " now" : ""}${!done && !now && !next ? " off" : ""}`}
                          disabled={!next || isPending}
                          onClick={() => askStatus(step.status)}
                          aria-current={now ? "step" : undefined}
                        >
                          <i>{done ? "✓" : index + 1}</i>
                          <span>{step.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {pendingStatus ? (
                <div className="vpa-stack" style={{ gap: 10 }}>
                  <div className="vpa-lab" style={{ marginBottom: 0 }}>Aviso que le llega al cliente por {CHANNEL_NAME[selected.channel] ?? selected.channel}</div>
                  {pendingStatus === "SHIPPED" ? (
                    <>
                      <input className="vpa-inp" value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Transportista" aria-label="Transportista" />
                      <input className="vpa-inp" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Enlace o código de seguimiento" aria-label="Seguimiento" />
                    </>
                  ) : null}
                  <textarea className="vpa-inp vpa-area" value={notice} onChange={(event) => setNotice(event.target.value)} rows={3} aria-label="Texto del aviso" />
                  <div className="vpa-acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="vpa-btn soft sm" onClick={() => setPendingStatus(null)}>Volver</button>
                    <button
                      type="button"
                      className="vpa-btn acc sm"
                      disabled={isPending || !notice.trim() || (pendingStatus === "SHIPPED" && (!carrier.trim() || !tracking.trim()))}
                      onClick={() => changeStatus(pendingStatus)}
                    >
                      {pendingStatus === "CANCELLED" ? "Cancelar y avisar" : "Cambiar y avisar"}
                    </button>
                  </div>
                </div>
              ) : null}

              {selected.notificationStatus === "FAILED" ? (
                <div className="vpa-alert">
                  <CircleAlert size={16} aria-hidden="true" />
                  <span>No se pudo enviar el último aviso.</span>
                  {selected.operationalStatus === "READY" ? (
                    <button type="button" className="vpa-btn line sm" disabled={isPending} onClick={() => changeStatus("READY", true)}>Reintentar</button>
                  ) : null}
                </div>
              ) : null}
              {feedback ? <p className="vpa-mut" role="status">{feedback}</p> : null}

              <div>
                <div className="vpa-lab">Productos</div>
                {selected.items.map((item, index) => (
                  <div className="vpa-row" key={`${item.productId}-${index}`}>
                    <span className="vpa-tag" aria-hidden="true">{item.quantity || 1}×</span>
                    <div className="vpa-g1">
                      <b>{item.name || item.productId || "Producto"}</b>
                      <span>{money(item.unitPrice || 0, selected.currency)} c/u</span>
                    </div>
                    <b>{money(item.totalAmount || 0, selected.currency)}</b>
                  </div>
                ))}
              </div>

              <div className="vpa-ordtot">
                <div className="vpa-g1">
                  <b>Total</b>
                  <span>
                    {selected.fulfillment?.type === "DELIVERY" ? "Envío" : "Retiro"}: {selected.fulfillment?.pickupLabel || selected.fulfillment?.address || "a coordinar"}
                    {selected.shippingAmount ? ` · envío ${money(selected.shippingAmount, selected.currency)}` : ""}
                  </span>
                </div>
                <b className="big">{money(selected.totalAmount, selected.currency)}</b>
              </div>

              <div>
                <div className="vpa-lab">Cliente</div>
                <b>{selected.customerName || "Sin nombre"}</b>
                <p className="vpa-mut" style={{ marginTop: 2 }}>{[selected.customerPhone, selected.customerEmail].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
              </div>

              {!cancelled && !pendingStatus ? (
                <button type="button" className="vpa-lnk" style={{ color: "var(--red)", alignSelf: "flex-start", background: "none", border: 0, cursor: "pointer", padding: 0 }} onClick={() => askStatus("CANCELLED")}>
                  Cancelar pedido
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
