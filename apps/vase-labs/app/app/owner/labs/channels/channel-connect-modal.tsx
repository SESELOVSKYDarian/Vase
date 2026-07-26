"use client";

import type { LabsChannel } from "@vase/contracts";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Copy, Eye, LockKeyhole, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { channelIconSrc } from "./channel-icons";
import { buildChannelSetupRequest, buildChannelVerifyRequest, createChannelUiFlow } from "./channel-ui-flow";

type Capacity = Record<LabsChannel, { limit: number; used: number; remaining: number }>;
type Setup = { channelId: string; webhookUrl: string; webhookKey: string };
type ChannelHealth = { webhookVerified: boolean; credentialsPresent: boolean; assetVerified: boolean; subscriptionActive: boolean };
type Notice = { kind: "copy" | "pending" | "connected" | "error"; message: string; health?: ChannelHealth };

const channelMeta: Record<LabsChannel, { label: string; detail: string }> = {
  WHATSAPP: { label: "WhatsApp", detail: "Conversaciones y soporte desde WhatsApp Business." },
  INSTAGRAM: { label: "Instagram", detail: "Mensajes directos y consultas sociales." },
  FACEBOOK: { label: "Facebook", detail: "Leads y mensajes de tus páginas." },
};
const credentialLabels: Record<LabsChannel, { account: string; parent?: string }> = {
  WHATSAPP: { account: "Phone Number ID", parent: "WABA ID" },
  INSTAGRAM: { account: "Instagram Professional Account ID", parent: "Facebook Page ID" },
  FACEBOOK: { account: "Facebook Page ID" },
};
const healthLabels: Array<[keyof ChannelHealth, string]> = [
  ["webhookVerified", "Webhook verificado"],
  ["credentialsPresent", "Credencial guardada"],
  ["assetVerified", "Activo Meta validado"],
  ["subscriptionActive", "Suscripcion activa"],
];

function metaConnectionErrorMessage(code: string) {
  if (code === "META_TOKEN_INVALID") return "El Access Token es inválido, venció o fue generado para otra aplicación de Meta.";
  if (code === "META_PERMISSIONS_MISSING") return "El token no tiene todos los permisos necesarios.";
  if (code === "META_ASSET_NOT_AUTHORIZED") return "El Phone Number ID, WABA o página no pertenecen a la cuenta autorizada por el token.";
  if (code === "META_SUBSCRIPTION_FAILED") return "Meta validó el activo, pero no pudo activar la suscripción de eventos. Revisá que el usuario del sistema tenga control total del WABA, número o página y permiso para administrar webhooks.";
  if (code === "META_APP_SECRET_MISSING") return "Ingresá el Meta App Secret de la aplicación que recibe los webhooks. Vase lo guarda cifrado dentro de este canal.";
  if (code === "TOKEN_ENCRYPTION_SECRET_MISSING") return "Falta configurar el secreto interno de cifrado de Labs. El canal del cliente está completo, pero Vase no puede guardar el token cifrado.";
  if (code === "CHANNEL_CREDENTIAL_REENTER_REQUIRED") return "Volvé a pegar el Access Token de este canal. El token guardado fue cifrado con una clave anterior y Vase no puede reutilizarlo.";
  return "Vase no pudo validar el canal con las credenciales cargadas. Revisá el Phone Number ID, WABA ID y Access Token de este canal.";
}

