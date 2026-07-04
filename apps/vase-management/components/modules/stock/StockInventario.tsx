// components/modules/stock/StockInventario.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatNumber, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Search, Plus, Minus, Settings2, Loader2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, X, PackageOpen } from 'lucide-react'

type MovType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT'

export function StockInventario() {
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [movType, setMovType] = useState<MovType>('ENTRY')
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [form, setForm] = useState({ productId: '', warehouseId: '', quantity: 1, unitCost: 0, notes: '' })
  const limit = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search })
      const [stockRes, whRes] = await Promise.all([
        fetch(`/api/stock?${params}`),
        fetch('/api/stock/depositos'),
      ])
      const [stock, wh] = await Promise.all([stockRes.json(), whRes.json()])
      setProducts(stock.data ?? [])
      setTotal(stock.total ?? 0)
      setWarehouses(wh.data ?? [])
    } catch { toastError('Error al cargar inventario') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setTimeout(() => setPage(1), 300); return () => clearTimeout(t) }, [search])

  function openMovement(product: any, type: MovType) {
    setSelectedProduct(product)
    setMovType(type)
    setForm({ productId: product.id, warehouseId: warehouses[0]?.id ?? '', quantity: 1, unitCost: Number(product.cost), notes: '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.warehouseId) { toastError('Seleccioná un depósito'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: movType }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const labels = { ENTRY: 'Entrada registrada', EXIT: 'Salida registrada', ADJUSTMENT: 'Ajuste aplicado' }
      toastSuccess(labels[movType], `Nuevo stock: ${formatNumber(json.newStock, 0)}`)
      setShowModal(false)
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
      </div>

      <div className="text-xs text-muted-foreground">{total} producto{total !== 1 ? 's' : ''} en inventario</div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Producto</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Categoría</th>
              <th className="table-cell text-center font-medium">Stock actual</th>
              <th className="table-cell text-center font-medium hidden md:table-cell">Stock mínimo</th>
              <th className="table-cell text-right font-medium hidden lg:table-cell">Valor stock</th>
              <th className="table-cell text-center font-medium">Movimiento</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center py-16">
                <PackageOpen size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron productos</p>
              </td></tr>
            ) : products.map((p) => {
              const stock = Number(p.stock)
              const minStock = Number(p.minStock)
              const isLow = stock <= minStock
              const stockValue = stock * Number(p.cost)
              return (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{p.code}</p>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    {p.category ? <span className="badge-neutral">{p.category.name}</span> : '—'}
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn('text-lg font-bold', isLow ? 'text-red-600' : stock === 0 ? 'text-orange-600' : 'text-foreground')}>
                        {formatNumber(stock, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.unit}</span>
                      {isLow && <AlertTriangle size={12} className="text-red-500" />}
                    </div>
                  </td>
                  <td className="table-cell text-center hidden md:table-cell text-muted-foreground">{formatNumber(minStock, 0)}</td>
                  <td className="table-cell text-right hidden lg:table-cell font-mono text-sm">{formatCurrency(stockValue)}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openMovement(p, 'ENTRY')} title="Entrada" className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 transition-colors">
                        <Plus size={15} />
                      </button>
                      <button onClick={() => openMovement(p, 'EXIT')} title="Salida" className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 transition-colors">
                        <Minus size={15} />
                      </button>
                      <button onClick={() => openMovement(p, 'ADJUSTMENT')} title="Ajuste" className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 transition-colors">
                        <Settings2 size={15} />
                      </button>
                    </div>
                  </td>
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

      {/* Modal movimiento */}
      <LegacyDialog open={showModal && !!selectedProduct} onOpenChange={setShowModal} label="Movimiento de stock">
        {selectedProduct && (
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-lg">
                {movType === 'ENTRY' && '📦 Entrada de stock'}
                {movType === 'EXIT' && '📤 Salida de stock'}
                {movType === 'ADJUSTMENT' && '⚙️ Ajuste de stock'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Producto info */}
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="font-medium">{selectedProduct.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs font-mono text-muted-foreground">{selectedProduct.code}</p>
                  <p className="text-sm">Stock actual: <strong>{formatNumber(selectedProduct.stock, 0)} {selectedProduct.unit}</strong></p>
                </div>
              </div>

              {/* Depósito */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Depósito *</label>
                <select value={form.warehouseId} onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))} className="input-field">
                  <option value="">Seleccionar depósito...</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {movType === 'ADJUSTMENT' ? 'Nuevo stock (cantidad exacta)' : 'Cantidad a ' + (movType === 'ENTRY' ? 'ingresar' : 'retirar')}
                </label>
                <input type="number" value={form.quantity} min={movType === 'EXIT' ? 0.01 : 0} step="0.01"
                  onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                  className="input-field" />
              </div>

              {/* Costo unitario (solo entradas) */}
              {movType === 'ENTRY' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Costo unitario</label>
                  <input type="number" value={form.unitCost} min="0" step="0.01"
                    onChange={(e) => setForm((f) => ({ ...f, unitCost: parseFloat(e.target.value) || 0 }))}
                    className="input-field font-mono" />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Motivo / Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} className="input-field resize-none" placeholder="Motivo del movimiento..." />
              </div>

              {/* Preview */}
              {movType !== 'ADJUSTMENT' && (
                <div className="rounded-lg bg-muted/50 px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stock resultante:</span>
                  <span className="font-bold">
                    {movType === 'ENTRY'
                      ? formatNumber(Number(selectedProduct.stock) + form.quantity, 0)
                      : formatNumber(Number(selectedProduct.stock) - form.quantity, 0)}
                    {' '}{selectedProduct.unit}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.warehouseId || form.quantity <= 0}
                className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2',
                  movType === 'ENTRY' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  movType === 'EXIT' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                )}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        )}
      </LegacyDialog>

      <style jsx>{`
        .input-field{width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s;color:hsl(var(--foreground))}
        .input-field:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.15)}
      `}</style>
    </>
  )
}
