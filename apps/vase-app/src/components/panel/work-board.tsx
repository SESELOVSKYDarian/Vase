"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { ClientCustomQuoteResponseForm } from "@/components/business/client-custom-quote-response-form";
import { CustomProjectMeetingRequestForm } from "@/components/business/custom-project-meeting-request-form";
import { scheduleClientMeetingAction } from "@/app/(platform)/app/owner/customizations/actions";
import { NavLink } from "@/components/layout/nav-link";
import { matchesWorkDate, type WorkDateFilter, type WorkProgress } from "@/lib/business/work-board";

export type WorkMeeting = {
  id: string;
  type: string;
  typeLabel: string;
  status: string;
  isEnabledByAdmin: boolean;
  requestedDate: Date | null;
  confirmedDate: Date | null;
  when: Date | null;
  url: string | null;
};

export type WorkItem = {
  id: string;
  title: string;
  description: string;
  product: string;
  kind: string;
  createdAt: Date;
  createdLabel: string;
  progress: WorkProgress;
  awaitingOwner: boolean;
  detail: string;
  meetings: WorkMeeting[];
  quote: {
    id: string;
    number: string;
    total: string;
    summary: string;
    validUntil: string;
    pendingClient: boolean;
    lines: Array<{ id: string; label: string; description: string | null; total: string }>;
  } | null;
};

export type BoardMeeting = {
  id: string;
  kind: "v2" | "booking" | "request";
  title: string;
  when: string;
  dayLabel: string;
  duration: string | null;
  month: string;
  day: string;
  url: string | null;
  atMs: number;
};

export type BoardSlot = { id: string; day: string; time: string };

type FilterKey = "product" | "kind" | "date";

