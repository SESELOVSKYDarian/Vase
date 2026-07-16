"use client";

import type { LabsChannel } from "@vase/contracts";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Plus, X } from "lucide-react";
import { useState } from "react";

type Capacity = Record<LabsChannel, { limit: number; used: number; remaining: number }>;

const channelMeta: Record<LabsChannel, { label: string; detail: string }> = {
  WHATSAPP: { label: "WhatsApp", detail: "Conversaciones y soporte desde WhatsApp Business." },
  INSTAGRAM: { label: "Instagram", detail: "Mensajes directos y consultas sociales." },
  FACEBOOK: { label: "Facebook", detail: "Leads y mensajes de tus paginas." },
};

export function ChannelConnectModal({ capacity }: { capacity: Capacity }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<LabsChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setOpen(false);
    setStep(1);
    setSelected(null);
    setError(null);
  }

  async function connect() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const response = await fetch("/api/v1/meta/connections/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelType: selected }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.authorizationUrl !== "string") {
      setError(payload.error === "CHANNEL_LIMIT_REACHED" ? "El cupo de este canal ya esta completo." : "No pudimos iniciar la conexion. Intenta nuevamente.");
      setLoading(false);
      return;
    }
    window.location.assign(payload.authorizationUrl);
  }

  return (
    <>
      <button className="labs-button labs-button-primary" type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Agregar canal
      </button>
      {open ? (
        <div className="labs-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="labs-connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-channel-title">
            <header>
              <div>
                <span className="labs-modal-kicker">Paso {step} de 2</span>
                <h2 id="connect-channel-title">{step === 1 ? "Elegir un canal" : `Conectar ${selected ? channelMeta[selected].label : "canal"}`}</h2>
                <p>{step === 1 ? "Selecciona el punto de contacto que quieres sumar." : "Vas a continuar en Meta para elegir la cuenta y autorizar el acceso."}</p>
              </div>
              <button type="button" className="labs-icon-button" onClick={close} aria-label="Cerrar"><X className="size-4" /></button>
            </header>

            {step === 1 ? (
              <div className="labs-channel-picker">
                {(Object.keys(channelMeta) as LabsChannel[]).map((type) => {
                  const item = capacity[type];
                  const available = item.remaining > 0;
                  return (
                    <button key={type} type="button" disabled={!available} onClick={() => setSelected(type)} className={selected === type ? "is-selected" : ""}>
                      <span className="labs-picker-mark">{available ? selected === type ? <Check className="size-4" /> : channelMeta[type].label.slice(0, 2) : <LockKeyhole className="size-4" />}</span>
                      <span><strong>{channelMeta[type].label}</strong><small>{channelMeta[type].detail}</small></span>
                      <em>{item.used} de {item.limit} usados</em>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="labs-meta-confirmation">
                <span className="labs-picker-mark">{selected?.slice(0, 2)}</span>
                <div><strong>Conexion oficial de Meta</strong><p>Vase nunca mostrara ni guardara tu token en el navegador. Podras revocar el acceso cuando quieras.</p></div>
              </div>
            )}

            {error ? <p className="labs-form-error">{error}</p> : null}
            <footer>
              {step === 2 ? <button className="labs-button labs-button-secondary" type="button" onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Volver</button> : <span />}
              {step === 1 ? (
                <button className="labs-button labs-button-primary" type="button" disabled={!selected} onClick={() => setStep(2)}>Continuar <ArrowRight className="size-4" /></button>
              ) : (
                <button className="labs-button labs-button-primary" type="button" disabled={loading} onClick={connect}>{loading ? "Conectando..." : "Continuar con Meta"} <ArrowRight className="size-4" /></button>
              )}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
