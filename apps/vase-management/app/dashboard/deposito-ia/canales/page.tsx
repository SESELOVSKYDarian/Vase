'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, ExternalLink, LoaderCircle, MessageCircle, RefreshCcw, Send, ShieldCheck } from 'lucide-react'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import type { WarehouseChannel } from '@/components/warehouse/types'
import {
  WarehouseEmptyState,
  WarehouseErrorState,
  WarehousePageHeader,
  WarehousePanel,
  WarehouseStatusBadge,
} from '@/components/warehouse/ui'

type ChannelType = 'WHATSAPP' | 'TELEGRAM'
type ChannelForm = {
  providerAccountId: string
  accessToken: string
  verifyToken: string
  secretToken: string
}
type Notice = { message: string; tone: 'success' | 'warning' | 'danger' }

const emptyForm: ChannelForm = { providerAccountId: '', accessToken: '', verifyToken: '', secretToken: '' }

function formatUpdated(value?: string) {
  if (!value) return 'Sin configuración guardada'
  return `Actualizado ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))}`
}

export default function CanalesPage() {
  const [channels, setChannels] = useState<WarehouseChannel[]>([])
  const [forms, setForms] = useState<Record<ChannelType, ChannelForm>>({ WHATSAPP: { ...emptyForm }, TELEGRAM: { ...emptyForm } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saving, setSaving] = useState<ChannelType | null>(null)
  const [copied, setCopied] = useState<ChannelType | null>(null)

  const loadChannels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await warehouseRequest<WarehouseChannel[]>('/api/warehouse/channels')
      setChannels(data)
      setForms((current) => {
        const next = { ...current }
        data.forEach((channel) => {
          next[channel.type] = {
            ...next[channel.type],
            providerAccountId: channel.providerAccountId || '',
          }
        })
        return next
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadChannels() }, [loadChannels])

  const channelFor = (type: ChannelType) => channels.find((channel) => channel.type === type)

  const updateForm = (type: ChannelType, field: keyof ChannelForm, value: string) => {
    setForms((current) => ({ ...current, [type]: { ...current[type], [field]: value } }))
  }

  const save = async (type: ChannelType) => {
    const existing = channelFor(type)
    const form = forms[type]
    if (type === 'WHATSAPP' && !form.providerAccountId.trim()) {
      return setNotice({ message: 'Ingresá el Phone Number ID de WhatsApp.', tone: 'danger' })
    }
    if (!existing && !form.accessToken.trim()) {
      return setNotice({ message: `Ingresá el token de ${type === 'TELEGRAM' ? 'BotFather' : 'Meta'} para configurar el canal.`, tone: 'danger' })
    }

    setSaving(type)
    setNotice(null)
    try {
      const payload = {
        type,
        providerAccountId: form.providerAccountId.trim() || undefined,
        accessToken: form.accessToken.trim() || undefined,
        verifyToken: form.verifyToken.trim() || undefined,
        secretToken: form.secretToken.trim() || undefined,
      }
      const result = await warehouseRequest<{ warning?: string }>('/api/warehouse/channels', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setForms((current) => ({ ...current, [type]: { ...current[type], accessToken: '', verifyToken: '', secretToken: '' } }))
      setNotice(result.warning
        ? { message: result.warning, tone: 'warning' }
        : { message: `${type === 'WHATSAPP' ? 'WhatsApp' : 'Telegram'} quedó configurado correctamente.`, tone: 'success' })
      await loadChannels()
    } catch (requestError) {
      setNotice({ message: getErrorMessage(requestError), tone: 'danger' })
    } finally {
      setSaving(null)
    }
  }

  const copyWebhook = async (type: ChannelType, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setNotice({ message: 'No se pudo copiar la URL. Seleccionala manualmente.', tone: 'danger' })
    }
  }

  return (
    <div className="warehouse-shell">
      <WarehousePageHeader
        title="Canales de mensajería"
        description="Configurá Telegram y WhatsApp sin duplicar la lógica del depósito ni exponer credenciales guardadas."
        actions={<button type="button" className="ui-button ui-button-secondary" onClick={loadChannels} disabled={loading}><RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar</button>}
      />

      {notice ? <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'ui-badge-success' : notice.tone === 'warning' ? 'ui-badge-warning' : 'ui-badge-danger'}`} role="status">{notice.message}</div> : null}
      {error ? <WarehouseErrorState message={error} onRetry={loadChannels} /> : null}

      {loading && !channels.length ? (
        <div className="grid gap-5 lg:grid-cols-2"><div className="ui-skeleton h-[520px]" /><div className="ui-skeleton h-[520px]" /></div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ChannelCard
            type="WHATSAPP"
            title="WhatsApp Cloud API"
            description="Recibí consultas desde un número de WhatsApp Business."
            icon={MessageCircle}
            channel={channelFor('WHATSAPP')}
            form={forms.WHATSAPP}
            saving={saving === 'WHATSAPP'}
            copied={copied === 'WHATSAPP'}
            update={(field, value) => updateForm('WHATSAPP', field, value)}
            save={() => save('WHATSAPP')}
            copy={(value) => copyWebhook('WHATSAPP', value)}
          />
          <ChannelCard
            type="TELEGRAM"
            title="Telegram Bot"
            description="Atendé consultas del depósito mediante un bot de Telegram."
            icon={Send}
            channel={channelFor('TELEGRAM')}
            form={forms.TELEGRAM}
            saving={saving === 'TELEGRAM'}
            copied={copied === 'TELEGRAM'}
            update={(field, value) => updateForm('TELEGRAM', field, value)}
            save={() => save('TELEGRAM')}
            copy={(value) => copyWebhook('TELEGRAM', value)}
          />
        </div>
      )}

      {!loading && !channels.length ? <WarehousePanel><WarehouseEmptyState icon={ShieldCheck} title="Los canales todavía no están configurados" description="Completá una de las tarjetas para habilitar consultas externas. Guardado no significa conectado: verificá también el webhook en el proveedor." /></WarehousePanel> : null}
    </div>
  )
}

function ChannelCard({
  type,
  title,
  description,
  icon: Icon,
  channel,
  form,
  saving,
  copied,
  update,
  save,
  copy,
}: {
  type: ChannelType
  title: string
  description: string
  icon: typeof MessageCircle
  channel?: WarehouseChannel
  form: ChannelForm
  saving: boolean
  copied: boolean
  update: (field: keyof ChannelForm, value: string) => void
  save: () => void
  copy: (value: string) => void
}) {
  const configured = Boolean(channel)
  return (
    <WarehousePanel>
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon size={21} /></div><div><h2 className="font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div></div>
        <WarehouseStatusBadge tone={configured && channel?.active ? 'success' : 'neutral'}>{configured ? (channel?.active ? 'CONFIGURADO' : 'INACTIVO') : 'SIN CONFIGURAR'}</WarehouseStatusBadge>
      </div>

      <div className="space-y-4 p-5">
        {type === 'WHATSAPP' ? <label className="ui-field"><span className="ui-label">Phone Number ID *</span><input className="input-field" value={form.providerAccountId} onChange={(event) => update('providerAccountId', event.target.value)} placeholder="Ej: 123456789012345" /></label> : null}

        <label className="ui-field"><span className="ui-label">{type === 'TELEGRAM' ? 'Bot Token' : 'Access Token'} {configured ? '' : '*'}</span><input type="password" autoComplete="new-password" className="input-field" value={form.accessToken} onChange={(event) => update('accessToken', event.target.value)} placeholder={configured ? 'Dejar vacío para conservar el token actual' : type === 'TELEGRAM' ? 'Token entregado por @BotFather' : 'Token permanente de Meta'} /><span className="ui-field-hint">Por seguridad, el servidor nunca devuelve el token guardado.</span></label>

        {type === 'WHATSAPP' ? <label className="ui-field"><span className="ui-label">Verify Token</span><input type="password" autoComplete="new-password" className="input-field" value={form.verifyToken} onChange={(event) => update('verifyToken', event.target.value)} placeholder={configured ? 'Dejar vacío para conservar' : 'Token elegido para verificar el webhook'} /></label> : null}

        <label className="ui-field"><span className="ui-label">{type === 'WHATSAPP' ? 'App Secret (HMAC)' : 'Secret Token (opcional)'}</span><input type="password" autoComplete="new-password" className="input-field" value={form.secretToken} onChange={(event) => update('secretToken', event.target.value)} placeholder={configured ? 'Dejar vacío para conservar' : 'Secreto para validar mensajes entrantes'} /></label>

        {channel?.webhookUrl ? <div className="rounded-xl border border-border bg-muted/50 p-3"><p className="text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">Webhook público</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs text-foreground">{channel.webhookUrl}</code><button type="button" className="ui-icon-button shrink-0" onClick={() => copy(channel.webhookUrl!)} aria-label={`Copiar webhook de ${title}`}>{copied ? <Check size={17} className="text-primary" /> : <Clipboard size={17} />}</button></div></div> : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs text-muted-foreground">{formatUpdated(channel?.updatedAt)}</p>{configured ? <p className="mt-1 text-xs font-medium text-orange-700 dark:text-orange-300">Configurado no garantiza que el proveedor haya validado el webhook.</p> : null}</div>
          <button type="button" className="ui-button ui-button-primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}{saving ? 'Guardando…' : `Guardar ${type === 'WHATSAPP' ? 'WhatsApp' : 'Telegram'}`}</button>
        </div>

        {type === 'TELEGRAM' ? <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ExternalLink size={15} /> Abrir @BotFather</a> : null}
      </div>
    </WarehousePanel>
  )
}
