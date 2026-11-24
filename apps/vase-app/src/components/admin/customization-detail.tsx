"use client";

import { type FormEvent, type ReactNode, useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Pencil, Send, Undo2, Upload } from "lucide-react";
import {
  createMeetingAvailabilitySlotAction,
  enableCustomProjectMeetingAction,
  reviewCustomizationRequestAction,
  rollbackCustomProjectDeploymentAction,
  sendCustomizationQuoteAction,
  setCustomProjectMeetingLinkAction,
  updateCustomProjectMilestoneAction,
  upsertCustomizationQuoteAction,
  type AdminGovernanceActionState,
} from "@/app/(platform)/app/admin/actions";
import { AdminModal } from "@/components/admin/client-ficha";
import { getQuoteTemplateLabel, quoteTemplateKeys } from "@/lib/business/custom-quotes";
import { REQUEST_STATUS } from "@/lib/admin/customization-status";

type ActionState = { error?: string; success?: string };

/** Aviso corto debajo de un formulario: verde si salió, rojo si no. */
function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="adm-msg err" role="alert">{state.error}</p>;
  if (state.success) return <p className="adm-msg ok" role="status">{state.success}</p>;
  return null;
}

/** Refresca la pantalla cuando una acción sale bien. */
function useRefreshOn(...flags: Array<string | undefined>) {
  const router = useRouter();
  const key = flags.join("|");
  useEffect(() => {
    if (flags.some(Boolean)) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, router]);
}

