"use client";

import type { LabsChannel } from "@vase/contracts";
import { Check, Copy, Eye, EyeOff, LockKeyhole, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChannelHealthList, ChannelStatusSummary, type ChannelHealth } from "./channel-health";

type Summary = { id: string; type: LabsChannel; accountLabel: string | null };
type InstagramAuthMode = "INSTAGRAM_LOGIN" | "FACEBOOK_LOGIN";
type Details = {
  channelId: string;
  channelType: LabsChannel;
  status: string;
  webhookUrl: string;
  webhookKey: string;
  providerAccountId: string | null;
  parentId: string | null;
  accountLabel: string | null;
  metaAppId: string | null;
  instagramAuthMode?: InstagramAuthMode | null;
  lastSyncedAt?: string | null;
  health: ChannelHealth;
};

const labels: Record<LabsChannel, { account: string; parent?: string }> = {
  WHATSAPP: { account: "Phone Number ID", parent: "WABA ID" },
  INSTAGRAM: { account: "Instagram Professional Account ID", parent: "Facebook Page ID" },
  FACEBOOK: { account: "Facebook Page ID" },
};

function message(code: string) {
  return ({
    RATE_LIMIT_EXCEEDED: "Demasiados intentos. Esperá cinco minutos.",
    PASSWORD_INVALID: "La contraseña no es correcta.",
    META_TOKEN_INVALID: "El Access Token es inválido o venció.",
    META_PERMISSIONS_MISSING: "El token no tiene todos los permisos requeridos.",
    META_ASSET_NOT_AUTHORIZED: "Los identificadores no pertenecen al activo autorizado.",
    META_SUBSCRIPTION_FAILED: "Meta validó el activo, pero no pudo activar la suscripción.",
    CHANNEL_CREDENTIAL_REENTER_REQUIRED: "Volvé a ingresar las credenciales del canal.",
    TOKEN_ENCRYPTION_SECRET_MISSING: "Falta configurar el secreto interno de cifrado de Labs.",
  } as Record<string, string>)[code] ?? "No pudimos completar esta operación. Revisá la configuración e intentá nuevamente.";
}

