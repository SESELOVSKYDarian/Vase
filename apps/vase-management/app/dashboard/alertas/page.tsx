'use client'
// app/dashboard/alertas/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { cn } from '@/utils'
import {
  Bell, AlertTriangle, Info, AlertCircle, CheckCircle,
  Loader2, RefreshCw, X, Zap, Filter
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  COBRO_PROXIMO: 'Cobro próximo',
  PAGO_PROXIMO: 'Pago próximo',
  FACTURA_VENCIDA: 'Factura vencida',
  STOCK_BAJO: 'Stock bajo',
  PRODUCTO_POR_VENCER: 'Por vencer',
  CUMPLEANOS_CLIENTE: 'Cumpleaños',
  LIMITE_CREDITO: 'Límite crédito',
  MENSAJE_INTERNO: 'Mensaje interno',
  SISTEMA: 'Sistema',
}

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  INFO: { icon: <Info size={15} />, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  WARNING: { icon: <AlertTriangle size={15} />, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  ERROR: { icon: <AlertCircle size={15} />, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
  CRITICAL: { icon: <AlertCircle size={15} />, bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-400 dark:border-red-700', text: 'text-red-800 dark:text-red-200' },
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterType, setFilterType] = useState('')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      const res = await fetch(`/api/alertas?${params}`)
      const json = await res.json()
      setAlerts(json.data ?? [])
    } catch { toastError('Error al cargar alertas') }
    finally { setLoading(false) }
  }, [filterType])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  async function generateAlerts() {
    setGenerating(true)
    try {
      const res = await fetch('/api/alertas', { method: 'POST' })
      const json = await res.json()
      toastSuccess('Alertas generadas', `${json.created} nuevas alertas`)
      fetchAlerts()
    } catch { toastError('Error al generar alertas') }
    finally { setGenerating(false) }
  }

  async function dismiss(id: string) {
    try {
      await fetch(`/api/alertas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true }),
      })
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch { toastError('Error al descartar') }
  }

  async function markAllRead() {
    try {
      await Promise.all(alerts.filter(a => !a.isRead).map(a =>
        fetch(`/api/alertas/${a.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
      ))
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
      toastSuccess('Todas marcadas como leídas')
    } catch { toastError('Error') }
  }

  const grouped = alerts.reduce<Record<string, any[]>>((acc, alert) => {
    const key = alert.severity
    if (!acc[key]) acc[key] = []
    acc[key].push(alert)
    return acc
  }, {})

  const severityOrder = ['CRITICAL', 'ERROR', 'WARNING', 'INFO']
  const unreadCount = alerts.filter(a => !a.isRead).length

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell size={20} />
            Alertas del Sistema
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-1">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="page-subtitle">Notificaciones automáticas sobre tu empresa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="h-9 flex items-center gap-2 px-3 rounded-lg border border-border text-sm hover:bg-muted">
              <CheckCircle size={14} />Marcar leídas
            </button>
          )}
          <button onClick={fetchAlerts} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={generateAlerts}
            disabled={generating}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Generar alertas
          </button>
        </div>
      </div>

      {/* Filtro por tipo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            filterType === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted text-muted-foreground'
          )}
        >
          Todas ({alerts.length})
        </button>
        {Object.entries(TYPE_LABELS).map(([type, label]) => {
          const count = alerts.filter(a => a.type === type).length
          if (count === 0) return null
          return (
            <button key={type} onClick={() => setFilterType(type === filterType ? '' : type)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filterType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted text-muted-foreground'
              )}>
              {label} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-4" />
          <p className="font-semibold text-green-700 dark:text-green-400">¡Sin alertas activas!</p>
          <p className="text-muted-foreground text-sm mt-1">Tu empresa está al día. Generá alertas para revisar el estado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {severityOrder.map(severity => {
            const group = (filterType ? alerts.filter(a => a.type === filterType) : grouped[severity]) ?? []
            if (!group.length) return null
            const cfg = SEVERITY_CONFIG[severity]
            return (
              <div key={severity}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full', cfg.text)}>
                    {cfg.icon}
                  </span>
                  {severity} — {group.length} alerta{group.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-2">
                  {group.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-xl border transition-all',
                        cfg.bg, cfg.border,
                        !alert.isRead && 'ring-1 ring-current ring-opacity-30',
                        alert.isRead && 'opacity-75'
                      )}
                    >
                      <span className={cn('mt-0.5 flex-shrink-0', cfg.text)}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('font-semibold text-sm', cfg.text)}>{alert.title}</p>
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-black/20', cfg.text)}>
                            {TYPE_LABELS[alert.type] ?? alert.type}
                          </span>
                          {!alert.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                          )}
                        </div>
                        <p className={cn('text-xs mt-1', cfg.text, 'opacity-80')}>{alert.message}</p>
                        <p className={cn('text-[10px] mt-1.5', cfg.text, 'opacity-50')}>
                          {new Date(alert.createdAt).toLocaleString('es-AR')}
                        </p>
                      </div>
                      <button
                        onClick={() => dismiss(alert.id)}
                        className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/20 dark:hover:bg-black/20', cfg.text)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
