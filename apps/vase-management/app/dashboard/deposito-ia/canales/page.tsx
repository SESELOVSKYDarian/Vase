'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, ExternalLink, LoaderCircle, MessageCircle, RefreshCcw, Send, ShieldCheck, Wifi } from 'lucide-react'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import type { WarehouseChannel } from '@/components/warehouse/types'
import { WarehouseEmptyState, WarehouseErrorState, WarehousePageHeader, WarehousePanel, WarehouseStatusBadge } from '@/components/warehouse/ui'

type ChannelType = 'WHATSAPP' | 'TELEGRAM'
type ChannelForm = { providerAccountId: string; wabaId: string; metaAppId: string; accessToken: string; verifyToken: string; secretToken: string }
type Notice = { message: string; tone: 'success' | 'warning' | 'danger' }
type Health = { connected: boolean; checks: Record<'webhookVerified' | 'credentials' | 'assetVerified' | 'subscriptionActive', boolean>; displayPhoneNumber: string | null; verifiedName: string | null; graphError: string | null }

const emptyForm: ChannelForm = { providerAccountId: '', wabaId: '', metaAppId: '', accessToken: '', verifyToken: '', secretToken: '' }

export default function CanalesPage() {
  const [channels, setChannels] = useState<WarehouseChannel[]>([])
  const [forms, setForms] = useState<Record<ChannelType, ChannelForm>>({ WHATSAPP: { ...emptyForm }, TELEGRAM: { ...emptyForm } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saving, setSaving] = useState<ChannelType | null>(null)
  const [checking, setChecking] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const loadChannels = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await warehouseRequest<WarehouseChannel[]>('/api/warehouse/channels')
      setChannels(data)
      setForms((current) => {
        const next = { ...current }
        data.forEach((channel) => { next[channel.type] = { ...next[channel.type], providerAccountId: channel.providerAccountId || '', wabaId: channel.wabaId || '', metaAppId: channel.metaAppId || '' } })
        return next
      })
    } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadChannels() }, [loadChannels])
  const channelFor = (type: ChannelType) => channels.find((channel) => channel.type === type)
  const updateForm = (type: ChannelType, field: keyof ChannelForm, value: string) => setForms((current) => ({ ...current, [type]: { ...current[type], [field]: value } }))

  const save = async (type: ChannelType) => {
    const existing = channelFor(type); const form = forms[type]
    if (type === 'WHATSAPP' && !form.providerAccountId.trim()) return setNotice({ message: 'Ingresá el Phone Number ID de WhatsApp.', tone: 'danger' })
    if (!existing && !form.accessToken.trim()) return setNotice({ message: 'Ingresá el token de Meta para configurar el canal.', tone: 'danger' })
    setSaving(type); setNotice(null)
    try {
      const result = await warehouseRequest<{ warning?: string }>('/api/warehouse/channels', { method: 'POST', body: JSON.stringify({ type, providerAccountId: form.providerAccountId.trim() || undefined, wabaId: form.wabaId.trim() || undefined, metaAppId: form.metaAppId.trim() || undefined, accessToken: form.accessToken.trim() || undefined, verifyToken: form.verifyToken.trim() || undefined, secretToken: form.secretToken.trim() || undefined }) })
      setForms((current) => ({ ...current, [type]: { ...current[type], accessToken: '', verifyToken: '', secretToken: '' } }))
      setNotice(result.warning ? { message: result.warning, tone: 'warning' } : { message: 'WhatsApp quedó guardado. Ahora comprobá la conexión.', tone: 'success' })
      await loadChannels()
    } catch (requestError) { setNotice({ message: getErrorMessage(requestError), tone: 'danger' }) } finally { setSaving(null) }
  }

  const checkWhatsApp = async () => {
    setChecking(true); setNotice(null)
    try { setHealth(await warehouseRequest<Health>('/api/warehouse/channels/whatsapp/check', { method: 'POST' })); setNotice({ message: 'Estado de Meta actualizado.', tone: 'success' }) }
    catch (requestError) { setNotice({ message: getErrorMessage(requestError), tone: 'danger' }) } finally { setChecking(false) }
  }

  const copy = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(null), 1800) }
    catch { setNotice({ message: 'No se pudo copiar. Seleccioná el valor manualmente.', tone: 'danger' }) }
  }

  return <div className="warehouse-shell">
    <WarehousePageHeader title="Canales de mensajería" description="Conectá un número oficial de WhatsApp y usá el mismo servicio del depósito para encender el ESP32." actions={<button type="button" className="ui-button ui-button-secondary" onClick={loadChannels} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar</button>} />
    {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'ui-badge-success' : notice.tone === 'warning' ? 'ui-badge-warning' : 'ui-badge-danger'}`} role="status">{notice.message}</div> : null}
    {error ? <WarehouseErrorState message={error} onRetry={loadChannels} /> : null}
    {loading && !channels.length ? <div className="grid gap-5 lg:grid-cols-2"><div className="ui-skeleton h-[640px]" /><div className="ui-skeleton h-[520px]" /></div> : <div className="grid items-start gap-5 lg:grid-cols-2"><WhatsAppCard channel={channelFor('WHATSAPP')} form={forms.WHATSAPP} health={health} saving={saving === 'WHATSAPP'} checking={checking} update={(field, value) => updateForm('WHATSAPP', field, value)} save={() => save('WHATSAPP')} check={checkWhatsApp} copy={copy} copied={copied} /><TelegramCard channel={channelFor('TELEGRAM')} form={forms.TELEGRAM} saving={saving === 'TELEGRAM'} update={(field, value) => updateForm('TELEGRAM', field, value)} save={() => save('TELEGRAM')} copy={copy} copied={copied} /></div>}
    {!loading && !channels.length ? <WarehousePanel><WarehouseEmptyState icon={ShieldCheck} title="Los canales todavía no están configurados" description="Guardá WhatsApp y copiá el webhook en Meta Developers para comenzar." /></WarehousePanel> : null}
  </div>
}

function WhatsAppCard({ channel, form, health, saving, checking, update, save, check, copy, copied }: { channel?: WarehouseChannel; form: ChannelForm; health: Health | null; saving: boolean; checking: boolean; update: (field: keyof ChannelForm, value: string) => void; save: () => void; check: () => void; copy: (key: string, value: string) => void; copied: string | null }) {
  const checks = health?.checks
  return <WarehousePanel><div className="flex items-start justify-between gap-4 border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><MessageCircle size={21} /></div><div><h2 className="font-semibold text-foreground">WhatsApp Cloud API</h2><p className="mt-1 text-sm text-muted-foreground">Conectá el número oficial de Meta al Depósito IA.</p></div></div><WarehouseStatusBadge tone={health?.connected ? 'success' : channel?.active ? 'warning' : 'neutral'}>{health?.connected ? 'CONECTADO' : channel?.active ? 'CONFIGURADO' : 'SIN CONFIGURAR'}</WarehouseStatusBadge></div><div className="space-y-4 p-5">
    {health ? <div className="grid grid-cols-2 gap-2">{[['webhookVerified', 'Webhook verificado'], ['credentials', 'Credencial guardada'], ['assetVerified', 'Número validado'], ['subscriptionActive', 'Suscripción activa']].map(([key, label]) => <div key={key} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${checks?.[key as keyof Health['checks']] ? 'ui-badge-success' : 'ui-badge-danger'}`}>{checks?.[key as keyof Health['checks']] ? '✓' : '!'} {label}</div>)}</div> : null}
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4"><p className="text-sm font-semibold">Aplicación Meta del cliente</p><p className="mt-1 text-xs text-muted-foreground">Estos valores se guardan por empresa y se usan para validar el número y la suscripción.</p></div>
    <Field label="Phone Number ID *" value={form.providerAccountId} onChange={(value) => update('providerAccountId', value)} placeholder="Ej: 123456789012345" /><div className="grid gap-4 sm:grid-cols-2"><Field label="WABA ID" value={form.wabaId} onChange={(value) => update('wabaId', value)} placeholder="WhatsApp Business Account ID" /><Field label="Meta App ID" value={form.metaAppId} onChange={(value) => update('metaAppId', value)} placeholder="ID de la aplicación Meta" /></div>
    <Field label="Access Token" type="password" value={form.accessToken} onChange={(value) => update('accessToken', value)} placeholder={channel ? 'Dejar vacío para conservar el token' : 'Token permanente de Meta'} hint="Nunca se devuelve al navegador una vez guardado." /><div className="grid gap-4 sm:grid-cols-2"><Field label="Verify Token" type="password" value={form.verifyToken} onChange={(value) => update('verifyToken', value)} placeholder={channel ? 'Dejar vacío para conservar' : 'Token que vas a poner en Meta'} /><Field label="App Secret (HMAC)" type="password" value={form.secretToken} onChange={(value) => update('secretToken', value)} placeholder={channel ? 'Dejar vacío para conservar' : 'App Secret de Meta'} /></div>
    {channel?.webhookUrl ? <CopyRow label="Webhook URL" value={channel.webhookUrl} copy={() => copy('url', channel.webhookUrl!)} copied={copied === 'url'} /> : null}{channel?.webhookKey ? <CopyRow label="Webhook Key / Verify Token" value={channel.webhookKey} copy={() => copy('key', channel.webhookKey!)} copied={copied === 'key'} /> : null}{health?.displayPhoneNumber ? <p className="text-xs text-muted-foreground">Número validado: <strong>{health.displayPhoneNumber}</strong>{health.verifiedName ? ` · ${health.verifiedName}` : ''}</p> : null}{health?.graphError ? <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-800 dark:text-red-200">{health.graphError}</p> : null}
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between"><button type="button" className="ui-button ui-button-secondary" onClick={check} disabled={checking || !channel}>{checking ? <LoaderCircle size={16} className="animate-spin" /> : <Wifi size={16} />} Comprobar conexión</button><button type="button" className="ui-button ui-button-primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {saving ? 'Guardando...' : 'Guardar WhatsApp'}</button></div><p className="text-xs leading-5 text-muted-foreground">En Meta Developers usá el Webhook URL y el Webhook Key. Suscribí el campo <code>messages</code>. Luego, cuando envíes “dónde está PC06”, el sistema responderá y dejará el LED en la cola del ESP32.</p>
  </div></WarehousePanel>
}

