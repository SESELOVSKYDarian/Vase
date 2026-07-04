// components/modules/stock/MovimientosStock.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatNumber, cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Loader2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Settings2, RefreshCw, History } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Salida', ADJUSTMENT: 'Ajuste',
  TRANSFER_IN: 'Transfer. entrada', TRANSFER_OUT: 'Transfer. salida',
  SALE: 'Venta', PURCHASE: 'Compra', RETURN: 'Devolución',
}

const TYPE_STYLES: Record<string, string> = {
  ENTRY: 'badge-success', EXIT: 'badge-error', ADJUSTMENT: 'badge-info',
  TRANSFER_IN: 'badge-info', TRANSFER_OUT: 'badge-warning',
  SALE: 'badge-error', PURCHASE: 'badge-success', RETURN: 'badge-warning',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ENTRY: <ArrowUp size={12} />, EXIT: <ArrowDown size={12} />, ADJUSTMENT: <Settings2 size={12} />,
  TRANSFER_IN: <ArrowUp size={12} />, TRANSFER_OUT: <ArrowDown size={12} />,
  SALE: <ArrowDown size={12} />, PURCHASE: <ArrowUp size={12} />, RETURN: <ArrowUp size={12} />,
}

export function MovimientosStock() {
  const [movements, setMovements] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      const res = await fetch(`/api/stock/movimientos?${params}`)
      const json = await res.json()
      setMovements(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch { toastError('Error al cargar movimientos') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{total} movimiento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Producto</th>
              <th className="table-cell text-center font-medium">Tipo</th>
              <th className="table-cell text-right font-medium">Cantidad</th>
              <th className="table-cell text-right font-medium hidden sm:table-cell">Stock ant.</th>
              <th className="table-cell text-right font-medium hidden sm:table-cell">Stock nuevo</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Depósito</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">Notas</th>
              <th className="table-cell text-left font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan={8} className="table-cell text-center py-16">
                <History size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay movimientos registrados</p>
              </td></tr>
            ) : movements.map((m) => {
              const isPositive = ['ENTRY', 'PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT'].includes(m.type)
              return (
                <tr key={m.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium text-sm">{m.product?.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{m.product?.code}</p>
                  </td>
                  <td className="table-cell text-center">
                    <span className={cn('inline-flex items-center gap-1', TYPE_STYLES[m.type] ?? 'badge-neutral')}>
                      {TYPE_ICONS[m.type]}
                      {TYPE_LABELS[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={cn('font-bold font-mono', isPositive ? 'text-green-600' : 'text-red-600')}>
                      {isPositive ? '+' : '-'}{formatNumber(m.quantity, 2)} {m.product?.unit}
                    </span>
                  </td>
                  <td className="table-cell text-right hidden sm:table-cell font-mono text-muted-foreground text-xs">
                    {formatNumber(m.previousStock, 0)}
                  </td>
                  <td className="table-cell text-right hidden sm:table-cell font-mono font-bold text-xs">
                    {formatNumber(m.newStock, 0)}
                  </td>
                  <td className="table-cell hidden md:table-cell text-muted-foreground text-xs">{m.warehouse?.name}</td>
                  <td className="table-cell hidden lg:table-cell text-muted-foreground text-xs max-w-[160px] truncate">{m.notes ?? '—'}</td>
                  <td className="table-cell text-muted-foreground text-xs whitespace-nowrap">{formatDate(m.createdAt, 'dd/MM/yy HH:mm')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Pág. {page} de {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </>
  )
}
