'use client'
// app/dashboard/utilidades/cierre/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { cn } from '@/utils'
import {
  Calendar, CalendarDays, CalendarRange, Loader2,
  CheckCircle2, XCircle, RefreshCw, PlayCircle
} from 'lucide-react'

const CLOSING_TYPES = [
  { type: 'DAY', label: 'Cierre de Día', description: 'Reconcilia caja diaria y resumen de ventas', icon: <Calendar size={20} />, color: 'blue' },
  { type: 'MONTH', label: 'Cierre Mensual', description: 'Recalcula saldos de clientes y cierra el período fiscal', icon: <CalendarDays size={20} />, color: 'amber' },
  { type: 'YEAR', label: 'Cierre Anual', description: 'Recalcula stock completo de todos los productos', icon: <CalendarRange size={20} />, color: 'purple' },
]

export default function CierrePage() {
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/utilidades/cierre')
      const json = await res.json()
      setProcesses(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function runClosing(type: string) {
    if (!confirm(`¿Confirmás ejecutar el ${type === 'DAY' ? 'cierre de día' : type === 'MONTH' ? 'cierre mensual' : 'cierre anual'}? Esta acción recalculará datos del sistema.`)) return
    setRunning(type)
    try {
      const res = await fetch('/api/utilidades/cierre', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Proceso completado', JSON.stringify(json.data.results))
      fetchData()
    } catch (err: any) { toastError('Error en el proceso', err.message) }
    finally { setRunning(null) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Procesos de Cierre</h1><p className="page-subtitle">Cierre de período y recálculo de datos</p></div>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CLOSING_TYPES.map(ct => (
          <div key={ct.type} className="rounded-xl border border-border bg-card p-5">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3',
              ct.color === 'blue' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
              ct.color === 'amber' && 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
              ct.color === 'purple' && 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
            )}>
              {ct.icon}
            </div>
            <p className="font-semibold mb-1">{ct.label}</p>
            <p className="text-xs text-muted-foreground mb-4">{ct.description}</p>
            <button
              onClick={() => runClosing(ct.type)}
              disabled={!!running}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {running === ct.type ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Ejecutar
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="font-semibold text-sm">Historial de procesos</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
        ) : processes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Sin procesos ejecutados todavía</div>
        ) : (
          <div className="divide-y divide-border">
            {processes.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-green-600" /> :
                   p.status === 'FAILED' ? <XCircle size={16} className="text-red-600" /> :
                   <Loader2 size={16} className="text-amber-600 animate-spin" />}
                  <div>
                    <p className="text-sm font-medium">
                      {p.type === 'DAY' ? 'Cierre de día' : p.type === 'MONTH' ? 'Cierre mensual' : 'Cierre anual'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.user?.name} · {new Date(p.startedAt).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                <span className={cn(p.status === 'COMPLETED' ? 'badge-success' : p.status === 'FAILED' ? 'badge-error' : 'badge-warning')}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
