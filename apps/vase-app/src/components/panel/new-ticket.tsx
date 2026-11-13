"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createClientSupportTicketAction,
  type ClientSupportActionState,
} from "@/app/(platform)/app/owner/labs/support-actions";

const initialState: ClientSupportActionState = {};

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createClientSupportTicketAction, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Nueva consulta" style={{ width: 560 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>Nueva consulta</h3>
            <p>Contanos qué pasa y te responde alguien del equipo.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="priority" value="NORMAL" />
          <label className="vpa-fld">
            <span>¿Sobre qué es?</span>
            <input className="vpa-inp" name="subject" required minLength={5} maxLength={120} placeholder="Por ejemplo: no puedo entrar a mi tienda" />
          </label>
          <label className="vpa-fld">
            <span>Contanos más</span>
            <textarea className="vpa-inp vpa-area" name="summary" required minLength={10} maxLength={1200} />
          </label>
          {state.error ? <p role="alert" style={{ color: "var(--red)" }}>{state.error}</p> : null}
          <div className="row">
            <button type="button" className="vpa-btn soft" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="vpa-btn acc" disabled={pending}>
              {pending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewTicketButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="vpa-btn acc sm" onClick={() => setOpen(true)}>
        Nueva consulta
      </button>
      {open ? <NewTicketDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