export function ChannelEditModal({ channel }: { channel: Summary }) {
  const router = useRouter();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [security, setSecurity] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [account, setAccount] = useState("");
  const [parent, setParent] = useState("");
  const [appId, setAppId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isInstagramLogin = channel.type === "INSTAGRAM" && details?.instagramAuthMode === "INSTAGRAM_LOGIN";
  const showParentField = Boolean(labels[channel.type].parent) && !isInstagramLogin;
  const accountLabel = isInstagramLogin ? "Instagram User ID" : labels[channel.type].account;
  const appLabel = isInstagramLogin ? "Instagram App ID" : "Meta App ID";
  const secretLabel = isInstagramLogin ? "Instagram App Secret" : "Meta App Secret";

  const clearProtectedState = useCallback(() => {
    setPassword(""); setToken(""); setSecret(""); setShowToken(false); setShowSecret(false);
    setSecurity(false); setAdvanced(false);
  }, []);

  const close = useCallback(() => {
    clearProtectedState(); setOpen(false); setDetails(null); setError(null);
    requestAnimationFrame(() => opener.current?.focus());
  }, [clearProtectedState]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) security ? clearProtectedState() : close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, clearProtectedState, close, open, security]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function load() {
    setOpen(true); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setDetails(payload);
      setAccount(payload.providerAccountId ?? "");
      setParent(payload.parentId ?? "");
      setAppId(payload.metaAppId ?? "");
    } catch (reason) {
      setError(message(reason instanceof Error ? reason.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}/reveal-token`, {
        method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.accessToken !== "string" || typeof payload.appSecret !== "string") throw new Error(payload.error);
      setToken(payload.accessToken); setSecret(payload.appSecret); setPassword(""); setSecurity(false); setAdvanced(true);
      setToast("Identidad comprobada");
    } catch (reason) {
      setError(message(reason instanceof Error ? reason.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!details) return;
    setBusy(true); setError(null);
    try {
      const response = details.status === "CONNECTED"
        ? await fetch(`/api/v1/channels/${channel.id}/test`, { method: "POST" })
        : await fetch("/api/labs/channels/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelId: channel.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setToast(details.status === "CONNECTED" ? "Canal funcionando correctamente" : payload.message ?? "Configuración comprobada");
      await load(); router.refresh();
    } catch (reason) {
      setError(message(reason instanceof Error ? reason.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!details) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}/connect`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channelType: channel.type, accessToken: token, appSecret: secret, metaAppId: appId,
          providerAccountId: account,
          // Preserve an optional Page ID previously volunteered for Instagram Login.
          parentId: labels[channel.type].parent ? parent || null : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setToast("Configuración guardada y validada");
      await load(); router.refresh();
    } catch (reason) {
      setError(message(reason instanceof Error ? reason.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value); setCopied(key); setToast("Copiado");
      setTimeout(() => setCopied(null), 900);
    } catch {
      setError("No pudimos copiar este valor.");
    }
  }

  async function disconnect() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      close(); router.refresh();
    } catch {
      setError("No pudimos desconectar el canal.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button ref={opener} type="button" className="labs-button labs-button-primary" onClick={() => void load()}>Administrar</button>
    {toast ? <div className="labs-toast" role="status">{toast}</div> : null}
    {open ? <div className="labs-modal-backdrop"><section className="labs-connect-modal labs-channel-editor" role="dialog" aria-modal="true" aria-label="Administrar canal">
      <header><div><h2>{channel.accountLabel ?? channel.type}</h2><p>Estado, diagnóstico y configuración de esta conexión.</p></div><button className="labs-icon-button" onClick={close} aria-label="Cerrar"><X /></button></header>
      <div className="labs-channel-editor-body">
        {details ? <>
          <ChannelStatusSummary status={details.status} health={details.health} lastCheckedAt={details.lastSyncedAt} />
          <section className="labs-channel-section"><h3>Estado del canal</h3><ChannelHealthList health={details.health} /></section>
          <section className="labs-channel-section"><h3>Webhook</h3><p>Estos datos se configuran en Meta Developers para que Meta pueda enviar eventos a Vase Labs.</p><Value label="Webhook URL" value={details.webhookUrl} copied={copied} copy={copy} /><Value label="Verify Token" value={details.webhookKey} copied={copied} copy={copy} /></section>
          <section className="labs-channel-section"><h3>Diagnóstico</h3><p>La prueba no guarda cambios.</p><button className="labs-button labs-button-secondary" disabled={busy} onClick={() => void test()}>{busy ? "Probando…" : "Ejecutar diagnóstico"}</button></section>
          <section className="labs-protected-panel"><LockKeyhole /><div><h3>Configuración avanzada</h3><p>IDs, tokens y credenciales sensibles de Meta.</p></div><button className="labs-button labs-button-secondary" onClick={() => setSecurity(true)}>Acceder a configuración avanzada</button></section>
          <section className="labs-danger-zone"><h3>Zona de peligro</h3><p>Desconectar este canal hará que Vase Labs deje de recibir mensajes nuevos desde esta cuenta.</p>{confirm ? <div><strong>¿Desconectar este canal?</strong><button className="labs-button labs-button-secondary" onClick={() => setConfirm(false)}>Cancelar</button><button className="labs-button labs-button-danger" disabled={busy} onClick={() => void disconnect()}>Sí, desconectar</button></div> : <button className="labs-button labs-button-danger" onClick={() => setConfirm(true)}><Trash2 />Desconectar canal</button>}</section>
        </> : null}
        {error ? <p className="labs-form-error" role="alert">{error}</p> : null}
      </div>
    </section>
    {security ? <div className="labs-reauth-shade"><section className="labs-reauth-panel" role="dialog" aria-modal="true"><LockKeyhole /><h3>Verificación de seguridad</h3><p>Ingresá nuevamente tu contraseña de Vase para continuar.</p><label>Contraseña<input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><small>Por seguridad Vase nunca guarda esta contraseña.</small><div><button className="labs-button labs-button-secondary" onClick={clearProtectedState}>Cancelar</button><button className="labs-button labs-button-primary" disabled={!password || busy} onClick={() => void reveal()}>{busy ? "Verificando…" : "Verificar identidad"}</button></div></section></div> : null}
    {advanced ? <div className="labs-reauth-shade"><section className="labs-connect-modal labs-advanced-modal" role="dialog" aria-modal="true"><header><div><h2>Configuración avanzada</h2><p>Sesi&oacute;n protegida</p></div><button className="labs-icon-button" onClick={clearProtectedState} aria-label="Cerrar"><X /></button></header><div className="labs-advanced-fields">
      {channel.type === "INSTAGRAM" ? <p className="labs-form-pending">Tipo de conexión: {isInstagramLogin ? "Instagram Login" : "Instagram mediante Facebook Login"}</p> : null}
      <label>{accountLabel}<input value={account} onChange={(event) => setAccount(event.target.value)} /></label>
      {showParentField ? <label>{labels[channel.type].parent}<input value={parent} onChange={(event) => setParent(event.target.value)} /></label> : null}
      <label>{appLabel}<input value={appId} onChange={(event) => setAppId(event.target.value)} /></label>
      <Secret label="Access Token" value={token} show={showToken} copied={copied} set={setToken} toggle={() => setShowToken(!showToken)} copy={copy} />
      <Secret label={secretLabel} value={secret} show={showSecret} copied={copied} set={setSecret} toggle={() => setShowSecret(!showSecret)} copy={copy} />
      <p className="labs-advanced-warning">Cambiar estas credenciales puede interrumpir la integración con Meta.</p>
    </div><footer><button className="labs-button labs-button-secondary" onClick={clearProtectedState}>Cancelar</button><button className="labs-button labs-button-primary" disabled={busy} onClick={() => void save()}>{busy ? "Validando…" : "Guardar y validar"}</button></footer></section></div> : null}
    </div> : null}
  </>;
}

function Value({ label, value, copied, copy }: { label: string; value: string; copied: string | null; copy: (value: string, key: string) => Promise<void> }) {
  return <label className="labs-readonly-value"><span>{label}</span><div><input readOnly value={value} /><button aria-label={`Copiar ${label}`} className={copied === label ? "is-copied" : ""} onClick={() => void copy(value, label)}>{copied === label ? <Check /> : <Copy />}</button></div></label>;
}

function Secret({ label, value, show, copied, set, toggle, copy }: { label: string; value: string; show: boolean; copied: string | null; set: (value: string) => void; toggle: () => void; copy: (value: string, key: string) => Promise<void> }) {
  return <label className="labs-secret-field">{label}<div><input type={show ? "text" : "password"} value={value} onChange={(event) => set(event.target.value)} /><button aria-label={`${show ? "Ocultar" : "Mostrar"} ${label}`} onClick={toggle}>{show ? <EyeOff /> : <Eye />}</button><button aria-label={`Copiar ${label}`} className={copied === label ? "is-copied" : ""} onClick={() => void copy(value, label)}>{copied === label ? <Check /> : <Copy />}</button></div></label>;
}
