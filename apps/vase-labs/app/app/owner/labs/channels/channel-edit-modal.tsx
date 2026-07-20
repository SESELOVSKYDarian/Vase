"use client";

import type { LabsChannel } from "@vase/contracts";
import { Check, Copy, Eye, Link2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = { id: string; type: LabsChannel; accountLabel: string | null };
type Details = {
  channelId: string; channelType: LabsChannel; webhookUrl: string; webhookKey: string;
  providerAccountId: string | null; parentId: string | null; accountLabel: string | null;
  accessTokenMasked: string | null;
  health: { webhookVerified: boolean; credentialsPresent: boolean; assetVerified: boolean; subscriptionActive: boolean };
};

const labels: Record<LabsChannel, { account: string; parent?: string }> = {
  WHATSAPP: { account: "Phone Number ID", parent: "WABA ID" },
  INSTAGRAM: { account: "Instagram Professional Account ID", parent: "Facebook Page ID" },
  FACEBOOK: { account: "Facebook Page ID" },
};

export function ChannelEditModal({ channel }: { channel: Summary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [advanced, setAdvanced] = useState(false), [confirming, setConfirming] = useState(false);
  const [details, setDetails] = useState<Details | null>(null), [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState(""), [parentId, setParentId] = useState(""), [token, setToken] = useState("");
  const [reauthOpen, setReauthOpen] = useState(false), [password, setPassword] = useState(""), [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null), [toast, setToast] = useState<string | null>(null), [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [busy, open]);

  async function load() {
    setOpen(true); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/labs/channels/${channel.id}`); const payload = await response.json();
      if (!response.ok) throw new Error();
      setDetails(payload); setAccountId(payload.providerAccountId ?? ""); setParentId(payload.parentId ?? "");
    } catch { setError("No pudimos cargar la configuración del canal."); }
    finally { setBusy(false); }
  }
  async function copy(value: string, key: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); setToast("Copiado correctamente"); window.setTimeout(() => setCopied(null), 850); }
    catch { setError("No pudimos copiar este valor."); }
  }
  async function oauth() {
    setBusy(true); setError(null);
    try { const response = await fetch("/api/v1/meta/connections/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelType: channel.type }) }); const payload = await response.json(); if (!response.ok || !payload.authorizationUrl) throw new Error(); window.location.assign(payload.authorizationUrl); }
    catch { setError("No pudimos iniciar la conexión con Meta."); setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError(null);
    try {
      const hasConfigurationChanges = Boolean(token.trim()) || accountId !== (details?.providerAccountId ?? "") || parentId !== (details?.parentId ?? "");
      const shouldPersistConfiguration = advanced || hasConfigurationChanges;
      const response = shouldPersistConfiguration ? await fetch(`/api/labs/channels/${channel.id}/connect`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channelType: channel.type, ...(token.trim() ? { accessToken: token.trim() } : {}), providerAccountId: accountId, parentId: labels[channel.type].parent ? parentId : null }) }) : await fetch(`/api/v1/channels/${channel.id}/test`, { method: "POST" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setToast(payload.status === "PENDING" ? "Credenciales válidas; falta verificar el webhook" : "Conexión comprobada correctamente");
      await load(); router.refresh();
    } catch (reason) { const code = reason instanceof Error ? reason.message : ""; setError(code === "META_TOKEN_INVALID" ? "El Access Token es inválido, venció o pertenece a otra aplicación de Meta." : code === "META_PERMISSIONS_MISSING" ? "El token no tiene todos los permisos requeridos." : code === "META_ASSET_NOT_AUTHORIZED" ? "Los identificadores no pertenecen al activo autorizado por el token." : "Meta rechazó el acceso al activo. Revisá las asignaciones del usuario del sistema."); }
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
          <div className="labs-health-grid">{[["Webhook verificado",health?.webhookVerified],["Credencial válida",health?.credentialsPresent],["Activo validado",health?.assetVerified],["Suscripción activa",health?.subscriptionActive]].map(([name, ok]) => <span className={ok ? "is-ok" : "is-pending"} key={String(name)}><Check className="size-4" />{name}</span>)}</div>
          <button className="labs-button labs-button-primary" type="button" onClick={() => void oauth()} disabled={busy}><Link2 className="size-4" /> Reconectar con Meta</button>
          <div className="labs-webhook-values">{[["Webhook URL",details.webhookUrl],["Webhook Key",details.webhookKey]].map(([name,value]) => <div key={name}><span>{name}</span><code>{value}</code><button aria-label={`Copiar ${name}`} className={copied === name ? "is-copied" : ""} onClick={() => void copy(value, name)}>{copied === name ? <Check className="size-4" /> : <Copy className="size-4" />}</button></div>)}</div>
          <button className="labs-advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}><Eye className="size-4" /> {advanced ? "Ocultar configuración avanzada" : "Configuración avanzada"}</button>
          {advanced ? <div className="labs-advanced-fields"><label>{labels[channel.type].account}<input value={accountId} onChange={(e) => setAccountId(e.target.value)} /></label>{labels[channel.type].parent ? <label>{labels[channel.type].parent}<input value={parentId} onChange={(e) => setParentId(e.target.value)} /></label> : null}<label>Access Token<input type="password" autoComplete="off" value={token} placeholder={details.accessTokenMasked ?? "Ingresá un token"} onChange={(e) => setToken(e.target.value)} /></label>{details.accessTokenMasked ? <button className="labs-button labs-button-secondary" type="button" onClick={() => { setReauthOpen(true); setRevealedToken(null); }}>Ver o copiar token guardado</button> : null}</div> : null}
        </> : null}
        {error ? <p className="labs-form-error" role="alert">{error}</p> : null}
      </div>
      <footer><button className="labs-button labs-button-danger" type="button" onClick={() => confirming ? void disconnect() : setConfirming(true)} disabled={busy}><Trash2 className="size-4" />{confirming ? "Confirmar desconexión" : "Desconectar"}</button><button className="labs-button labs-button-primary" type="button" onClick={() => void verify()} disabled={busy || !details}>{busy ? "Comprobando…" : "Comprobar conexión"}</button></footer>
      {reauthOpen ? <div className="labs-reauth-shade"><section className="labs-reauth-panel" role="dialog" aria-modal="true" aria-labelledby="reauth-title"><h3 id="reauth-title">Confirmá tu identidad</h3><p>Ingresá nuevamente tu contraseña de Vase. No la guardaremos.</p>{revealedToken ? <div className="labs-revealed-token"><code>{revealedToken}</code><button className={copied==="Access Token"?"is-copied":""} aria-label="Copiar Access Token" onClick={() => void copy(revealedToken,"Access Token")}>{copied==="Access Token"?<Check className="size-4"/>:<Copy className="size-4"/>}</button></div> : <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} /></label>}<div><button className="labs-button labs-button-secondary" onClick={()=>{setReauthOpen(false);setRevealedToken(null);setPassword("");}}>Cerrar</button>{!revealedToken?<button className="labs-button labs-button-primary" disabled={!password||busy} onClick={()=>void revealToken()}>Comprobar contraseña</button>:null}</div></section></div> : null}
    </section></div> : null}
  </>;
}
