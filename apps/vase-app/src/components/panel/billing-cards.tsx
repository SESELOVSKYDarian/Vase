"use client";

import { useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  removeCardAction,
  saveCardAction,
  setDefaultCardAction,
} from "@/app/(platform)/app/billing/actions";
import type { PayCard } from "@/components/panel/pay-now";
import { useSecureFields } from "@/components/panel/use-mercadopago";

const SECURE_FIELDS = [
  { type: "cardNumber" as const, elementId: "vpa-mp-number", placeholder: "Número de tarjeta" },
  { type: "expirationDate" as const, elementId: "vpa-mp-exp", placeholder: "MM/AA" },
  { type: "securityCode" as const, elementId: "vpa-mp-sec", placeholder: "CVV" },
];

function AddCardDialog({ publicKey, onClose }: { publicKey: string; onClose: () => void }) {
  const { clientRef, ready, failed } = useSecureFields(publicKey, SECURE_FIELDS, true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form || !clientRef.current) return;
    const data = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        const token = await clientRef.current!.fields.createCardToken({
          cardholderName: String(data.get("holder") ?? ""),
          identificationType: String(data.get("docType") ?? "DNI"),
          identificationNumber: String(data.get("docNumber") ?? ""),
        });
        const result = await saveCardAction(token.id);
        if (result.ok) {
          onClose();
          return;
        }
        setError(result.message ?? "No pudimos guardar la tarjeta.");
      } catch {
        setError("Revisá los datos de la tarjeta.");
      }
    });
  };

  return (
    <div className="vpa-dialog">
      <div role="dialog" aria-label="Agregar tarjeta" style={{ width: 520 }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div>
            <h3>Agregar tarjeta</h3>
            <p>La vas a poder usar para pagar tu plan.</p>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form ref={formRef} onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="vpa-fld">
            <span>Número de tarjeta</span>
            <div id="vpa-mp-number" className="vpa-inp vpa-mpf" />
          </div>
          <div className="vpa-form">
            <div className="vpa-fld">
              <span>Vencimiento</span>
              <div id="vpa-mp-exp" className="vpa-inp vpa-mpf" />
            </div>
            <div className="vpa-fld">
              <span>Código de seguridad</span>
              <div id="vpa-mp-sec" className="vpa-inp vpa-mpf" />
            </div>
          </div>
          <label className="vpa-fld">
            <span>Nombre como figura en la tarjeta</span>
            <input className="vpa-inp" name="holder" required autoComplete="off" />
          </label>
          <div className="vpa-form">
            <label className="vpa-fld">
              <span>Tipo de documento</span>
              <select className="vpa-inp" name="docType" defaultValue="DNI">
                <option value="DNI">DNI</option>
                <option value="CUIL">CUIL</option>
                <option value="CUIT">CUIT</option>
              </select>
            </label>
            <label className="vpa-fld">
              <span>Número de documento</span>
              <input className="vpa-inp" name="docNumber" required inputMode="numeric" autoComplete="off" />
            </label>
          </div>
          <div className="vpa-hrow">
            <span className="vpa-mut">Los datos de tu tarjeta los guarda Mercado Pago. Vase nunca los ve.</span>
          </div>
          {failed ? <p role="alert" style={{ color: "var(--red)" }}>No pudimos cargar el formulario seguro.</p> : null}
          {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
          <div className="row">
            <button type="button" className="vpa-btn soft" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="vpa-btn acc" disabled={!ready || isPending}>
              {isPending ? "Guardando..." : "Guardar tarjeta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BillingCards({ cards, publicKey }: { cards: PayCard[]; publicKey: string }) {
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<PayCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.message ?? "No pudimos completar la operación.");
      setConfirmRemove(null);
    });
  };

  return (
    <section className="vpa-card">
      <div className="vpa-sech" style={{ marginBottom: 4 }}>
        <div>
          <h3>Medios de pago</h3>
          <p>Las tarjetas que tenés guardadas para pagar tu plan.</p>
        </div>
        <button type="button" className="vpa-btn line sm" onClick={() => setAdding(true)}>
          Agregar tarjeta
        </button>
      </div>
      {cards.length === 0 ? <p>Todavía no guardaste ninguna tarjeta.</p> : null}
      {error ? <p role="alert" style={{ color: "var(--red)" }}>{error}</p> : null}
      {cards.map((card) => (
        <div className="vpa-cardrow" key={card.id}>
          <div className="vpa-g1">
            <b>{card.brand} terminada en {card.last4}</b>
            <span>Vence {card.expiration}</span>
          </div>
          {card.isDefault ? (
            <span className="vpa-tag g">
              <i />
              Predeterminada
            </span>
          ) : (
            <button type="button" className="vpa-btn soft sm" disabled={isPending} onClick={() => run(() => setDefaultCardAction(card.id))}>
              Hacer predeterminada
            </button>
          )}
          <button type="button" className="vpa-btn soft sm danger" disabled={isPending} onClick={() => setConfirmRemove(card)}>
            Quitar
          </button>
        </div>
      ))}
      {adding ? <AddCardDialog publicKey={publicKey} onClose={() => setAdding(false)} /> : null}
      {confirmRemove ? (
        <div className="vpa-dialog">
          <div role="dialog" aria-label="Quitar tarjeta">
            <h3>¿Quitar la tarjeta terminada en {confirmRemove.last4}?</h3>
            <p>Vas a tener que cargarla de nuevo para volver a usarla.</p>
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setConfirmRemove(null)}>
                Volver
              </button>
              <button type="button" className="vpa-btn ink" disabled={isPending} onClick={() => run(() => removeCardAction(confirmRemove.id))}>
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
