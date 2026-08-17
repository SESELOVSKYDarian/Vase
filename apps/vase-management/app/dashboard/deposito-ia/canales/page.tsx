'use client'
import { useState, useEffect } from 'react'
import { MessageSquare, Send, Check, AlertCircle, Copy, ExternalLink } from 'lucide-react'

type ChannelConfig = {
  id?: string
  type: 'WHATSAPP' | 'TELEGRAM'
  providerAccountId: string
  accessToken: string
  verifyToken: string
  secretToken: string
  webhookUrl?: string
  active?: boolean
}

const EMPTY_CONFIG: Omit<ChannelConfig, 'type'> = {
  providerAccountId: '',
  accessToken: '',
  verifyToken: '',
  secretToken: '',
}

export default function CanalesPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [whatsapp, setWhatsapp] = useState<ChannelConfig>({ type: 'WHATSAPP', ...EMPTY_CONFIG })
  const [telegram, setTelegram] = useState<ChannelConfig>({ type: 'TELEGRAM', ...EMPTY_CONFIG })
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/warehouse/channels')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChannels(data)
          const wa = data.find((c: any) => c.type === 'WHATSAPP')
          const tg = data.find((c: any) => c.type === 'TELEGRAM')
          if (wa) setWhatsapp(prev => ({ ...prev, ...wa }))
          if (tg) setTelegram(prev => ({ ...prev, ...tg }))
        }
      })
  }, [])

  const save = async (config: ChannelConfig) => {
    setSaving(config.type)
    setSuccess(null)
    setError(null)

    try {
      const res = await fetch('/api/warehouse/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(`Canal ${config.type} configurado correctamente.`)
        if (config.type === 'WHATSAPP') setWhatsapp(prev => ({ ...prev, webhookUrl: data.webhookUrl }))
        if (config.type === 'TELEGRAM') setTelegram(prev => ({ ...prev, webhookUrl: data.webhookUrl }))
      }
    } catch {
      setError('Error al guardar la configuración')
    } finally {
      setSaving(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Canales de Mensajería</h1>
          <p className="page-subtitle">
            Configurá los bots de WhatsApp y Telegram para interactuar con el depósito por chat
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ─── WhatsApp ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">WhatsApp Cloud API</h2>
            <p className="text-sm text-gray-500">
              Conectá un número de WhatsApp Business para recibir consultas de depósito
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
            <input
              type="text"
              value={whatsapp.providerAccountId}
              onChange={e => setWhatsapp(prev => ({ ...prev, providerAccountId: e.target.value }))}
              placeholder="Ej: 123456789012345"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
            <input
              type="password"
              value={whatsapp.accessToken}
              onChange={e => setWhatsapp(prev => ({ ...prev, accessToken: e.target.value }))}
              placeholder="Token permanente de la app Meta"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
            <input
              type="text"
              value={whatsapp.verifyToken}
              onChange={e => setWhatsapp(prev => ({ ...prev, verifyToken: e.target.value }))}
              placeholder="Token de verificación del webhook"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">Inventalo vos; después lo ponés igual en Meta App Dashboard.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Secret (HMAC)</label>
            <input
              type="password"
              value={whatsapp.secretToken}
              onChange={e => setWhatsapp(prev => ({ ...prev, secretToken: e.target.value }))}
              placeholder="App Secret de la Meta App"
              className="input-field w-full"
            />
          </div>
        </div>

        {whatsapp.webhookUrl && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">URL del Webhook (copiá esto en Meta App Dashboard)</p>
              <code className="text-sm text-gray-800 select-all">{whatsapp.webhookUrl}</code>
            </div>
            <button onClick={() => copyToClipboard(whatsapp.webhookUrl!)} className="text-gray-400 hover:text-gray-600" title="Copiar">
              <Copy size={16} />
            </button>
          </div>
        )}

        <button
          onClick={() => save(whatsapp)}
          disabled={saving === 'WHATSAPP'}
          className="btn-primary flex items-center gap-2"
        >
          <Send size={16} /> {saving === 'WHATSAPP' ? 'Guardando...' : 'Guardar WhatsApp'}
        </button>
      </div>

      {/* ─── Telegram ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Send size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Telegram Bot</h2>
            <p className="text-sm text-gray-500">
              Conectá un bot de Telegram para recibir consultas de depósito
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
            <input
              type="password"
              value={telegram.accessToken}
              onChange={e => setTelegram(prev => ({ ...prev, accessToken: e.target.value }))}
              placeholder="Token de @BotFather"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Token (opcional)</label>
            <input
              type="text"
              value={telegram.secretToken}
              onChange={e => setTelegram(prev => ({ ...prev, secretToken: e.target.value }))}
              placeholder="Se envía como header X-Telegram-Bot-Api-Secret-Token"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">Inventalo vos; se usará para validar que los updates son reales.</p>
          </div>
        </div>

        {telegram.webhookUrl && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">URL del Webhook (se registra automáticamente con Telegram)</p>
              <code className="text-sm text-gray-800 select-all">{telegram.webhookUrl}</code>
            </div>
            <button onClick={() => copyToClipboard(telegram.webhookUrl!)} className="text-gray-400 hover:text-gray-600" title="Copiar">
              <Copy size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => save(telegram)}
            disabled={saving === 'TELEGRAM'}
            className="btn-primary flex items-center gap-2"
          >
            <Send size={16} /> {saving === 'TELEGRAM' ? 'Guardando...' : 'Guardar Telegram'}
          </button>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <ExternalLink size={14} /> Crear bot con @BotFather
          </a>
        </div>
      </div>
    </div>
  )
}