function ScheduleDialog({
  slots,
  replace,
  onClose,
}: {
  slots: BoardSlot[];
  replace: BoardMeeting | null;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await scheduleClientMeetingAction({
        topic,
        slotId,
        replace: replace && replace.kind !== "request" ? { kind: replace.kind, id: replace.id } : null,
      });
      if (result.ok) {
        onClose();
        return;
      }
      setError(result.message ?? "No pudimos agendar la reunión.");
    });
  };

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label={replace ? "Cambiar horario" : "Agendar reunión"} style={{ width: 560 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>{replace ? "Cambiar horario" : "Agendar reunión"}</h3>
            <p>{replace ? replace.title : "Elegí un horario con el equipo de Vase."}</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {replace ? null : (
          <label className="vpa-fld">
            <span>¿De qué querés hablar?</span>
            <input
              className="vpa-inp"
              value={topic}
              maxLength={160}
              placeholder="Por ejemplo: sumar una función a mi tienda"
              onChange={(event) => setTopic(event.target.value)}
            />
          </label>
        )}
        {slots.length === 0 ? (
          <div className="vpa-hrow">
            <div className="vpa-g1">
              <b>Por ahora no hay horarios disponibles</b>
              <span>Escribinos desde Ayuda y soporte y coordinamos.</span>
            </div>
          </div>
        ) : (
          <div className="vpa-slots" role="radiogroup" aria-label="Horarios">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                role="radio"
                aria-checked={slotId === slot.id}
                className={slotId === slot.id ? "vpa-choice on" : "vpa-choice"}
                onClick={() => setSlotId(slot.id)}
              >
                <b>{slot.day}</b>
                <span>{slot.time}</span>
              </button>
            ))}
          </div>
        )}
        {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
        <div className="row">
          <button type="button" className="vpa-btn soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="vpa-btn acc" disabled={isPending || !slotId} onClick={confirm}>
            {isPending ? "Agendando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const DATE_OPTIONS: Array<{ id: WorkDateFilter; label: string }> = [
  { id: "todas", label: "Cualquiera" },
  { id: "mes", label: "Este mes" },
  { id: "tres", label: "Últimos 3 meses" },
  { id: "anio", label: "Este año" },
];

const ALL = "todos";

function FilterMenu({
  label,
  value,
  active,
  open,
  options,
  onToggle,
  onPick,
}: {
  label: string;
  value: string;
  active: boolean;
  open: boolean;
  options: Array<{ id: string; label: string }>;
  onToggle: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div className="vpa-fwrap">
      <button type="button" className={active ? "vpa-fbtn on" : "vpa-fbtn"} aria-haspopup="listbox" aria-expanded={open} onClick={onToggle}>
        {label}: <b>{value}</b> <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="vpa-fmenu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.label === value}
              className={option.label === value ? "vpa-fopt on" : "vpa-fopt"}
              onClick={() => onPick(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function WorkBoard({
  items,
  nowMs,
  upcomingMeetings,
  pastMeetings,
  slots,
  newRequestHref,
}: {
  items: WorkItem[];
  nowMs: number;
  upcomingMeetings: BoardMeeting[];
  pastMeetings: BoardMeeting[];
  slots: BoardSlot[];
  newRequestHref: string | null;
}) {
  const [tab, setTab] = useState<"trabajos" | "reuniones">("trabajos");
  const [menu, setMenu] = useState<FilterKey | null>(null);
  const [product, setProduct] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [date, setDate] = useState<WorkDateFilter>("todas");
  const [openId, setOpenId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<{ replace: BoardMeeting | null } | null>(null);

  const products = useMemo(() => Array.from(new Set(items.map((item) => item.product))), [items]);
  const kinds = useMemo(() => Array.from(new Set(items.map((item) => item.kind))), [items]);
  const inScope = items.filter((item) => product === ALL || item.product === product);
  const jobs = inScope.filter(
    (item) => (kind === ALL || item.kind === kind) && matchesWorkDate(new Date(item.createdAt), date, new Date(nowMs)),
  );

  const visiblePast = pastMeetings.filter((meeting) => matchesWorkDate(new Date(meeting.atMs), date, new Date(nowMs)));

  const dirty = product !== ALL || date !== "todas" || (tab === "trabajos" && kind !== ALL);
  const open = items.find((item) => item.id === openId) ?? null;
  const toggle = (key: FilterKey) => setMenu(menu === key ? null : key);

  return (
    <>
      <div className="vpa-sech" style={{ marginBottom: 0 }}>
        <div className="vpa-seg" role="tablist" aria-label="Ver">
          {(["trabajos", "reuniones"] as const).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {id === "trabajos" ? "Trabajos a medida" : "Reuniones"}
            </button>
          ))}
        </div>
        {tab === "trabajos" && newRequestHref ? (
          <NavLink href={newRequestHref} className="vpa-btn acc">
            Pedir algo nuevo
          </NavLink>
        ) : null}
        {tab === "reuniones" ? (
          <button type="button" className="vpa-btn acc" onClick={() => setScheduling({ replace: null })}>
            Agendar reunión
          </button>
        ) : null}
      </div>

      <div className="vpa-fbar" aria-label="Filtros">
        {products.length > 1 ? (
          <FilterMenu
            label="Producto"
            value={product === ALL ? "Todos" : product}
            active={product !== ALL}
            open={menu === "product"}
            options={[{ id: ALL, label: "Todos" }, ...products.map((id) => ({ id, label: id }))]}
            onToggle={() => toggle("product")}
            onPick={(id) => {
              setProduct(id);
              setMenu(null);
            }}
          />
        ) : null}
        {tab === "trabajos" ? (
          <FilterMenu
            label="Funcionalidad"
            value={kind === ALL ? "Todas" : kind}
            active={kind !== ALL}
            open={menu === "kind"}
            options={[{ id: ALL, label: "Todas" }, ...kinds.map((id) => ({ id, label: id }))]}
            onToggle={() => toggle("kind")}
            onPick={(id) => {
              setKind(id);
              setMenu(null);
            }}
          />
        ) : null}
        <FilterMenu
          label="Fecha"
          value={DATE_OPTIONS.find((option) => option.id === date)?.label ?? "Cualquiera"}
          active={date !== "todas"}
          open={menu === "date"}
          options={DATE_OPTIONS}
          onToggle={() => toggle("date")}
          onPick={(id) => {
            setDate(id as WorkDateFilter);
            setMenu(null);
          }}
        />
        {dirty ? (
          <button
            type="button"
            className="vpa-lnk"
            onClick={() => {
              setProduct(ALL);
              setKind(ALL);
              setDate("todas");
            }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {tab === "trabajos" ? (
        <>
          {items.length === 0 ? <div className="vpa-empty">Todavía no le pediste nada a Vase.</div> : null}
          {items.length > 0 && jobs.length === 0 ? <div className="vpa-empty">No hay trabajos con esos filtros.</div> : null}
          {jobs.map((item) => (
            <article className="vpa-job" key={item.id}>
              <div className="vpa-sech" style={{ marginBottom: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <h3>{item.title}</h3>
                  <div className="vpa-meta">
                    {item.product} · {item.kind} · Pedido el {item.createdLabel}
                  </div>
                </div>
                <span className={`vpa-tag ${item.progress.tone}`}>
                  <i />
                  {item.progress.state}
                </span>
              </div>
              <div>
                <div className="vpa-prog" aria-hidden="true">
                  {item.progress.segments.map((segment, index) => (
                    <i key={index} className={segment === "done" ? "d" : segment === "now" ? "n" : ""} />
                  ))}
                </div>
                <div className="vpa-stepl">{item.progress.stepLabel}</div>
              </div>
              <div className="vpa-nextb">
                <div className="vpa-g1">
                  <b>{item.progress.next}</b>
                  {item.detail ? <span>{item.detail}</span> : null}
                </div>
                <button type="button" className={item.progress.isClientTurn ? "vpa-btn acc sm" : "vpa-btn soft sm"} onClick={() => setOpenId(item.id)}>
                  Ver detalle
                </button>
              </div>
            </article>
          ))}
        </>
      ) : (
        <>
          {upcomingMeetings.length === 0 ? <div className="vpa-empty">No tenés reuniones próximas.</div> : null}
          {upcomingMeetings.map((meeting, index) => (
            <article className="vpa-job" key={`${meeting.kind}:${meeting.id}`}>
              <div className="vpa-lab" style={{ marginBottom: 0 }}>
                {index === 0 ? "Próxima reunión" : "Después"}
              </div>
              <div className="vpa-meet">
                <div className="vpa-cal" aria-hidden="true">
                  <small>{meeting.month}</small>
                  <b>{meeting.day}</b>
                </div>
                <div className="vpa-g1">
                  <b style={{ fontSize: 18, fontWeight: 800 }}>{meeting.when}</b>
                  <span style={{ fontSize: 13 }}>
                    {meeting.title}
                    {meeting.duration ? ` · ${meeting.duration}` : ""}
                  </span>
                </div>
                {meeting.url ? (
                  <a className="vpa-btn acc" href={meeting.url} target="_blank" rel="noreferrer">
                    Unirme
                  </a>
                ) : null}
                {meeting.kind !== "request" ? (
                  <button type="button" className="vpa-btn line" onClick={() => setScheduling({ replace: meeting })}>
                    Cambiar horario
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          <section className="vpa-card" aria-label="Reuniones anteriores">
            <h3>Anteriores</h3>
            {visiblePast.length === 0 ? <p>No hay reuniones anteriores.</p> : null}
            <div style={{ marginTop: 8 }}>
              {visiblePast.map((meeting) => (
                <div className="vpa-todo" key={`${meeting.kind}:${meeting.id}`}>
                  <div className="vpa-g1">
                    <b>{meeting.title}</b>
                    <span>
                      {meeting.dayLabel}
                      {meeting.duration ? ` · ${meeting.duration}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {menu ? <div className="vpa-menuscrim" onClick={() => setMenu(null)} /> : null}
      {scheduling ? <ScheduleDialog slots={slots} replace={scheduling.replace} onClose={() => setScheduling(null)} /> : null}

      {open ? (
        <div className="vpa-ov" onClick={() => setOpenId(null)}>
          <aside className="vpa-dr" aria-label={`Detalle de ${open.title}`} onClick={(event) => event.stopPropagation()} style={{ width: 620 }}>
            <div className="vpa-mh">
              <div>
                <h3>{open.title}</h3>
                <p>{open.description}</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpenId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="vpa-drb">
              {open.quote ? (
                <section>
                  <div className="vpa-lab">
                    Presupuesto {open.quote.number} · Válido hasta {open.quote.validUntil}
                  </div>
                  <div className="vpa-huge" style={{ fontSize: 34 }}>{open.quote.total}</div>
                  <p className="vpa-mut" style={{ marginTop: 8, lineHeight: 1.5 }}>{open.quote.summary}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                    {open.quote.lines.map((line) => (
                      <div className="vpa-hrow" key={line.id}>
                        <div className="vpa-g1">
                          <b>{line.label}</b>
                          {line.description ? <span>{line.description}</span> : null}
                        </div>
                        <strong style={{ fontWeight: 800 }}>{line.total}</strong>
                      </div>
                    ))}
                  </div>
                  {open.quote.pendingClient ? (
                    <div style={{ marginTop: 16 }}>
                      <ClientCustomQuoteResponseForm quoteId={open.quote.id} />
                    </div>
                  ) : null}
                </section>
              ) : (
                <div className="vpa-hrow">
                  <div className="vpa-g1">
                    <b>{open.awaitingOwner ? "El presupuesto lo aprueba el Dueño" : "Sin presupuesto para mostrar"}</b>
                    <span>{open.awaitingOwner ? "Los importes solo los ve el Dueño de la cuenta." : "Cuando esté disponible, aparece acá."}</span>
                  </div>
                </div>
              )}
              <section>
                <div className="vpa-lab">Reuniones</div>
                <CustomProjectMeetingRequestForm requestId={open.id} meetings={open.meetings} />
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
