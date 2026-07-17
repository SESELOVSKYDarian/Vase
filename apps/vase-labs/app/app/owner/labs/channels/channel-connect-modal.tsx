"use client";

import type { LabsChannel } from "@vase/contracts";
import { ArrowLeft, ArrowRight, Check, Copy, LockKeyhole, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildChannelSetupRequest, buildChannelVerifyRequest, createChannelUiFlow } from "./channel-ui-flow";

type Capacity = Record<LabsChannel, { limit: number; used: number; remaining: number }>;
type Setup = { channelId: string; webhookUrl: string; webhookKey: string };
type Notice = { kind: "copy" | "pending" | "connected" | "error"; message: string };

const channelMeta: Record<LabsChannel, { label: string; detail: string }> = {
  WHATSAPP: { label: "WhatsApp", detail: "Conversaciones y soporte desde WhatsApp Business." },
  INSTAGRAM: { label: "Instagram", detail: "Mensajes directos y consultas sociales." },
  FACEBOOK: { label: "Facebook", detail: "Leads y mensajes de tus páginas." },
};

export function ChannelConnectModal({ capacity }: { capacity: Capacity }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<LabsChannel | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const terminalLocked = useRef(false);
  const requests = useRef(createChannelUiFlow()).current;

  function reset() {
    terminalLocked.current = false;
    setStep(1); setSelected(null); setSetup(null); setNotice(null); setLoading(false);
  }

  function close(force = false) {
    if (terminalLocked.current && !force) return;
    requests.invalidate();
    setOpen(false); reset();
    requestAnimationFrame(() => openButton.current?.focus());
  }

  useEffect(() => () => requests.invalidate(), [requests]);
  useEffect(() => { if (open) requestAnimationFrame(() => stepHeading.current?.focus()); }, [open, step]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function beginSetup() {
    if (!selected) return;
    const ticket = requests.start("setup");
    if (!ticket) return;
    setStep(2); setSetup(null); setNotice(null); setLoading(true);
    try {
      const response = await fetch("/api/labs/channels/setup", {
        ...buildChannelSetupRequest(selected), signal: ticket.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.channelId !== "string" || typeof payload.webhookUrl !== "string" || typeof payload.webhookKey !== "string") throw new Error();
      if (requests.isCurrent(ticket)) setSetup(payload as Setup);
    } catch {
      if (requests.isCurrent(ticket)) setNotice({ kind: "error", message: "No pudimos preparar el canal. Revisá el cupo e intentá nuevamente." });
    } finally {
      if (requests.isCurrent(ticket)) setLoading(false);
      requests.finish(ticket);
    }
  }

  async function verify() {
    if (!setup) return;
    const ticket = requests.startVerify();
    if (!ticket) return;
    setLoading(true); setNotice(null);
    try {
      const response = await fetch("/api/labs/channels/verify", {
        ...buildChannelVerifyRequest(setup.channelId), signal: ticket.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      if (!requests.isCurrent(ticket)) return;
      if (payload.status === "CONNECTED") {
        requests.scheduleConnected(
          () => { terminalLocked.current = true; setNotice({ kind: "connected", message: "Canal conectado correctamente." }); },
          () => { router.refresh(); close(true); },
        );
      } else if (payload.status === "PENDING") {
        setNotice({ kind: "pending", message: "Todavía no detectamos la conexión. Configurá el webhook en Meta y volvé a comprobar." });
      } else {
        setNotice({ kind: "error", message: "No pudimos verificar la conexión. Revisá la configuración e intentá nuevamente." });
      }
    } catch {
      if (requests.isCurrent(ticket)) setNotice({ kind: "error", message: "No pudimos verificar la conexión. Intentá nuevamente." });
    } finally {
      if (requests.isCurrent(ticket)) setLoading(false);
      requests.finish(ticket);
    }
  }

  async function copy(value: string, label: string) {
    const ticket = requests.startLatestCopy();
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(value);
      if (requests.isCurrent(ticket)) setNotice({ kind: "copy", message: `${label} copiado.` });
    } catch {
      if (requests.isCurrent(ticket)) setNotice({ kind: "error", message: `No pudimos copiar ${label}.` });
    } finally { requests.finish(ticket); }
  }

  function backToChannels() {
    if (terminalLocked.current) return;
    requests.invalidate();
    setStep(1); setSetup(null); setNotice(null); setLoading(false);
  }

  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = dialog.current?.querySelectorAll<HTMLElement>('[data-step-focus], button:not([disabled])');
    if (!controls?.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <>
    <button ref={openButton} className="labs-button labs-button-primary" type="button" onClick={() => setOpen(true)}><Plus className="size-4" /> Agregar canal</button>
    {open ? <div className="labs-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialog} onKeyDown={trapFocus} className="labs-connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-channel-title">
        <header><div><span className="labs-modal-kicker">Paso {step} de 2</span>
          <h2 ref={stepHeading} tabIndex={-1} data-step-focus id="connect-channel-title">{step === 1 ? "Elegir un canal" : `Configurar ${selected ? channelMeta[selected].label : "canal"}`}</h2>
          <p>{step === 1 ? "Seleccioná el punto de contacto que querés sumar." : "Copiá estos datos en Meta y después comprobá la conexión."}</p>
        </div><button type="button" className="labs-icon-button" disabled={notice?.kind === "connected"} onClick={() => close()} aria-label="Cerrar"><X className="size-4" /></button></header>

        {step === 1 ? <div className="labs-channel-picker">{(Object.keys(channelMeta) as LabsChannel[]).map((type) => {
          const item = capacity[type], available = item.remaining > 0;
          return <button key={type} type="button" disabled={!available} onClick={() => setSelected(type)} className={selected === type ? "is-selected" : ""}>
            <span className="labs-picker-mark">{available ? selected === type ? <Check className="size-4" /> : channelMeta[type].label.slice(0, 2) : <LockKeyhole className="size-4" />}</span>
            <span><strong>{channelMeta[type].label}</strong><small>{channelMeta[type].detail}</small></span><em>{item.used} de {item.limit} usados</em>
          </button>;
        })}</div> : <div className="labs-manual-setup">
          {loading && !setup ? <p>Preparando los datos del canal…</p> : setup ? <>
            {([["Webhook URL", setup.webhookUrl], ["Webhook Key", setup.webhookKey]] as const).map(([label, value]) => <div key={label}>
              <span>{label}</span><code>{value}</code><button type="button" disabled={notice?.kind === "connected"} aria-label={`Copiar ${label}`} onClick={() => void copy(value, label)}><Copy className="size-4" /></button>
            </div>)}
          </> : <button className="labs-button labs-button-secondary" type="button" onClick={() => void beginSetup()}>Reintentar</button>}
        </div>}

        {notice ? <p className={notice.kind === "connected" ? "labs-form-success" : notice.kind === "pending" ? "labs-form-pending" : notice.kind === "error" ? "labs-form-error" : "sr-only"} role={notice.kind === "error" ? "alert" : undefined} aria-live="polite">{notice.message}</p> : null}
        <footer>{step === 2 ? <button className="labs-button labs-button-secondary" type="button" disabled={notice?.kind === "connected"} onClick={backToChannels}><ArrowLeft className="size-4" /> Volver</button> : <span />}
          {step === 1 ? <button className="labs-button labs-button-primary" type="button" disabled={!selected} onClick={() => void beginSetup()}>Continuar <ArrowRight className="size-4" /></button> :
            notice?.kind === "connected" ? <button className="labs-button labs-button-primary" type="button" disabled>Cerrar</button> :
            <button className="labs-button labs-button-primary" type="button" disabled={loading || !setup} onClick={() => void verify()}>{loading && setup ? "Comprobando…" : "Comprobar conexión"}</button>}
        </footer>
      </section>
    </div> : null}
  </>;
}
