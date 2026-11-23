"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { CreditCard, QrCode, RefreshCw, Wallet, X } from "lucide-react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import {
  payWithSavedCardAction,
  startAutoDebitAction,
  startMercadoPagoCheckoutAction,
} from "@/app/(platform)/app/billing/actions";
import { useSecureFields } from "@/components/panel/use-mercadopago";

export type PayCard = { id: string; brand: string; last4: string; expiration: string; isDefault: boolean };

const CVV_ELEMENT = "vpa-mp-cvv";

/**
 * Pagar una factura de Vase: con una tarjeta guardada, con Mercado Pago (en esta compu o escaneando un QR con el
 * celular) o dejando activado el pago automático de todos los meses. Se abre por encima de todo, y en el celular
 * sube desde abajo.
 */
export function PayNow({
  paymentId,
  amountLabel,
  concept,
  cards,
  publicKey,
  autoPayActive = false,
  defaultEmail = "",
}: {
  paymentId: string;
  amountLabel: string;
  concept: string;
  cards: PayCard[];
  publicKey: string;
  /** Ya paga solo cada mes: no se ofrece activarlo de nuevo. */
  autoPayActive?: boolean;
  /** Correo sugerido para el pago automático (se puede cambiar). */
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const preferred = cards.find((card) => card.isDefault)?.id ?? cards[0]?.id ?? "mp";
  const [method, setMethod] = useState(preferred);
  const [email, setEmail] = useState(defaultEmail);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCard = cards.find((card) => card.id === method) ?? null;
  const { clientRef, ready, failed } = useSecureFields(
    publicKey,
    [{ type: "securityCode", elementId: CVV_ELEMENT, placeholder: "CVV" }],
    open && Boolean(selectedCard),
  );
  // QR con el mismo link de pago de Mercado Pago: se escanea con la cámara o con la app de Mercado Pago.
  const [qr, setQr] = useState<{ image: string; url: string } | null>(null);

  // Mientras se muestra el QR, la pantalla se actualiza sola: cuando el pago se acredita, la factura desaparece.
  useEffect(() => {
    if (!qr) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [qr, router]);

  // Escape cierra.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQr(null);
    setNotice(null);
  };

  const showQr = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await startMercadoPagoCheckoutAction(paymentId);
      if (!result.ok || !result.url) {
        setNotice({ ok: false, message: result.message ?? "No pudimos preparar el QR." });
        return;
      }
      const image = await QRCode.toDataURL(result.url, { margin: 1, width: 280, errorCorrectionLevel: "M" });
      setQr({ image, url: result.url });
    });
  };

  const submit = () => {
    setNotice(null);
    startTransition(async () => {
      if (method === "mp" || method === "auto") {
        const result = method === "mp" ? await startMercadoPagoCheckoutAction(paymentId) : await startAutoDebitAction(email);
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

  const buttonLabel = method === "mp" ? "Ir a Mercado Pago" : method === "auto" ? "Activar pago automático" : `Pagar ${amountLabel}`;

  const option = (id: string, icon: React.ReactNode, title: string, text: string) => (
    <button
      key={id}
      type="button"
      role="radio"
      aria-checked={method === id}
      className={method === id ? "vpa-payopt on" : "vpa-payopt"}
      onClick={() => {
        setMethod(id);
        setNotice(null);
      }}
    >
      <span className="vpa-payic" aria-hidden="true">
        {icon}
      </span>
      <span className="vpa-g1">
        <b>{title}</b>
        <span>{text}</span>
      </span>
      <span className="vpa-rad" aria-hidden="true" />
    </button>
  );

  const dialog = (
    <div className="vpa-paysheet" role="presentation" onClick={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-label={`Pagar ${amountLabel}`} className="vpa-paybox">
        <div className="vpa-payhead">
          <div className="vpa-g1">
            <span className="vpa-lab">Pagás</span>
            <b>{amountLabel}</b>
            <span>{concept}</span>
          </div>
          <button type="button" className="vpa-x" aria-label="Cerrar" onClick={close}>
            <X size={18} />
          </button>
        </div>

        {qr ? (
          <div className="vpa-qrpay">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR generado acá mismo */}
            <img src={qr.image} alt="Código QR para pagar con Mercado Pago" width={240} height={240} />
            <div className="vpa-g1">
              <b>Escanealo con el celular</b>
              <span>Con la cámara o con la app de Mercado Pago. Pagás ahí y esta pantalla se actualiza sola cuando se acredita.</span>
            </div>
            <div className="vpa-payacts">
              <a className="vpa-btn line" href={qr.url}>
                Pagar en esta computadora
              </a>
              <button type="button" className="vpa-btn soft" onClick={() => setQr(null)}>
                Volver
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="vpa-payopts" role="radiogroup" aria-label="Cómo querés pagar">
              {cards.map((card) =>
                option(card.id, <CreditCard size={18} />, `${card.brand} terminada en ${card.last4}`, card.isDefault ? "Tu tarjeta predeterminada" : `Vence ${card.expiration}`),
              )}
              {option("mp", <Wallet size={18} />, "Mercado Pago", "Con tu saldo o cualquier tarjeta, acá o con el celular")}
              {autoPayActive ? null : option("auto", <RefreshCw size={18} />, "Pago automático", "Se paga solo todos los meses. Lo apagás cuando quieras.")}
            </div>

            {selectedCard ? (
              <div className="vpa-fld">
                <span>Código de seguridad</span>
                <div id={CVV_ELEMENT} className="vpa-inp vpa-mpf" />
                {failed ? <small style={{ color: "var(--red)" }}>No pudimos cargar el formulario seguro.</small> : null}
              </div>
            ) : null}

            {method === "auto" ? (
              <label className="vpa-fld">
                <span>Correo de la cuenta de Mercado Pago que va a pagar</span>
                <input className="vpa-inp" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <small className="vpa-mut">Autorizás tu tarjeta una vez en Mercado Pago. Este mes y los que vienen se pagan solos.</small>
              </label>
            ) : null}

            {notice ? (
              <p role="status" className={notice.ok ? "vpa-note ok" : "vpa-note err"}>
                {notice.message}
              </p>
            ) : null}

            {notice?.ok ? (
              <div className="vpa-payacts">
                <button type="button" className="vpa-btn acc" onClick={close}>
                  Listo
                </button>
              </div>
            ) : (
              <div className="vpa-payacts">
                <button type="button" className="vpa-btn acc" disabled={isPending || (Boolean(selectedCard) && !ready)} onClick={submit}>
                  {isPending ? "Procesando..." : buttonLabel}
                </button>
                {method === "mp" ? (
                  <button type="button" className="vpa-btn line" disabled={isPending} onClick={showQr}>
                    <QrCode size={16} aria-hidden="true" />
                    Pagar con el celular
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="vpa-btn acc lg"
        onClick={() => {
          setQr(null);
          setNotice(null);
          setOpen(true);
        }}
      >
        Pagar ahora
      </button>
      {open && typeof document !== "undefined" ? createPortal(<div className="vpa vpa-portal">{dialog}</div>, document.body) : null}
    </>
  );
}
