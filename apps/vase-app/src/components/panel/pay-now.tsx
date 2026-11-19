"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  payWithSavedCardAction,
  startMercadoPagoCheckoutAction,
} from "@/app/(platform)/app/billing/actions";
import { useSecureFields } from "@/components/panel/use-mercadopago";

export type PayCard = { id: string; brand: string; last4: string; expiration: string; isDefault: boolean };

const CVV_ELEMENT = "vpa-mp-cvv";

export function PayNow({
  paymentId,
  amountLabel,
  concept,
  cards,
  publicKey,
  transferAlias,
}: {
  paymentId: string;
  amountLabel: string;
  concept: string;
  cards: PayCard[];
  publicKey: string;
  transferAlias: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const preferred = cards.find((card) => card.isDefault)?.id ?? cards[0]?.id ?? "mp";
  const [method, setMethod] = useState(preferred);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCard = cards.find((card) => card.id === method) ?? null;
  const { clientRef, ready, failed } = useSecureFields(
    publicKey,
    [{ type: "securityCode", elementId: CVV_ELEMENT, placeholder: "CVV" }],
    open && Boolean(selectedCard),
  );

  const submit = () => {
    setNotice(null);
    startTransition(async () => {
      if (method === "mp") {
        const result = await startMercadoPagoCheckoutAction(paymentId);
        if (result.ok && result.url) {
          window.location.assign(result.url);
          return;
        }
        setNotice({ ok: false, message: result.message ?? "No pudimos abrir Mercado Pago." });
        return;
      }

      if (!selectedCard || !clientRef.current) return;
      try {
        const token = await clientRef.current.fields.createCardToken({ cardId: selectedCard.id });
        const result = await payWithSavedCardAction({ paymentId, token: token.id });
        setNotice({ ok: result.ok, message: result.message ?? "" });
        if (result.ok) router.refresh();
      } catch {
        setNotice({ ok: false, message: "Revisá el código de seguridad." });
      }
    });
  };

  const buttonLabel = method === "mp" ? "Ir a Mercado Pago" : `Pagar ${amountLabel}`;

  return (
    <>
      <button type="button" className="vpa-btn acc lg" onClick={() => setOpen(true)}>
        Pagar ahora
      </button>
      {open ? (
        <div className="vpa-dialog">
          <div role="dialog" aria-label="Pagar" style={{ width: 560 }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div>
                <h3>Pagar {amountLabel}</h3>
                <p>{concept}</p>
              </div>
              <button type="button" className="vpa-x" aria-label="Cerrar" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="vpa-payopts" role="radiogroup" aria-label="Cómo querés pagar">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  role="radio"
                  aria-checked={method === card.id}
                  className={method === card.id ? "vpa-payopt on" : "vpa-payopt"}
                  onClick={() => setMethod(card.id)}
                >
                  <span className="vpa-rad" aria-hidden="true" />
                  <span className="vpa-g1">
                    <b>{card.brand} terminada en {card.last4}</b>
                    <span>{card.isDefault ? "Tu tarjeta predeterminada" : `Vence ${card.expiration}`}</span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={method === "mp"}
                className={method === "mp" ? "vpa-payopt on" : "vpa-payopt"}
                onClick={() => setMethod("mp")}
              >
                <span className="vpa-rad" aria-hidden="true" />
                <span className="vpa-g1">
                  <b>Mercado Pago</b>
                  <span>Con tu saldo o cualquier tarjeta</span>
                </span>
              </button>
              {transferAlias ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "transfer"}
                  className={method === "transfer" ? "vpa-payopt on" : "vpa-payopt"}
                  onClick={() => setMethod("transfer")}
                >
                  <span className="vpa-rad" aria-hidden="true" />
                  <span className="vpa-g1">
                    <b>Transferencia</b>
                    <span>Alias {transferAlias}</span>
                  </span>
                </button>
              ) : null}
            </div>
            {selectedCard ? (
              <div className="vpa-fld">
                <span>Código de seguridad</span>
                <div id={CVV_ELEMENT} className="vpa-inp vpa-mpf" />
                {failed ? <small style={{ color: "var(--red)" }}>No pudimos cargar el formulario seguro.</small> : null}
              </div>
            ) : null}
            {notice ? <p role="status" style={{ color: notice.ok ? "var(--acc-tx)" : "var(--red)" }}>{notice.message}</p> : null}
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                {notice?.ok ? "Cerrar" : "Cancelar"}
              </button>
              {method === "transfer" ? (
                <a className="vpa-btn acc" href="/app/help">
                  Avisar que transferí
                </a>
              ) : notice?.ok ? null : (
                <button type="button" className="vpa-btn acc" disabled={isPending || (Boolean(selectedCard) && !ready)} onClick={submit}>
                  {isPending ? "Procesando..." : buttonLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
