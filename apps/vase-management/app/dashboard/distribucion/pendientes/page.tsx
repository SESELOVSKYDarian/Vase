'use client'
// app/dashboard/distribucion/pendientes/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Package, Loader2, RefreshCw, MapPin, Truck } from 'lucide-react'

export default function EntregasPendientesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ventas?status=CONFIRMED&limit=100')
      const json = await res.json()
      setSales(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Entregas Pendientes</h1><p className="page-subtitle">Pedidos confirmados sin remito/entrega</p></div>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : sales.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Package size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-muted-foreground text-sm">No hay entregas pendientes 🎉</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium">Pedido</th>
                <th className="table-cell text-left font-medium">Cliente</th>
                <th className="table-cell text-left font-medium hidden md:table-cell">Dirección</th>
                <th className="table-cell text-left font-medium hidden sm:table-cell">Fecha</th>
                <th className="table-cell text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-mono text-xs">{s.number ?? s.id.slice(0,8)}</td>
                  <td className="table-cell font-medium">{s.customer?.name ?? 'Consumidor Final'}</td>
                  <td className="table-cell hidden md:table-cell text-muted-foreground text-xs">
                    {s.customer?.address ? <span className="flex items-center gap-1"><MapPin size={11} />{s.customer.address}</span> : '—'}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-muted-foreground">{formatDate(s.date)}</td>
                  <td className="table-cell text-right font-mono">{formatCurrency(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