function TelegramCard({ channel, form, saving, update, save, copy, copied }: { channel?: WarehouseChannel; form: ChannelForm; saving: boolean; update: (field: keyof ChannelForm, value: string) => void; save: () => void; copy: (key: string, value: string) => void; copied: string | null }) {
  return <WarehousePanel><div className="flex items-start justify-between gap-4 border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Send size={21} /></div><div><h2 className="font-semibold">Telegram Bot</h2><p className="mt-1 text-sm text-muted-foreground">Consultas del depósito mediante un bot.</p></div></div><WarehouseStatusBadge tone={channel?.active ? 'success' : 'neutral'}>{channel?.active ? 'CONFIGURADO' : 'SIN CONFIGURAR'}</WarehouseStatusBadge></div><div className="space-y-4 p-5"><Field label="Bot Token" type="password" value={form.accessToken} onChange={(value) => update('accessToken', value)} placeholder={channel ? 'Dejar vacío para conservar' : 'Token de @BotFather'} /><Field label="Secret Token opcional" type="password" value={form.secretToken} onChange={(value) => update('secretToken', value)} placeholder="Secreto del webhook" />{channel?.webhookUrl ? <CopyRow label="Webhook URL" value={channel.webhookUrl} copy={() => copy('telegram-url', channel.webhookUrl!)} copied={copied === 'telegram-url'} /> : null}<div className="flex justify-between border-t border-border pt-4"><a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ExternalLink size={15} /> Abrir @BotFather</a><button type="button" className="ui-button ui-button-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Telegram'}</button></div></div></WarehousePanel>
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; hint?: string }) { return <label className="ui-field"><span className="ui-label">{label}</span><input className="input-field" type={type} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{hint ? <span className="ui-field-hint">{hint}</span> : null}</label> }
function CopyRow({ label, value, copy, copied }: { label: string; value: string; copy: () => void; copied: boolean }) { return <div className="rounded-xl border border-border bg-muted/50 p-3"><p className="text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">{label}</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-foreground">{value}</code><button type="button" className="ui-icon-button shrink-0" onClick={copy} aria-label={`Copiar ${label}`}>{copied ? <Check size={17} className="text-primary" /> : <Clipboard size={17} />}</button></div></div> }