export function ChannelConnectModal({ capacity }: { capacity: Capacity }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<LabsChannel | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [providerAccountId, setProviderAccountId] = useState("");
  const [parentId, setParentId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const openButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const terminalLocked = useRef(false);
  const requests = useRef(createChannelUiFlow()).current;

  const reset = useCallback(() => {
    terminalLocked.current = false;
    setStep(1); setSelected(null); setSetup(null); setNotice(null); setLoading(false); setAdvanced(false); setProviderAccountId(""); setParentId(""); setAccessToken(""); setAppSecret("");
  }, []);

  const close = useCallback((force = false) => {
    if (terminalLocked.current && !force) return;
    requests.invalidate();
    setOpen(false); reset();
    requestAnimationFrame(() => openButton.current?.focus());
  }, [requests, reset]);

  useEffect(() => () => requests.invalidate(), [requests]);
  useEffect(() => { if (open) requestAnimationFrame(() => stepHeading.current?.focus()); }, [open, step]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

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
      if (response.status === 409 && payload.error === "CHANNEL_MANUAL_CONNECTION_EXISTS") throw new Error("manual-exists");
      if (!response.ok || typeof payload.channelId !== "string" || typeof payload.webhookUrl !== "string" || typeof payload.webhookKey !== "string") throw new Error();
      if (requests.isCurrent(ticket)) setSetup(payload as Setup);
    } catch (error) {
      if (requests.isCurrent(ticket)) setNotice({ kind: "error", message: error instanceof Error && error.message === "manual-exists" ? "Este canal manual ya esta conectado." : "No pudimos preparar el canal. Revisá el cupo e intentá nuevamente." });
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
        const health = payload.health && typeof payload.health === "object" ? payload.health as ChannelHealth : undefined;
        setNotice({ kind: "pending", message: typeof payload.message === "string" ? payload.message : "Todavía no detectamos la conexión. Configurá el webhook en Meta y volvé a comprobar.", health });
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

  async function connectWithMeta() {
    if (!selected) return;
    setLoading(true); setNotice(null);
    try {
      const response = await fetch("/api/v1/meta/connections/start", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelType: selected }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.authorizationUrl !== "string") throw new Error();
      window.location.assign(payload.authorizationUrl);
    } catch { setNotice({ kind: "error", message: "No pudimos iniciar la conexión segura con Meta." }); setLoading(false); }
  }

  async function saveAdvancedConnection() {
    if (!selected || !setup || !providerAccountId.trim() || !accessToken.trim() || !appSecret.trim() || (credentialLabels[selected].parent && !parentId.trim())) return;
    setLoading(true); setNotice(null);
    try {
      const response = await fetch(`/api/labs/channels/${setup.channelId}/connect`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelType: selected, accessToken: accessToken.trim(), appSecret: appSecret.trim(), providerAccountId: providerAccountId.trim(), parentId: credentialLabels[selected].parent ? parentId.trim() : null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error);
      setAccessToken("");
      setAppSecret("");
      if (payload.status === "CONNECTED") {
        requests.scheduleConnected(
          () => { terminalLocked.current = true; setNotice({ kind: "connected", message: "Canal conectado correctamente." }); },
          () => { router.refresh(); close(true); },
        );
      } else setNotice({ kind: "pending", message: "Credenciales y activo validados. Falta que Meta compruebe el webhook." });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setNotice({ kind: "error", message: metaConnectionErrorMessage(code) });
    } finally { setLoading(false); }
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
            <span className="labs-picker-mark">{available ? selected === type ? <Check className="size-4" /> : <Image src={channelIconSrc[type]} alt="" width={24} height={24} aria-hidden="true" /> : <LockKeyhole className="size-4" />}</span>
            <span><strong>{channelMeta[type].label}</strong><small>{channelMeta[type].detail}</small></span><em>{item.used} de {item.limit} usados</em>
          </button>;
        })}</div> : <div className="labs-manual-setup">
          {loading && !setup ? <p>Preparando los datos del canal…</p> : setup ? <>
            <div className="labs-oauth-primary"><strong>Conexión recomendada</strong><p>Ingresá con Meta para descubrir la cuenta, guardar credenciales y activar la suscripción sin copiar datos manuales.</p><button className="labs-button labs-button-primary" type="button" onClick={() => void connectWithMeta()} disabled={loading}>Conectar con Meta</button></div>
            {([["Webhook URL", setup.webhookUrl], ["Webhook Key", setup.webhookKey]] as const).map(([label, value]) => <div key={label}>
              <span>{label}</span><code>{value}</code><button type="button" disabled={notice?.kind === "connected"} aria-label={`Copiar ${label}`} onClick={() => void copy(value, label)}><Copy className="size-4" /></button>
            </div>)}
            <button className="labs-advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}><Eye className="size-4" /> {advanced ? "Ocultar configuración avanzada" : "Configuración avanzada"}</button>
            {advanced && selected ? <div className="labs-advanced-fields"><label>{credentialLabels[selected].account}<input value={providerAccountId} onChange={(event) => setProviderAccountId(event.target.value)} /></label>{credentialLabels[selected].parent ? <label>{credentialLabels[selected].parent}<input value={parentId} onChange={(event) => setParentId(event.target.value)} /></label> : null}<label>Access Token<input type="password" autoComplete="off" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} /></label><label>Meta App Secret<input type="password" autoComplete="new-password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} /></label><button className="labs-button labs-button-secondary" type="button" disabled={loading || !providerAccountId.trim() || !accessToken.trim() || !appSecret.trim() || Boolean(credentialLabels[selected].parent && !parentId.trim())} onClick={() => void saveAdvancedConnection()}>Guardar y comprobar</button></div> : null}
          </> : <button className="labs-button labs-button-secondary" type="button" onClick={() => void beginSetup()}>Reintentar</button>}
        </div>}

        {notice ? <div className={notice.kind === "connected" ? "labs-form-success" : notice.kind === "pending" ? "labs-form-pending" : notice.kind === "error" ? "labs-form-error" : "sr-only"} role={notice.kind === "error" ? "alert" : undefined} aria-live="polite">
          {notice.kind === "pending" ? <AlertTriangle className="size-4" /> : null}
          <span>{notice.message}</span>
          {notice.kind === "pending" && notice.health ? <div className="labs-connection-health">
            {healthLabels.map(([key, label]) => <span className={notice.health?.[key] ? "is-ok" : "is-pending"} key={key}><Check className="size-4" />{label}</span>)}
          </div> : null}
        </div> : null}
        <footer>{step === 2 ? <button className="labs-button labs-button-secondary" type="button" disabled={notice?.kind === "connected"} onClick={backToChannels}><ArrowLeft className="size-4" /> Volver</button> : <span />}
          {step === 1 ? <button className="labs-button labs-button-primary" type="button" disabled={!selected} onClick={() => void beginSetup()}>Continuar <ArrowRight className="size-4" /></button> :
            notice?.kind === "connected" ? <button className="labs-button labs-button-primary" type="button" disabled>Cerrar</button> :
            <button className="labs-button labs-button-primary" type="button" disabled={loading || !setup} onClick={() => void verify()}>{loading && setup ? "Comprobando…" : "Comprobar conexión"}</button>}
        </footer>
      </section>
    </div> : null}
  </>;
}
