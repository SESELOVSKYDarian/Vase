'use client'
// app/dashboard/distribucion/hoja-ruta/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import {
  Truck, Loader2, RefreshCw, MapPin, CheckCircle2,
  Clock, XCircle, Phone, Navigation
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pendiente', color: 'badge-warning', icon: <Clock size={11} /> },
  DELIVERED: { label: 'Entregado', color: 'badge-success', icon: <CheckCircle2 size={11} /> },
  FAILED: { label: 'No entregado', color: 'badge-error', icon: <XCircle size={11} /> },
}

export default function HojaRutaPage() {
  const [sheets, setSheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchSheets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/distribucion/hoja-ruta?date=${date}`)
      const json = await res.json()
      setSheets(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [date])

  useEffect(() => { fetchSheets() }, [fetchSheets])

  async function updateStopStatus(stopId: string, status: string) {
    setUpdating(stopId)
    try {
      const res = await fetch(`/api/distribucion/paradas/${stopId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toastSuccess(status === 'DELIVERED' ? 'Marcado como entregado' : 'Estado actualizado')
      fetchSheets()
    } catch { toastError('Error al actualizar') }
    finally { setUpdating(null) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Hoja de Ruta</h1><p className="page-subtitle">Seguimiento de entregas del día</p></div>
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none" />
          <button onClick={fetchSheets} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Truck size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No hay hojas de ruta para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map(sheet => {
            const delivered = sheet.stops.filter((s: any) => s.status === 'DELIVERED').length
            const total = sheet.stops.length
            const progress = total > 0 ? (delivered / total) * 100 : 0

            return (
              <div key={sheet.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-orange-600" />
                      <p className="font-semibold">{sheet.route?.name}</p>
                      {sheet.vehicle && <span className="text-xs text-muted-foreground">· {sheet.vehicle}</span>}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{delivered}/{total} entregados</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {sheet.stops.map((stop: any, idx: number) => {
                    const cfg = STATUS_CONFIG[stop.status] ?? STATUS_CONFIG.PENDING
                    return (
                      <div key={stop.id} className="px-5 py-3 flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{stop.sale?.customer?.name ?? 'Cliente'}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {stop.sale?.customer?.address && (
                              <span className="flex items-center gap-1 truncate"><MapPin size={10} />{stop.sale.customer.address}</span>
                            )}
                            {stop.sale?.customer?.phone && (
                              <span className="flex items-center gap-1 flex-shrink-0"><Phone size={10} />{stop.sale.customer.phone}</span>
                            )}
                          </div>
                          {stop.sale?.total && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatCurrency(Number(stop.sale.total))}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('flex items-center gap-1', cfg.color)}>{cfg.icon}{cfg.label}</span>
                          {stop.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateStopStatus(stop.id, 'DELIVERED')}
                                disabled={updating === stop.id}
                                className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center hover:bg-green-100"
                              >
                                {updating === stop.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              </button>
                              <button
                                onClick={() => updateStopStatus(stop.id, 'FAILED')}
                                disabled={updating === stop.id}
                                className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center hover:bg-red-100"
                              >
                                <XCircle size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
