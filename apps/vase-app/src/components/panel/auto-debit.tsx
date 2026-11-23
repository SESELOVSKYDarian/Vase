"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { changeAutoDebitAction, startAutoDebitAction } from "@/app/(platform)/app/billing/actions";

type State = "none" | "pending" | "authorized" | "paused" | "cancelled";

const COPY: Record<State, { tag: string; cls: string; text: string }> = {
  none: { tag: "Apagado", cls: "", text: "Autorizás tu tarjeta una vez en Mercado Pago y cada mes se paga sola, sin que tengas que entrar." },
  pending: { tag: "Falta autorizar", cls: "y", text: "Terminá de autorizar tu tarjeta en Mercado Pago para que empiece a pagarse solo." },
  authorized: { tag: "Encendido", cls: "g", text: "Cada mes se paga solo lo de tu factura, con la tarjeta que autorizaste en Mercado Pago." },
  paused: { tag: "En pausa", cls: "y", text: "Mientras esté en pausa no se paga solo. Tus facturas las pagás desde Plan y pagos." },
  cancelled: { tag: "Apagado", cls: "", text: "Ya no se paga solo. Lo podés volver a encender cuando quieras." },
};

export function AutoDebit({ status, amountLabel, defaultEmail }: { status: State; amountLabel: string | null; defaultEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = COPY[status];

  const start = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await startAutoDebitAction(email);
      if (result.ok && result.url) {
        window.location.assign(result.url);
        return;
      }
      setMessage({ ok: false, text: result.message ?? "No pudimos abrir Mercado Pago." });
    });

  const change = (next: "paused" | "authorized" | "cancelled") =>
    startTransition(async () => {
      const result = await changeAutoDebitAction(next);
      setMessage({ ok: result.ok, text: result.message ?? (result.ok ? "Listo." : "No pudimos cambiarlo. Probá de nuevo.") });
      if (result.ok) router.refresh();
    });

  const canStart = status === "none" || status === "cancelled" || status === "pending";

  return (
    <section className="vpa-card vpa-autodebit" aria-label="Pago automático">
      <div className="vpa-adh">
        <span className="vpa-adi" aria-hidden="true">
          <RefreshCw size={20} />
        </span>
        <div className="vpa-g1">
          <b>Pago automático</b>
          <span>{copy.text}</span>
        </div>
        <span className={`vpa-tag ${copy.cls}`}>
          <i />
          {copy.tag}
        </span>
      </div>

      {status === "authorized" && amountLabel ? <p className="vpa-note">Próximo pago: {amountLabel}.</p> : null}

      {asking && canStart ? (
        <div className="vpa-adform">
          <label className="vpa-fld">
            <span>Correo de tu cuenta de Mercado Pago</span>
            <input className="vpa-inp" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <div className="row">
            <button type="button" className="vpa-btn soft" onClick={() => setAsking(false)} disabled={pending}>
              Cancelar
            </button>
            <button type="button" className="vpa-btn acc" onClick={start} disabled={pending}>
              {pending ? "Abriendo..." : "Autorizar en Mercado Pago"}
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {canStart ? (
            <button type="button" className="vpa-btn acc" onClick={() => setAsking(true)}>
              {status === "pending" ? "Terminar de autorizar" : "Encender pago automático"}
            </button>
          ) : null}
          {status === "authorized" ? (
            <button type="button" className="vpa-btn line" onClick={() => change("paused")} disabled={pending}>
              Pausar
            </button>
          ) : null}
          {status === "paused" ? (
            <button type="button" className="vpa-btn acc" onClick={() => change("authorized")} disabled={pending}>
              Reactivar
            </button>
          ) : null}
          {status === "authorized" || status === "paused" ? (
            <button type="button" className="vpa-btn line" onClick={() => change("cancelled")} disabled={pending}>
              Apagar pago automático
            </button>
          ) : null}
        </div>
      )}
      {message ? (
        <p className={message.ok ? "vpa-note ok" : "vpa-note err"} role="status">
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
