"use client";

import type { LabsChannel } from "@vase/contracts";
import { Check, Copy, Eye, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = { id: string; type: LabsChannel; accountLabel: string | null };
type Details = {
  channelId: string; channelType: LabsChannel; status: string; webhookUrl: string; webhookKey: string;
  providerAccountId: string | null; parentId: string | null; accountLabel: string | null;
  metaAppId: string | null;
  accessTokenMasked: string | null;
  appSecretMasked: string | null;
  health: { webhookVerified: boolean; credentialsPresent: boolean; assetVerified: boolean; subscriptionActive: boolean };
};

const labels: Record<LabsChannel, { account: string; parent?: string }> = {
  WHATSAPP: { account: "Phone Number ID", parent: "WABA ID" },
  INSTAGRAM: { account: "Instagram Professional Account ID", parent: "Facebook Page ID" },
  FACEBOOK: { account: "Facebook Page ID" },
};

function metaConnectionErrorMessage(code: string) {
  if (code === "META_TOKEN_INVALID") return "El Access Token es inválido, venció o pertenece a otra aplicación de Meta.";
  if (code === "META_PERMISSIONS_MISSING") return "El token no tiene todos los permisos requeridos.";
  if (code === "META_ASSET_NOT_AUTHORIZED") return "Los identificadores no pertenecen al activo autorizado por el token.";
  if (code === "META_SUBSCRIPTION_FAILED") return "Meta validó el activo, pero no pudo activar la suscripción de eventos. Revisá que el usuario del sistema tenga control total del WABA, número o página y permiso para administrar webhooks.";
  if (code === "META_APP_ID_MISSING") return "Ingresá el Meta App ID de la aplicación de este cliente.";
  if (code === "META_APP_SECRET_MISSING") return "Ingresá el Meta App Secret de la aplicación que recibe los webhooks. Vase lo guarda cifrado dentro de este canal.";
  if (code === "TOKEN_ENCRYPTION_SECRET_MISSING") return "Falta configurar el secreto interno de cifrado de Labs. El canal del cliente está completo, pero Vase no puede guardar el token cifrado.";
  if (code === "CHANNEL_CREDENTIAL_REENTER_REQUIRED") return "Volvé a pegar el Access Token de este canal. El token guardado fue cifrado con una clave anterior y Vase no puede reutilizarlo.";
  return "Vase no pudo validar el canal con las credenciales cargadas. Revisá el Phone Number ID, WABA ID y Access Token de este canal.";
}

export function ChannelEditModal({ channel }: { channel: Summary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [advanced, setAdvanced] = useState(false), [confirming, setConfirming] = useState(false);
  const [details, setDetails] = useState<Details | null>(null), [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState(""), [parentId, setParentId] = useState(""), [metaAppId, setMetaAppId] = useState(""), [token, setToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [reauthOpen, setReauthOpen] = useState(false), [password, setPassword] = useState(""), [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null), [toast, setToast] = useState<string | null>(null), [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [busy, open]);

  async function load() {
    setOpen(true); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}`); const payload = await response.json();
      if (!response.ok) throw new Error();
      setDetails(payload); setAccountId(payload.providerAccountId ?? ""); setParentId(payload.parentId ?? ""); setMetaAppId(payload.metaAppId ?? ""); setAppSecret("");
    } catch { setError("No pudimos cargar la configuración del canal."); }
    finally { setBusy(false); }
  }
  async function copy(value: string, key: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); setToast("Copiado correctamente"); window.setTimeout(() => setCopied(null), 850); }
    catch { setError("No pudimos copiar este valor."); }
  }
  async function verify() {
    setBusy(true); setError(null);
    try {
      const hasConfigurationChanges = Boolean(token.trim()) || Boolean(appSecret.trim()) || accountId !== (details?.providerAccountId ?? "") || parentId !== (details?.parentId ?? "") || metaAppId !== (details?.metaAppId ?? "");
      const shouldPersistConfiguration = hasConfigurationChanges;
      const connectionBody = { channelType: channel.type, ...(token.trim() ? { accessToken: token.trim() } : {}), ...(metaAppId.trim() ? { metaAppId: metaAppId.trim() } : {}), ...(appSecret.trim() ? { appSecret: appSecret.trim() } : {}), providerAccountId: accountId, parentId: labels[channel.type].parent ? parentId : null };
      const response = shouldPersistConfiguration || details?.status === "ERROR"
        ? await fetch(`/api/labs/channels/${channel.id}/connect`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(connectionBody) })
        : details?.status === "CONNECTED"
          ? await fetch(`/api/v1/channels/${channel.id}/test`, { method: "POST" })
          : await fetch("/api/labs/channels/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelId: channel.id }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setToast(payload.status === "PENDING" ? (payload.message ?? "Credenciales válidas; falta verificar el webhook") : "Conexión comprobada correctamente");
      await load(); router.refresh();
    } catch (reason) { const code = reason instanceof Error ? reason.message : ""; setError(metaConnectionErrorMessage(code)); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true); setError(null);
    try { const response = await fetch(`/api/labs/channels/${channel.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setToast("Canal desconectado"); setOpen(false); router.refresh(); }
    catch { setError("No pudimos desconectar el canal."); }
    finally { setBusy(false); }
  }
  async function revealToken() {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}/reveal-token`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({password}) });
      const payload = await response.json(); if (!response.ok || typeof payload.token !== "string") throw new Error(payload.error);
      setRevealedToken(payload.token); setPassword(""); setToast("Identidad comprobada");
    } catch (reason) { setError(reason instanceof Error && reason.message === "RATE_LIMIT_EXCEEDED" ? "Demasiados intentos. Esperá cinco minutos." : "La contraseña no es correcta."); }
    finally { setBusy(false); }
  }

  const health = details?.health;
  return <>
    <button type="button" className="labs-button labs-button-secondary" onClick={() => void load()}>Editar</button>
    {toast ? <div className="labs-toast" role="status" aria-live="polite"><Check className="size-4" />{toast}</div> : null}
    {open ? <div className="labs-modal-backdrop"><section className="labs-connect-modal labs-channel-editor" role="dialog" aria-modal="true" aria-labelledby="edit-channel-title">
      <header><div><span className="labs-modal-kicker">Canal oficial Meta</span><h2 id="edit-channel-title">Editar {channel.accountLabel ?? channel.type}</h2><p>Revisá el estado, reconectá otra cuenta o actualizá credenciales avanzadas.</p></div><button className="labs-icon-button" onClick={() => setOpen(false)} aria-label="Cerrar"><X className="size-4" /></button></header>
      <div className="labs-channel-editor-body">
        {busy && !details ? <p>Cargando configuración…</p> : details ? <>
          <div className="labs-health-grid">{[["Webhook verificado",health?.webhookVerified],["Credencial guardada",health?.credentialsPresent],["Activo validado",health?.assetVerified],["Suscripción activa",health?.subscriptionActive]].map(([name, ok]) => <span className={ok ? "is-ok" : "is-pending"} key={String(name)}><Check className="size-4" />{name}</span>)}</div>
          <div className="labs-oauth-primary"><strong>Aplicación Meta del cliente</strong><p>Estos valores pertenecen a la aplicación de esta cuenta y se administran desde este canal.</p></div>
          <div className="labs-webhook-values">{[["Webhook URL",details.webhookUrl],["Webhook Key",details.webhookKey]].map(([name,value]) => <div key={name}><span>{name}</span><code>{value}</code><button aria-label={`Copiar ${name}`} className={copied === name ? "is-copied" : ""} onClick={() => void copy(value, name)}>{copied === name ? <Check className="size-4" /> : <Copy className="size-4" />}</button></div>)}</div>
          <button className="labs-advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}><Eye className="size-4" /> {advanced ? "Ocultar configuración avanzada" : "Configuración avanzada"}</button>
          {advanced ? <div className="labs-advanced-fields"><label>{labels[channel.type].account}<input value={accountId} onChange={(e) => setAccountId(e.target.value)} /></label>{labels[channel.type].parent ? <label>{labels[channel.type].parent}<input value={parentId} onChange={(e) => setParentId(e.target.value)} /></label> : null}<label>Meta App ID<input inputMode="numeric" value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)} /></label><label>Access Token<input type="password" autoComplete="off" value={token} placeholder={details.accessTokenMasked ?? "Ingresá un token"} onChange={(e) => setToken(e.target.value)} /></label><label>Meta App Secret<input type="password" autoComplete="new-password" value={appSecret} placeholder={details.appSecretMasked ?? "Ingresá el App Secret"} onChange={(e) => setAppSecret(e.target.value)} /></label>{details.accessTokenMasked ? <button className="labs-button labs-button-secondary" type="button" onClick={() => { setReauthOpen(true); setRevealedToken(null); }}>Ver o copiar token guardado</button> : null}</div> : null}
        </> : null}
        {error ? <p className="labs-form-error" role="alert">{error}</p> : null}
      </div>
      <footer><button className="labs-button labs-button-danger" type="button" onClick={() => confirming ? void disconnect() : setConfirming(true)} disabled={busy}><Trash2 className="size-4" />{confirming ? "Confirmar desconexión" : "Desconectar"}</button><button className="labs-button labs-button-primary" type="button" onClick={() => void verify()} disabled={busy || !details}>{busy ? "Comprobando…" : "Comprobar conexión"}</button></footer>
      {reauthOpen ? <div className="labs-reauth-shade"><section className="labs-reauth-panel" role="dialog" aria-modal="true" aria-labelledby="reauth-title"><h3 id="reauth-title">Confirmá tu identidad</h3><p>Ingresá nuevamente tu contraseña de Vase. No la guardaremos.</p>{revealedToken ? <div className="labs-revealed-token"><code>{revealedToken}</code><button className={copied==="Access Token"?"is-copied":""} aria-label="Copiar Access Token" onClick={() => void copy(revealedToken,"Access Token")}>{copied==="Access Token"?<Check className="size-4"/>:<Copy className="size-4"/>}</button></div> : <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} /></label>}<div><button className="labs-button labs-button-secondary" onClick={()=>{setReauthOpen(false);setRevealedToken(null);setPassword("");}}>Cerrar</button>{!revealedToken?<button className="labs-button labs-button-primary" disabled={!password||busy} onClick={()=>void revealToken()}>Comprobar contraseña</button>:null}</div></section></div> : null}
    </section></div> : null}
  </>;
}
