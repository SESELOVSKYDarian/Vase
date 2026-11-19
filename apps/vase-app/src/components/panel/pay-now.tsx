"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  payWithSavedCardAction,
  startMercadoPagoCheckoutAction,
} from "@/app/(platform)/app/billing/actions";
import { useSecureFields } from "@/components/panel/use-mercadopago";
import { RECEIPT_ACCEPT, type TransferDetails } from "@/lib/billing/transfer";

export type PayCard = { id: string; brand: string; last4: string; expiration: string; isDefault: boolean };

const CVV_ELEMENT = "vpa-mp-cvv";

export function PayNow({
  paymentId,
  amountLabel,
  concept,
  cards,
  publicKey,
  mpEnabled,
  transfer,
  amountValue,
}: {
  paymentId: string;
  amountLabel: string;
  concept: string;
  cards: PayCard[];
  publicKey: string;
  /** Mercado Pago configurado (link y tarjetas guardadas). */
  mpEnabled: boolean;
  /** Datos para transferir; null si no se ofrece transferencia. */
  transfer: TransferDetails | null;
  /** Lo que se debe, para copiarlo tal cual en el home banking. */
  amountValue: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const preferred = cards.find((card) => card.isDefault)?.id ?? cards[0]?.id ?? (mpEnabled ? "mp" : "transfer");
  const [method, setMethod] = useState(preferred);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCard = cards.find((card) => card.id === method) ?? null;
  const { clientRef, ready, failed } = useSecureFields(
    publicKey,
    [{ type: "securityCode", elementId: CVV_ELEMENT, placeholder: "CVV" }],
    open && Boolean(selectedCard),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      // sin portapapeles: el dato igual está a la vista
    }
  };

  const sendReceipt = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setNotice({ ok: false, message: "Elegí el comprobante (foto o PDF)." });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const form = new FormData();
      form.append("paymentId", paymentId);
      form.append("file", file);
      try {
        const response = await fetch("/api/billing/receipts", { method: "POST", body: form });
        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
        if (result.ok) {
          setNotice({ ok: true, message: "Recibimos tu comprobante. Lo revisamos y te avisamos por correo cuando se acredite." });
          router.refresh();
        } else {
          setNotice({ ok: false, message: result.message ?? "No pudimos subir el comprobante. Probá de nuevo." });
        }
      } catch {
        setNotice({ ok: false, message: "No pudimos subir el comprobante. Probá de nuevo." });
      }
    });
  };

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
              {mpEnabled ? (
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
                  <span>Te lleva a Mercado Pago y se acredita al instante</span>
                </span>
              </button>
              ) : null}
              {transfer ? (
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
                    <span>Transferís y subís el comprobante</span>
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
            {method === "transfer" && transfer ? (
              <div className="vpa-xfer">
                <div className="vpa-xfer-data">
                  {(
                    [
                      ["alias", "Alias", transfer.alias],
                      ["cbu", "CBU / CVU", transfer.cbu],
                      ["monto", "Monto", String(amountValue)],
                      ["titular", "Titular", transfer.holder],
                      ["banco", "Banco", transfer.bank],
                      ["cuit", "CUIT", transfer.taxId],
                    ] as const
                  )
                    .filter(([, , value]) => Boolean(value))
                    .map(([key, label, value]) => (
                      <div key={key} className="vpa-xfer-row">
                        <span>{label}</span>
                        <b>{key === "monto" ? amountLabel : value}</b>
                        {key === "alias" || key === "cbu" || key === "monto" ? (
                          <button type="button" className="vpa-btn line sm" onClick={() => void copy(key, value as string)}>
                            {copied === key ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            {copied === key ? "Copiado" : "Copiar"}
                          </button>
                        ) : null}
                      </div>
                    ))}
                </div>
                <label className="vpa-xfer-file">
                  <FileUp size={18} aria-hidden="true" />
                  <span className="vpa-g1">
                    <b>{fileName ?? "Subí el comprobante"}</b>
                    <span>{fileName ? "Tocá para cambiarlo" : "Foto o PDF, hasta 5 MB"}</span>
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={RECEIPT_ACCEPT}
                    className="vpa-sr"
                    onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                  />
                </label>
              </div>
            ) : null}
            {notice ? <p role="status" style={{ color: notice.ok ? "var(--acc-tx)" : "var(--red)" }}>{notice.message}</p> : null}
            <div className="row">
              <button type="button" className="vpa-btn soft" onClick={() => setOpen(false)}>
                {notice?.ok ? "Cerrar" : "Cancelar"}
              </button>
              {notice?.ok ? null : method === "transfer" ? (
                <button type="button" className="vpa-btn acc" disabled={isPending} onClick={sendReceipt}>
                  {isPending ? "Subiendo..." : "Enviar comprobante"}
                </button>
              ) : (
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