/** Opciones en pastillas (una sola elegida). Manda el valor con `name`. */
function Choice({ name, options, value, onChange }: { name: string; options: Array<{ id: string; label: string; hint?: string }>; value: string; onChange: (id: string) => void }) {
  return (
    <div className="adm-choice" role="radiogroup">
      <input type="hidden" name={name} value={value} />
      {options.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={value === option.id} className={value === option.id ? "on" : undefined} onClick={() => onChange(option.id)}>
          <b>{option.label}</b>
          {option.hint ? <span>{option.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`vpa-fld${wide ? " vpa-span2" : ""}`}>
      <span>{label}</span>
      {children}
      {hint ? <small className="adm-hint">{hint}</small> : null}
    </label>
  );
}

/* ---------------- Estado del pedido ---------------- */


export function RequestStatusForm({ requestId, status, priceLabel, notes }: { requestId: string; status: string; priceLabel: string | null; notes: string | null }) {
  const [state, action, pending] = useActionState(reviewCustomizationRequestAction, {});
  const [value, setValue] = useState(status === "SUBMITTED" ? "REVIEWING" : status);
  useRefreshOn(state.success);
  const options = ["REVIEWING", "QUOTED", "IN_PROGRESS", "DELIVERED"].map((id) => ({ id, label: REQUEST_STATUS[id].label, hint: REQUEST_STATUS[id].hint }));
  return (
    <form action={action} className="vpa-card adm-panel">
      <header>
        <h3>¿En qué está?</h3>
        <p>El cliente ve este estado en su panel.</p>
      </header>
      <input type="hidden" name="requestId" value={requestId} />
      <Choice name="status" options={options} value={value} onChange={setValue} />
      <div className="vpa-form">
        <Field label="Precio que ve el cliente (opcional)" hint="Texto corto, por ejemplo «Desde USD 1.500».">
          <input className="vpa-inp" name="quotedPriceLabel" defaultValue={priceLabel ?? ""} maxLength={80} placeholder="Desde USD 1.500" />
        </Field>
        <Field label="Nota interna (opcional)" hint="Solo la ve el equipo.">
          <input className="vpa-inp" name="reviewNotes" defaultValue={notes ?? ""} maxLength={400} />
        </Field>
      </div>
      <footer>
        <Feedback state={state} />
        <button type="submit" className="vpa-btn acc" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </footer>
    </form>
  );
}

/* ---------------- Presupuesto ---------------- */

type Quote = {
  id: string;
  quoteNumber: string;
  templateKey: string;
  status: string;
  currency: string;
  estimatedDeliveryDays: number;
  validUntil: Date | null;
  clientSummary: string;
  internalSummary: string | null;
  observations: string | null;
  lineItems: Array<{ lineType: string; totalAmountCents: number }>;
};

const PRICE_LINES = [
  { name: "baseTemplateAmountUnits", type: "BASE_TEMPLATE", label: "Sitio base", min: 1, fallback: 1500 },
  { name: "featureExtraAmountUnits", type: "FEATURE", label: "Funciones extra", min: 0, fallback: 0 },
  { name: "designExtraAmountUnits", type: "DESIGN", label: "Diseño extra", min: 0, fallback: 0 },
  { name: "integrationExtraAmountUnits", type: "INTEGRATION", label: "Integraciones", min: 0, fallback: 0 },
  { name: "serviceExtraAmountUnits", type: "SERVICE", label: "Puesta en marcha", min: 0, fallback: 0 },
] as const;

function dateInput(value: Date | null | undefined, plusDays = 30) {
  const date = value ? new Date(value) : new Date(Date.now() + plusDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function money(units: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(units);
}

export function QuoteEditor({ requestId, quote, startOpen }: { requestId: string; quote: Quote | null; startOpen?: boolean }) {
  const [editing, setEditing] = useState(Boolean(startOpen || !quote));
  const [state, action, pending] = useActionState(async (prev: AdminGovernanceActionState, data: FormData) => {
    const result = await upsertCustomizationQuoteAction(prev, data);
    if (result.success) setEditing(false);
    return result;
  }, {} as AdminGovernanceActionState);
  const [sendState, sendAction, sending] = useActionState(sendCustomizationQuoteAction, {} as AdminGovernanceActionState);
  const [currency, setCurrency] = useState(quote?.currency ?? "USD");
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      PRICE_LINES.map((line) => {
        const cents = quote?.lineItems.find((item) => item.lineType === line.type)?.totalAmountCents ?? 0;
        return [line.name, Math.trunc(cents / 100) || line.fallback];
      }),
    ),
  );
  useRefreshOn(state.success, sendState.success);
  const total = Object.values(amounts).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const canSend = quote && (quote.status === "DRAFT" || quote.status === "PENDING_CLIENT");

  if (!editing && quote) {
    return (
      <section className="vpa-card adm-panel adm-solo">
        <header className="row">
          <div>
            <h3>Presupuesto {quote.quoteNumber}</h3>
            <p>
              {getQuoteTemplateLabel(quote.templateKey)} · entrega en {quote.estimatedDeliveryDays} días{quote.validUntil ? ` · vale hasta ${new Date(quote.validUntil).toLocaleDateString("es-AR")}` : ""}
            </p>
          </div>
          <button type="button" className="vpa-btn line" onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden="true" /> Editar
          </button>
        </header>
        <ul className="adm-lines">
          {PRICE_LINES.filter((line) => amounts[line.name] > 0).map((line) => (
            <li key={line.name}>
              <span>{line.label}</span>
              <b>{money(amounts[line.name], quote.currency)}</b>
            </li>
          ))}
          <li className="total">
            <span>Total</span>
            <b>{money(total, quote.currency)}</b>
          </li>
        </ul>
        <div className="adm-quote-text">
          <small>Lo que lee el cliente</small>
          <p>{quote.clientSummary}</p>
          {quote.observations ? <p className="vpa-mut">{quote.observations}</p> : null}
        </div>
        {canSend ? (
          <form action={sendAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <footer>
              <Feedback state={sendState} />
              <button type="submit" className="vpa-btn acc" disabled={sending}>
                <Send size={14} aria-hidden="true" />
                {sending ? "Enviando…" : quote.status === "DRAFT" ? "Enviar al cliente" : "Volver a enviar"}
              </button>
            </footer>
          </form>
        ) : (
          <Feedback state={sendState} />
        )}
        <Feedback state={state} />
      </section>
    );
  }

  return (
    <form action={action} className="vpa-card adm-panel adm-solo" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <header className="row">
        <div>
          <h3>{quote ? `Editar ${quote.quoteNumber}` : "Armar presupuesto"}</h3>
          <p>Tres pasos: tipo de trabajo, precio y lo que lee el cliente.</p>
        </div>
        {quote ? (
          <button type="button" className="vpa-btn soft" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        ) : null}
      </header>

      <div className="adm-step">
        <span className="num">1</span>
        <div className="vpa-form">
          <Field label="Tipo de trabajo">
            <select className="vpa-inp" name="templateKey" defaultValue={quote?.templateKey ?? "STANDARD"}>
              {quoteTemplateKeys.map((key) => (
                <option key={key} value={key}>
                  {getQuoteTemplateLabel(key)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moneda">
            <Choice name="currency" value={currency} onChange={setCurrency} options={[{ id: "USD", label: "Dólares" }, { id: "ARS", label: "Pesos" }]} />
          </Field>
          <Field label="Días hasta entregar">
            <input className="vpa-inp" name="estimatedDeliveryDays" type="number" min={3} max={365} required defaultValue={quote?.estimatedDeliveryDays ?? 21} />
          </Field>
          <Field label="Vale hasta">
            <input className="vpa-inp" name="validUntil" type="date" required defaultValue={dateInput(quote?.validUntil)} />
          </Field>
        </div>
      </div>

      <div className="adm-step">
        <span className="num">2</span>
        <div className="adm-sec" style={{ flex: 1 }}>
          <ul className="adm-lines edit">
            {PRICE_LINES.map((line) => (
              <li key={line.name}>
                <label htmlFor={line.name}>{line.label}</label>
                <input
                  id={line.name}
                  className="vpa-inp"
                  name={line.name}
                  type="number"
                  min={line.min}
                  required
                  inputMode="numeric"
                  value={Number.isFinite(amounts[line.name]) ? amounts[line.name] : ""}
                  onChange={(event) => setAmounts((prev) => ({ ...prev, [line.name]: event.target.valueAsNumber }))}
                />
              </li>
            ))}
            <li className="total">
              <span>Total</span>
              <b>{money(total, currency)}</b>
            </li>
          </ul>
        </div>
      </div>

      <div className="adm-step">
        <span className="num">3</span>
        <div className="vpa-form">
          <Field label="Qué incluye (lo lee el cliente)" hint="Mínimo 20 caracteres." wide>
            <textarea
              className="vpa-inp adm-area"
              name="clientSummary"
              rows={4}
              required
              minLength={20}
              maxLength={600}
              defaultValue={quote?.clientSummary ?? "Diseño y armado del sitio a medida, con acompañamiento del equipo de Vase hasta la entrega."}
            />
          </Field>
          <Field label="Condiciones (opcional)" hint="Qué no incluye, qué necesitamos del cliente." wide>
            <textarea className="vpa-inp adm-area" name="observations" rows={2} defaultValue={quote?.observations ?? ""} />
          </Field>
          <Field label="Nota interna (opcional)" hint="Solo la ve el equipo." wide>
            <textarea className="vpa-inp adm-area" name="internalSummary" rows={2} defaultValue={quote?.internalSummary ?? ""} />
          </Field>
        </div>
      </div>

      <footer>
        <Feedback state={state} />
        <button type="submit" className="vpa-btn acc" disabled={pending}>
          <Check size={14} aria-hidden="true" />
          {pending ? "Guardando…" : "Guardar presupuesto"}
        </button>
      </footer>
    </form>
  );
}

/* ---------------- Avance ---------------- */

export const STAGES = [
  { id: "DEFINITION", label: "Definición" },
  { id: "DESIGN", label: "Diseño" },
  { id: "DELIVERY", label: "Entrega" },
  { id: "FOLLOW_UP", label: "Seguimiento" },
];

export function ProgressForm({ requestId, tenantId, milestones }: { requestId: string; tenantId: string; milestones: Array<{ stage: string; progressPercent: number; notes: string | null }> }) {
  const [state, action, pending] = useActionState(updateCustomProjectMilestoneAction, {});
  const current = [...milestones].reverse().find((row) => row.progressPercent > 0) ?? milestones[0];
  const [stage, setStage] = useState(current?.stage ?? "DEFINITION");
  const row = milestones.find((item) => item.stage === stage);
  const [percent, setPercent] = useState(row?.progressPercent ?? 0);
  useRefreshOn(state.success);

  return (
    <div className="adm-split">
      <section className="vpa-card adm-panel">
        <header>
          <h3>Cómo va</h3>
          <p>Lo mismo que ve el cliente en su panel.</p>
        </header>
        <ul className="adm-progress">
          {STAGES.map((item) => {
            const value = milestones.find((m) => m.stage === item.id)?.progressPercent ?? 0;
            return (
              <li key={item.id} className={value >= 100 ? "done" : value > 0 ? "on" : undefined}>
                <div>
                  <b>{item.label}</b>
                  <span>{value}%</span>
                </div>
                <i style={{ ["--p" as string]: `${value}%` }} />
              </li>
            );
          })}
        </ul>
      </section>
      <form action={action} className="vpa-card adm-panel">
        <header>
          <h3>Actualizar avance</h3>
          <p>Elegí la etapa y mové la barra.</p>
        </header>
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <Choice
          name="stage"
          value={stage}
          onChange={(id) => {
            setStage(id);
            setPercent(milestones.find((item) => item.stage === id)?.progressPercent ?? 0);
          }}
          options={STAGES}
        />
        <div className="adm-range">
          <input type="range" name="progressPercent" min={0} max={100} step={5} value={percent} onChange={(event) => setPercent(event.target.valueAsNumber)} aria-label="Avance" />
          <b>{percent}%</b>
        </div>
        <Field label="Mensaje para el cliente (opcional)">
          <input key={stage} className="vpa-inp" name="notes" defaultValue={row?.notes ?? ""} placeholder="Ej.: ya está el diseño de la portada" />
        </Field>
        <footer>
          <Feedback state={state} />
          <button type="submit" className="vpa-btn acc" disabled={pending}>
            {pending ? "Guardando…" : "Guardar avance"}
          </button>
        </footer>
      </form>
    </div>
  );
}

/* ---------------- Reuniones ---------------- */

export const MEETINGS = [
  { id: "DEFINITION", label: "Definición", hint: "Arrancar y entender qué quiere" },
  { id: "DESIGN", label: "Diseño", hint: "Mostrar la propuesta visual" },
  { id: "MID_DEVELOPMENT", label: "Mitad de camino", hint: "Revisar cómo va" },
  { id: "FINAL_DELIVERY", label: "Entrega", hint: "Mostrar el sitio terminado" },
  { id: "FOLLOW_UP", label: "Seguimiento", hint: "Ver dudas después de entregar" },
];

const MEETING_STATUS: Record<string, { label: string; tone: string }> = {
  LOCKED: { label: "Sin habilitar", tone: "" },
  ENABLED: { label: "El cliente puede pedirla", tone: "b" },
  REQUESTED: { label: "La pidió", tone: "y" },
  CONFIRMED: { label: "Confirmada", tone: "g" },
  COMPLETED: { label: "Hecha", tone: "g" },
  CANCELED: { label: "Cancelada", tone: "r" },
};

function MeetingRow({ requestId, tenantId, meeting, current }: { requestId: string; tenantId: string; meeting: (typeof MEETINGS)[number]; current?: { status: string; meetingUrl: string | null; isEnabledByAdmin: boolean } }) {
  const [enableState, enable, enabling] = useActionState(enableCustomProjectMeetingAction, {});
  const [editLink, setEditLink] = useState(false);
  const [linkState, saveLink, savingLink] = useActionState(async (prev: ActionState, data: FormData) => {
    const result = await setCustomProjectMeetingLinkAction(prev, data);
    if (result.success) setEditLink(false);
    return result;
  }, {});
  useRefreshOn(enableState.success, linkState.success);
  const status = current?.status ?? "LOCKED";
  const locked = !current || (status === "LOCKED" && !current.isEnabledByAdmin);
  const tag = MEETING_STATUS[locked ? "LOCKED" : status] ?? MEETING_STATUS.LOCKED;

  return (
    <li className="adm-meet">
      <div className="vpa-g1">
        <b>{meeting.label}</b>
        <span>{meeting.hint}</span>
      </div>
      <span className={`vpa-tag ${tag.tone}`}>
        <i />
        {tag.label}
      </span>
      {locked ? (
        <form action={enable}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="meetingType" value={meeting.id} />
          <button type="submit" className="vpa-btn line sm" disabled={enabling}>
            {enabling ? "Habilitando…" : "Habilitar"}
          </button>
        </form>
      ) : editLink ? (
        <form action={saveLink} className="adm-inline">
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="meetingType" value={meeting.id} />
          <input className="vpa-inp" name="meetingUrl" type="url" defaultValue={current?.meetingUrl ?? ""} placeholder="https://meet.google.com/…" autoFocus />
          <button type="submit" className="vpa-btn acc sm" disabled={savingLink}>
            {savingLink ? "…" : "Guardar"}
          </button>
          <button type="button" className="vpa-btn soft sm" onClick={() => setEditLink(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button type="button" className="vpa-btn line sm" onClick={() => setEditLink(true)}>
          {current?.meetingUrl ? "Cambiar link" : "Poner link"}
        </button>
      )}
      {current?.meetingUrl && !editLink ? (
        <a className="adm-link" href={current.meetingUrl} target="_blank" rel="noreferrer">
          {current.meetingUrl}
        </a>
      ) : null}
      <div className="adm-meet-msg">
        <Feedback state={enableState} />
        <Feedback state={linkState} />
      </div>
    </li>
  );
}

export function MeetingsPanel({
  requestId,
  tenantId,
  meetings,
  slots,
}: {
  requestId: string;
  tenantId: string;
  meetings: Array<{ type: string; status: string; meetingUrl: string | null; isEnabledByAdmin: boolean }>;
  slots: Array<{ id: string; startsAt: Date; endsAt: Date; capacity: number; reservedCount: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [slotState, slotAction, slotPending] = useActionState(async (prev: ActionState, data: FormData) => {
    const result = await createMeetingAvailabilitySlotAction(prev, data);
    if (result.success) setOpen(false);
    return result;
  }, {});
  useRefreshOn(slotState.success);
  const fmt = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const hour = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="adm-split">
      <section className="vpa-card adm-panel">
        <header>
          <h3>Reuniones</h3>
          <p>Habilitá la que toca; el cliente la pide desde su panel.</p>
        </header>
        <ul className="adm-meets">
          {MEETINGS.map((meeting) => (
            <MeetingRow key={meeting.id} requestId={requestId} tenantId={tenantId} meeting={meeting} current={meetings.find((row) => row.type === meeting.id)} />
          ))}
        </ul>
      </section>
      <section className="vpa-card adm-panel">
        <header className="row">
          <div>
            <h3>Horarios libres</h3>
            <p>El cliente elige uno de estos.</p>
          </div>
          <button type="button" className="vpa-btn acc sm" onClick={() => setOpen(true)}>
            <CalendarPlus size={14} aria-hidden="true" /> Agregar
          </button>
        </header>
        {slots.length ? (
          <ul className="adm-lines">
            {slots.map((slot) => (
              <li key={slot.id}>
                <span>
                  {fmt.format(new Date(slot.startsAt))} a {hour.format(new Date(slot.endsAt))}
                </span>
                <b className="vpa-mut">
                  {slot.reservedCount}/{slot.capacity} tomados
                </b>
              </li>
            ))}
          </ul>
        ) : (
          <div className="vpa-empty" style={{ padding: "20px 10px", fontSize: 12.5 }}>
            No cargaste horarios para este cliente.
          </div>
        )}
      </section>
      {open ? (
        <form action={slotAction}>
          <AdminModal
            title="Agregar horario libre"
            subtitle="El cliente va a poder reservarlo para una reunión."
            onClose={() => setOpen(false)}
            footer={
              <>
                <Feedback state={slotState} />
                <span style={{ flex: 1 }} />
                <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="vpa-btn acc" disabled={slotPending}>
                  {slotPending ? "Guardando…" : "Guardar horario"}
                </button>
              </>
            }
          >
            <input type="hidden" name="tenantId" value={tenantId} />
            <div className="vpa-form">
              <Field label="Desde">
                <input className="vpa-inp" name="startsAt" type="datetime-local" required />
              </Field>
              <Field label="Hasta">
                <input className="vpa-inp" name="endsAt" type="datetime-local" required />
              </Field>
              <Field label="Cuánto dura cada reunión (min)">
                <input className="vpa-inp" name="durationMinutes" type="number" min={15} step={15} defaultValue={60} />
              </Field>
              <Field label="Cuántas reuniones entran">
                <input className="vpa-inp" name="capacity" type="number" min={1} defaultValue={1} />
              </Field>
              <Field label="Nota (opcional)" wide>
                <input className="vpa-inp" name="notes" />
              </Field>
            </div>
          </AdminModal>
        </form>
      ) : null}
    </div>
  );
}

/* ---------------- Publicar ---------------- */

function elapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function PublishPanel({ requestId, tenantId, pageScope, published }: { requestId: string; tenantId: string; pageScope: string; published: { name: string; slug: string } | null }) {
  const router = useRouter();
  const [source, setSource] = useState<"template" | "zip" | "github">("template");
  const [state, setState] = useState<AdminGovernanceActionState>({});
  const [pending, setPending] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [upload, setUpload] = useState<number | null>(null);
  const [rollbackState, rollback, rollingBack] = useActionState(rollbackCustomProjectDeploymentAction, {});
  const [, startTransition] = useTransition();
  useRefreshOn(rollbackState.success);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (source !== "zip") data.delete("projectZip");
    if (source !== "github") data.delete("repositoryUrl");
    const zip = data.get("projectZip");
    const hasZip = zip instanceof File && zip.size > 0;
    if (source === "zip" && !hasZip) return setState({ error: "Elegí el archivo .zip del sitio." });
    if (source === "github" && !String(data.get("repositoryUrl") ?? "").trim()) return setState({ error: "Pegá el link del repositorio." });

    setState({});
    setPending(true);
    setStartedAt(Date.now());
    setNow(Date.now());
    setUpload(hasZip ? 0 : null);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/customizations/provision");
    xhr.responseType = "json";
    xhr.upload.onprogress = (progress) => {
      if (hasZip && progress.lengthComputable) setUpload(Math.min(100, Math.round((progress.loaded / progress.total) * 100)));
    };
    xhr.onload = () => {
      const response = xhr.response && typeof xhr.response === "object" ? (xhr.response as AdminGovernanceActionState) : { error: "No pudimos leer la respuesta del servidor." };
      setState(response);
      if (xhr.status >= 200 && xhr.status < 300 && response.success) startTransition(() => router.refresh());
    };
    xhr.onerror = () => setState({ error: "Se cortó la subida. Revisá la conexión y probá de nuevo." });
    xhr.onloadend = () => setPending(false);
    xhr.send(data);
  }

  return (
    <div className="adm-split">
      <form onSubmit={submit} encType="multipart/form-data" className="vpa-card adm-panel">
        <header>
          <h3>Publicar el sitio</h3>
          <p>Crea la página en el editor y la deja online en vase.ar.</p>
        </header>
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <Field label="Nombre de la página">
          <input className="vpa-inp" name="pageName" required defaultValue={pageScope || "Sitio personalizado"} />
        </Field>
        <div className="vpa-fld">
          <span>De dónde sale el sitio</span>
          <Choice
            name="source"
            value={source}
            onChange={(id) => setSource(id as typeof source)}
            options={[
              { id: "template", label: "Plantilla Vase", hint: "Arranca vacío" },
              { id: "zip", label: "Archivo .zip", hint: "Con index.html" },
              { id: "github", label: "GitHub", hint: "Repo público" },
            ]}
          />
        </div>
        {source === "zip" ? (
          <Field label="Archivo .zip ya compilado">
            <input className="vpa-inp adm-file" name="projectZip" type="file" accept=".zip,application/zip" />
          </Field>
        ) : null}
        {source === "github" ? (
          <Field label="Link del repositorio">
            <input className="vpa-inp" name="repositoryUrl" type="url" placeholder="https://github.com/usuario/proyecto" />
          </Field>
        ) : null}
        <Field label="Nota técnica (opcional)">
          <input className="vpa-inp" name="deployNotes" />
        </Field>
        {pending ? (
          <div className="adm-upload" aria-live="polite">
            <span>
              {upload !== null && upload < 100 ? `Subiendo ${upload}%` : "Preparando el sitio"} · {elapsed(now - startedAt)}
            </span>
            <i style={{ ["--p" as string]: `${upload ?? 100}%` }} className={upload === null || upload >= 100 ? "busy" : undefined} />
          </div>
        ) : null}
        <footer>
          <Feedback state={state} />
          {state.publicUrl && !pending ? (
            <a className="adm-link" href={state.publicUrl} target="_blank" rel="noreferrer">
              {state.publicUrl}
            </a>
          ) : null}
          <button type="submit" className="vpa-btn acc" disabled={pending}>
            <Upload size={14} aria-hidden="true" />
            {pending ? "Publicando…" : "Publicar"}
          </button>
        </footer>
      </form>
      <section className="vpa-card adm-panel">
        <header>
          <h3>Lo que está online</h3>
          <p>{published ? `${published.name} · /${published.slug}` : "Todavía no se publicó nada."}</p>
        </header>
        {published ? (
          <form
            action={rollback}
            onSubmit={(event) => {
              if (!window.confirm("¿Volver a la versión anterior del sitio? Lo de ahora deja de verse.")) event.preventDefault();
            }}
          >
            <input type="hidden" name="requestId" value={requestId} />
            <input type="hidden" name="tenantId" value={tenantId} />
            <p className="vpa-mut" style={{ margin: "0 0 12px", fontSize: 12.5 }}>
              Si algo salió mal, podés volver a la versión que estaba antes.
            </p>
            <footer>
              <Feedback state={rollbackState} />
              <button type="submit" className="vpa-btn line" disabled={rollingBack}>
                <Undo2 size={14} aria-hidden="true" />
                {rollingBack ? "Volviendo…" : "Volver a la versión anterior"}
              </button>
            </footer>
          </form>
        ) : null}
      </section>
    </div>
  );
}
