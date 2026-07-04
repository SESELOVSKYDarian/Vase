'use client'
// app/dashboard/stock/kardex/page.tsx

import { useState, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Search, Loader2, Package, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Salida', ADJUSTMENT: 'Ajuste',
  TRANSFER_IN: 'Transf. entrada', TRANSFER_OUT: 'Transf. salida',
  SALE: 'Venta', PURCHASE: 'Compra', RETURN: 'Devolución',
  PRODUCTION: 'Producción', DAMAGE: 'Rotura', EXPIRY: 'Vencimiento',
}

export default function KardexPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [kardexData, setKardexData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)

  const searchProducts = useCallback(async () => {
    if (!search.trim()) return
    setLoadingSearch(true)
    try {
      const res = await fetch(`/api/productos?search=${encodeURIComponent(search)}&limit=10`)
      const json = await res.json()
      setProducts(json.data ?? [])
    } catch { toastError('Error al buscar') }
    finally { setLoadingSearch(false) }
  }, [search])

  async function loadKardex(product: any) {
    setSelected(product)
    setKardexData(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/stock/kardex?productId=${product.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setKardexData(json)
    } catch (err: any) { toastError('Error', err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Kardex de Producto</h1><p className="page-subtitle">Historial detallado de movimientos por artículo</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Buscador */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-4 space-y-3 h-fit">
          <p className="font-semibold text-sm">Buscar producto</p>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchProducts()}
              placeholder="Nombre, código..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button onClick={searchProducts} disabled={loadingSearch}
              className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {products.map(p => (
              <button key={p.id} onClick={() => loadKardex(p)}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors',
                  selected?.id === p.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'
                )}>
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">Stock: {Number(p.stock)} {p.unit}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Kardex */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
          ) : !selected ? (
            <div className="rounded-xl border-2 border-dashed border-border p-16 text-center h-full flex flex-col items-center justify-center">
              <Package size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Buscá y seleccioná un producto para ver su kardex</p>
            </div>
          ) : kardexData ? (
            <div className="space-y-4">
              {/* Header producto */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-bold">{kardexData.product.name}</h2>
                    <p className="text-xs text-muted-foreground">{kardexData.product.code} · {kardexData.product.category} {kardexData.product.brand ? `· ${kardexData.product.brand}` : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                    <div className="flex items-center gap-1.5 text-blue-600 mb-1"><Package size={13} /><span className="text-xs font-medium">Stock actual</span></div>
                    <p className="font-bold text-sm font-mono">{kardexData.summary.stockActual} {kardexData.product.unit}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
                    <div className="flex items-center gap-1.5 text-green-600 mb-1"><TrendingUp size={13} /><span className="text-xs font-medium">Entradas</span></div>
                    <p className="font-bold text-sm font-mono">{kardexData.summary.totalEntradas}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                    <div className="flex items-center gap-1.5 text-red-600 mb-1"><TrendingDown size={13} /><span className="text-xs font-medium">Salidas</span></div>
                    <p className="font-bold text-sm font-mono">{kardexData.summary.totalSalidas}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3">
                    <div className="flex items-center gap-1.5 text-purple-600 mb-1"><BarChart3 size={13} /><span className="text-xs font-medium">Valor stock</span></div>
                    <p className="font-bold text-sm font-mono">{formatCurrency(kardexData.summary.valorStock)}</p>
                  </div>
                </div>
              </div>

              {/* Stock por depósito */}
              {kardexData.stockLevels.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-sm mb-3">Stock por depósito</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {kardexData.stockLevels.map((sl: any, i: number) => (
                      <div key={i} className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">{sl.warehouse}</p>
                        <p className="font-bold text-sm">{sl.quantity} <span className="text-xs font-normal text-muted-foreground">(disp: {sl.available})</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla kardex */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border"><p className="font-semibold text-sm">Movimientos</p></div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Depósito</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Entrada</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Salida</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardexData.kardex.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Sin movimientos registrados</td></tr>
                      ) : kardexData.kardex.map((k: any) => (
                        <tr key={k.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 text-muted-foreground">{k.date}</td>
                          <td className="px-3 py-2"><span className="badge-info text-[10px]">{TYPE_LABELS[k.type] ?? k.type}</span></td>
                          <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{k.warehouse}</td>
                          <td className="px-3 py-2 text-right font-mono text-green-600">{k.entradas > 0 ? `+${k.entradas}` : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono text-red-600">{k.salidas > 0 ? `-${k.salidas}` : '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{k.saldo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
