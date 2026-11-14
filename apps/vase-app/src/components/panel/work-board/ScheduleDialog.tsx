"use client";

// Parte de work-board.tsx: WorkMeeting, WorkItem, BoardMeeting, BoardSlot, FilterKey, ScheduleDialog y más.
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { scheduleClientMeetingAction } from "@/app/(platform)/app/owner/customizations/actions";
import { type WorkDateFilter, type WorkProgress } from "@/lib/business/work-board";

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

export type FilterKey = "product" | "kind" | "date";

export function ScheduleDialog({
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

export const DATE_OPTIONS: Array<{ id: WorkDateFilter; label: string }> = [
  { id: "todas", label: "Cualquiera" },
  { id: "mes", label: "Este mes" },
  { id: "tres", label: "Últimos 3 meses" },
  { id: "anio", label: "Este año" },
];

export const ALL = "todos";

export function FilterMenu({
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
