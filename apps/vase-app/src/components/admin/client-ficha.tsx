"use client";

// Piezas de la ficha del cliente: ventana para ajustar un producto, ventana para cargar un cobro y notas.
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  addClientNoteAction,
  createClientChargeAction,
  deleteClientNoteAction,
  saveClientProductAction,
  toggleClientNoteAction,
  type ClientActionResult,
} from "@/app/(platform)/app/admin/actions/client-admin";

/** Ventana del Admin: se cierra con Esc, tocando afuera o con la X. Entra con una animación corta. */
export function AdminModal({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="adm-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="adm-modal-box" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div className="vpa-g1">
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="vpa-ib" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="adm-modal-body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </div>
  );
}

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ClientActionResult | null>(null);
  const run = (call: () => Promise<ClientActionResult>, after?: () => void) => {
    setResult(null);
    start(async () => {
      const next = await call().catch(() => ({ ok: false, message: "No pudimos guardar." }));
      setResult(next);
      if (next.ok) {
        after?.();
        router.refresh();
      }
    });
  };
  return { pending, result, run, setResult };
}

export type ProductCardData = {
  moduleId: string;
  name: string;
  tagline: string;
  active: boolean;
  status: string | null;
  trialEndsAt: string | null;
  planId: string | null;
  plans: Array<{ id: string; name: string; price: string | null }>;
  features: Array<{ key: string; name: string; description: string; enabled: boolean; globallyOff: boolean }>;
};

/** Tarjeta de un producto en la ficha, con su botón "Ajustar". */
export function ClientProductCard({ tenantId, product }: { tenantId: string; product: ProductCardData }) {
  const [open, setOpen] = useState(false);
  const off = product.features.filter((feature) => !feature.enabled).length;
  const plan = product.plans.find((item) => item.id === product.planId);
  return (
    <article className={`adm-prod${product.active ? "" : " off"}`}>
      <div className="adm-prod-h">
        <div className="vpa-g1">
          <b>{product.name}</b>
          <span>{product.tagline}</span>
        </div>
        <span className={`vpa-tag ${product.active ? (product.status === "TRIAL" ? "y" : "g") : ""}`}>
          <i />
          {product.active ? (product.status === "TRIAL" ? "En prueba" : "Activo") : "Sin contratar"}
        </span>
      </div>
      {product.active ? (
        <div className="adm-prod-facts">
          <div>
            <small>Plan</small>
            <b>{plan ? plan.name : product.plans.length ? "Sin plan" : "Único"}</b>
          </div>
          <div>
            <small>Precio</small>
            <b>{plan?.price ?? "—"}</b>
          </div>
          <div>
            <small>Características</small>
            <b>{off ? `${product.features.length - off} de ${product.features.length}` : "Todas"}</b>
          </div>
        </div>
      ) : null}
      <button type="button" className={`vpa-btn sm ${product.active ? "line" : "acc"}`} onClick={() => setOpen(true)}>
        {product.active ? "Ajustar" : "Activar"}
      </button>
      {open ? <ProductAdjustDialog tenantId={tenantId} product={product} onClose={() => setOpen(false)} /> : null}
    </article>
  );
}

function ProductAdjustDialog({ tenantId, product, onClose }: { tenantId: string; product: ProductCardData; onClose: () => void }) {
  const { pending, result, run } = useRun();
  const [planId, setPlanId] = useState(product.planId ?? product.plans[0]?.id ?? null);
  const [trialDays, setTrialDays] = useState(0);
  const [enabled, setEnabled] = useState(() => new Set(product.features.filter((feature) => feature.enabled).map((feature) => feature.key)));
  const toggle = (key: string) =>
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = (turnOn: boolean) =>
    run(
      () =>
        saveClientProductAction({
          tenantId,
          moduleId: product.moduleId,
          active: turnOn,
          submoduleId: planId,
          enabledFeatures: [...enabled],
          trialDays: turnOn && !product.active ? trialDays : null,
        }),
      onClose,
    );

  return (
    <AdminModal
      title={product.name}
      subtitle={product.active ? "Cambiá el plan o qué puede usar este cliente." : "Activalo para este cliente."}
      onClose={onClose}
      footer={
        <>
          {product.active ? (
            <button type="button" className="vpa-btn line danger" disabled={pending} onClick={() => save(false)}>
              Apagar producto
            </button>
          ) : null}
          <span style={{ flex: 1 }} />
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vpa-btn acc" disabled={pending} onClick={() => save(true)}>
            {pending ? "Guardando…" : product.active ? "Guardar" : "Activar"}
          </button>
        </>
      }
    >
      {product.plans.length ? (
        <section className="adm-sec">
          <h4>Plan</h4>
          <div className="adm-plans">
            {product.plans.map((plan) => (
              <button key={plan.id} type="button" className={`adm-plan${planId === plan.id ? " on" : ""}`} aria-pressed={planId === plan.id} onClick={() => setPlanId(plan.id)}>
                <b>{plan.name}</b>
                <span>{plan.price ?? "Sin precio"}</span>
                <i aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </i>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!product.active ? (
        <section className="adm-sec">
          <h4>Prueba gratis</h4>
          <div className="vpa-seg">
            {[0, 7, 14, 30].map((days) => (
              <button key={days} type="button" className={trialDays === days ? "on" : undefined} onClick={() => setTrialDays(days)}>
                {days ? `${days} días` : "Sin prueba"}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="adm-sec">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h4>Qué puede usar</h4>
          <span className="vpa-mut" style={{ fontSize: 12 }}>
            {enabled.size} de {product.features.length}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" className="vpa-lnk" onClick={() => setEnabled(new Set(product.features.map((feature) => feature.key)))}>
            Todo
          </button>
        </div>
        <div className="adm-feats">
          {product.features.map((feature) => {
            const on = enabled.has(feature.key) && !feature.globallyOff;
            return (
              <button
                key={feature.key}
                type="button"
                className={`adm-feat${on ? " on" : ""}`}
                aria-pressed={on}
                disabled={feature.globallyOff}
                onClick={() => toggle(feature.key)}
                title={feature.globallyOff ? "Apagada para todos en Productos" : undefined}
              >
                <span className={`vpa-tog${on ? "" : " off"}`} aria-hidden="true" />
                <span className="vpa-g1">
                  <b>{feature.name}</b>
                  <span>{feature.globallyOff ? "Apagada para todos" : feature.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      {result && !result.ok ? <p className="vpa-saveerr">{result.message}</p> : null}
    </AdminModal>
  );
}

/** Botón "Cargar cobro" con su ventana. */
export function ChargeButton({
  tenantId,
  tenantName,
  tenants,
  label = "Cargar cobro",
}: {
  tenantId?: string;
  tenantName?: string;
  tenants?: Array<{ id: string; name: string }>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, result, run, setResult } = useRun();
  const [paid, setPaid] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <button
        type="button"
        className="vpa-btn acc sm"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <Plus size={14} aria-hidden="true" />
        {label}
      </button>
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () =>
                createClientChargeAction({
                  tenantId: tenantId ?? String(form.get("tenantId") ?? ""),
                  concept: String(form.get("concept") ?? ""),
                  amount: Number(String(form.get("amount") ?? "0").replace(",", ".")),
                  category: String(form.get("category") ?? "OTHER"),
                  dueAt: String(form.get("dueAt") ?? ""),
                  paid,
                  method: String(form.get("method") ?? ""),
                }),
              () => setOpen(false),
            );
          }}
        >
          <AdminModal
            title="Cargar un cobro"
            subtitle={tenantName ? `A ${tenantName}` : undefined}
            onClose={() => setOpen(false)}
            footer={
              <>
                <span style={{ flex: 1 }} />
                <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="vpa-btn acc" disabled={pending}>
                  {pending ? "Cargando…" : "Cargar cobro"}
                </button>
              </>
            }
          >
            <div className="vpa-form">
              {!tenantId && tenants ? (
                <label className="vpa-fld vpa-span2">
                  <span>Cliente</span>
                  <select className="vpa-inp" name="tenantId" required defaultValue="">
                    <option value="" disabled>
                      Elegí un cliente
                    </option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="vpa-fld vpa-span2">
                <span>Concepto</span>
                <input className="vpa-inp" name="concept" required placeholder="Ej.: Plan Business de diciembre" autoFocus />
              </label>
              <label className="vpa-fld">
                <span>Monto ($)</span>
                <input className="vpa-inp" name="amount" required inputMode="decimal" placeholder="0" />
              </label>
              <label className="vpa-fld">
                <span>Vence</span>
                <input className="vpa-inp" name="dueAt" type="date" defaultValue={today} />
              </label>
              <label className="vpa-fld vpa-span2">
                <span>Tipo</span>
                <select className="vpa-inp" name="category" defaultValue="OTHER">
                  <option value="OTHER">Plan o servicio</option>
                  <option value="HOSTING">Hosting</option>
                  <option value="MAINTENANCE">Mantenimiento</option>
                  <option value="DEVELOPMENT">Desarrollo a medida</option>
                  <option value="LABS_MONTHLY">Labs mensual</option>
                  <option value="TOKENS">Paquete de tokens</option>
                </select>
              </label>
              <label className="vpa-span2 adm-check">
                <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
                Ya lo pagó (lo cargo como cobrado)
              </label>
              {paid ? (
                <label className="vpa-fld vpa-span2">
                  <span>Cómo pagó</span>
                  <input className="vpa-inp" name="method" placeholder="Transferencia, efectivo…" />
                </label>
              ) : null}
            </div>
            {result && !result.ok ? <p className="vpa-saveerr">{result.message}</p> : null}
          </AdminModal>
        </form>
      ) : null}
      {result?.ok && !open ? (
        <span className="vpa-notice" role="status" style={{ fontSize: 12.5, padding: "6px 12px" }}>
          {result.message}
        </span>
      ) : null}
    </>
  );
}

export type ClientNote = { id: string; body: string; done: boolean; author: string; at: string };

/** Notas del equipo sobre el cliente: cosas que faltan, acuerdos, recordatorios. */
export function ClientNotes({ tenantId, notes }: { tenantId: string; notes: ClientNote[] }) {
  const { pending, result, run } = useRun();
  const [body, setBody] = useState("");
  const pendingNotes = notes.filter((note) => !note.done);
  const doneNotes = notes.filter((note) => note.done);
  const when = (value: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

  const row = (note: ClientNote) => (
    <li key={note.id} className={`adm-note${note.done ? " done" : ""}`}>
      <button type="button" className="adm-note-check" aria-label={note.done ? "Marcar como pendiente" : "Marcar como hecha"} onClick={() => run(() => toggleClientNoteAction(note.id, !note.done))}>
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </button>
      <div className="vpa-g1">
        <p>{note.body}</p>
        <span>
          {note.author} · {when(note.at)}
        </span>
      </div>
      <button type="button" className="vpa-ib" aria-label="Borrar nota" onClick={() => run(() => deleteClientNoteAction(note.id))}>
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <div className="vpa-stack">
      <form
        className="vpa-card stack"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => addClientNoteAction(tenantId, body), () => setBody(""));
        }}
      >
        <textarea
          className="vpa-inp"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Algo que falte, un acuerdo, un recordatorio…"
          style={{ height: "auto", padding: "10px 12px" }}
          aria-label="Nota nueva"
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="vpa-btn acc sm" disabled={pending || body.trim().length < 2}>
            Agregar nota
          </button>
        </div>
        {result && !result.ok ? <p className="vpa-saveerr">{result.message}</p> : null}
      </form>
      {notes.length === 0 ? <div className="vpa-empty">Todavía no hay notas de este cliente.</div> : null}
      {pendingNotes.length ? <ul className="adm-notes">{pendingNotes.map(row)}</ul> : null}
      {doneNotes.length ? (
        <details>
          <summary className="vpa-mut" style={{ cursor: "pointer", fontSize: 12.5 }}>
            {doneNotes.length} {doneNotes.length === 1 ? "hecha" : "hechas"}
          </summary>
          <ul className="adm-notes" style={{ marginTop: 10 }}>
            {doneNotes.map(row)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
