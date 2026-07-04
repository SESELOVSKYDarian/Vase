// components/modules/ventas/VentasTable.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getSaleTypeLabel, calcItemTotals } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import {
  Search, Plus, Eye, Loader2, ChevronLeft, ChevronRight, FileText,
  X, Trash2, RefreshCw, ShoppingBag, Filter
} from 'lucide-react'
import { cn } from '@/utils'
import { Dialog } from '@/components/ui/Dialog'

const SALE_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'SALE', label: 'Venta' },
  { value: 'BUDGET', label: 'Presupuesto' },
  { value: 'ORDER', label: 'Pedido' },
  { value: 'REMITO', label: 'Remito' },
]

const STATUSES = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'INVOICED', label: 'Facturado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const IVA_OPTIONS = [
  { rate: 21, label: '21%' },
  { rate: 10.5, label: '10.5%' },
  { rate: 27, label: '27%' },
  { rate: 0, label: '0%' },
]

export function VentasTable() {
  const searchParams = useSearchParams()
  const [sales, setSales] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState(searchParams.get('tipo') ?? '')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [selectedSale, setSelectedSale] = useState<any | null>(null)

  // Estado del formulario de nueva venta
  const [form, setForm] = useState({
    customerId: '',
    type: 'SALE',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
    items: [] as {
      productId: string; productName: string; code: string
      quantity: number; unitPrice: number; discount: number; ivaRate: number
      subtotal: number; ivaAmount: number; total: number
    }[],
  })

  const limit = 15

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search, ...(tipoFilter && { tipo: tipoFilter }), ...(statusFilter && { status: statusFilter }) })
      const res = await fetch(`/api/ventas?${params}`)
      const json = await res.json()
      setSales(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch { toastError('Error al cargar ventas') }
    finally { setLoading(false) }
  }, [page, search, tipoFilter, statusFilter])

  useEffect(() => { fetchSales() }, [fetchSales])
  useEffect(() => { const t = setTimeout(() => setPage(1), 300); return () => clearTimeout(t) }, [search])

  // Buscar clientes al abrir modal
  useEffect(() => {
    if (!showModal) return
    fetch('/api/clientes?limit=100').then((r) => r.json()).then((j) => setCustomers(j.data ?? []))
  }, [showModal])

  // Buscar productos
  useEffect(() => {
    if (productSearch.length < 2) { setProductResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/productos?search=${productSearch}&limit=10`)
      const json = await res.json()
      setProductResults(json.data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [productSearch])

  function addProduct(p: any) {
    const unitPrice = Number(p.price)
    const ivaRate = Number(p.ivaRate)
    const { subtotal, ivaAmount, total } = calcItemTotals(1, unitPrice, 0, ivaRate)
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: p.id, productName: p.name, code: p.code, quantity: 1, unitPrice, discount: 0, ivaRate, subtotal, ivaAmount, total }],
    }))
    setProductSearch('')
    setProductResults([])
  }

  function updateItem(idx: number, field: string, value: number) {
    setForm((f) => {
      const items = [...f.items]
      const item = { ...items[idx], [field]: value }
      const { subtotal, ivaAmount, total } = calcItemTotals(item.quantity, item.unitPrice, item.discount, item.ivaRate)
      items[idx] = { ...item, subtotal, ivaAmount, total }
      return { ...f, items }
    })
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  const totals = form.items.reduce((acc, i) => ({
    subtotal: acc.subtotal + i.subtotal,
    iva: acc.iva + i.ivaAmount,
    total: acc.total + i.total,
  }), { subtotal: 0, iva: 0, total: 0 })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.items.length === 0) { toastError('Agregá al menos un producto'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: form.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, ivaRate: i.ivaRate, subtotal: i.subtotal, ivaAmount: i.ivaAmount, total: i.total })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Venta creada', formatCurrency(totals.total))
      setShowModal(false)
      setForm({ customerId: '', type: 'SALE', date: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', items: [] })
      fetchSales()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ventas..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <select value={tipoFilter} onChange={(e) => { setTipoFilter(e.target.value); setPage(1) }} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          {SALE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={fetchSales} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nueva venta</button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{total} registro{total !== 1 ? 's' : ''}</div>

      {/* Tabla */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">#</th>
              <th className="table-cell text-left font-medium">Tipo</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Cliente</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Fecha</th>
              <th className="table-cell text-right font-medium">Total</th>
              <th className="table-cell text-center font-medium">Estado</th>
              <th className="table-cell text-center font-medium">Ver</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-16">
                <ShoppingBag size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron ventas</p>
              </td></tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="table-row">
                <td className="table-cell font-mono text-muted-foreground">#{String(s.number).padStart(5, '0')}</td>
                <td className="table-cell"><span className="badge-neutral">{getSaleTypeLabel(s.type)}</span></td>
                <td className="table-cell hidden sm:table-cell font-medium">{s.customer?.name ?? 'Consumidor Final'}</td>
                <td className="table-cell hidden md:table-cell text-muted-foreground">{formatDate(s.date)}</td>
                <td className="table-cell text-right font-semibold font-mono">{formatCurrency(s.total)}</td>
                <td className="table-cell text-center"><span className={getStatusColor(s.status)}>{getStatusLabel(s.status)}</span></td>
                <td className="table-cell text-center">
                  <button onClick={() => setSelectedSale(s)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mx-auto"><Eye size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Pág. {page} de {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Modal nueva venta */}
      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        title="Nueva venta"
        description="Registrá productos, cliente y condiciones de la operación."
        className="max-w-4xl"
        footer={(
          <>
            <button type="button" onClick={() => setShowModal(false)} className="ui-button ui-button-secondary">Cancelar</button>
            <button onClick={handleSubmit} disabled={saving || form.items.length === 0}
              className="ui-button ui-button-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Crear {getSaleTypeLabel(form.type)}
            </button>
          </>
        )}
      >
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="space-y-5">
                {/* Cabecera */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Tipo</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field">
                      <option value="SALE">Venta</option>
                      <option value="BUDGET">Presupuesto</option>
                      <option value="ORDER">Pedido</option>
                      <option value="REMITO">Remito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Fecha</label>
                    <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Cliente</label>
                    <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} className="input-field">
                      <option value="">Consumidor Final</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.documentNumber}</option>)}
                    </select>
                  </div>
                </div>

                {/* Agregar producto */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5">Agregar producto</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar por nombre o código..." className="input-field pl-9" />
                  </div>
                  {productResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                      {productResults.map((p) => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted text-left transition-colors">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{p.code}</span>
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(p.price)}</p>
                            <p className="text-xs text-muted-foreground">Stock: {Number(p.stock).toFixed(0)} {p.unit}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ítems */}
                {form.items.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Producto</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-24">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">Precio</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">Desc.%</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">IVA%</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">Total</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2">
                              <p className="font-medium text-xs">{item.productName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={item.quantity} min="0.01" step="0.01"
                                onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={item.unitPrice} min="0" step="0.01"
                                onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={item.discount} min="0" max="100" step="0.5"
                                onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-16 text-center rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <select value={item.ivaRate} onChange={(e) => updateItem(idx, 'ivaRate', parseFloat(e.target.value))}
                                className="rounded border border-border bg-background px-1.5 py-1 text-xs focus:outline-none">
                                {IVA_OPTIONS.map((o) => <option key={o.rate} value={o.rate}>{o.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold font-mono text-xs">{formatCurrency(item.total)}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeItem(idx)} className="w-7 h-7 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 mx-auto">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totales */}
                {form.items.length > 0 && (
                  <div className="flex justify-end">
                    <div className="bg-muted/50 rounded-xl p-4 space-y-1.5 min-w-[220px]">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(totals.subtotal)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(totals.iva)}</span></div>
                      <div className="flex justify-between text-base font-bold border-t border-border pt-1.5"><span>Total</span><span className="font-mono text-primary">{formatCurrency(totals.total)}</span></div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Observaciones</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="input-field resize-none" placeholder="Notas internas..." />
                </div>
              </div>
            </form>
      </Dialog>

      {/* Modal detalle venta */}
      <Dialog
        open={!!selectedSale}
        onOpenChange={(open) => { if (!open) setSelectedSale(null) }}
        title={selectedSale ? `${getSaleTypeLabel(selectedSale.type)} #${String(selectedSale.number).padStart(5, '0')}` : 'Detalle de venta'}
        description="Detalle, estado e importes de la operación."
        className="max-w-2xl"
      >
        {selectedSale && (
            <div className="space-y-5">
              <span className={getStatusColor(selectedSale.status)}>{getStatusLabel(selectedSale.status)}</span>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{selectedSale.customer?.name ?? 'Consumidor Final'}</p></div>
                <div><span className="text-muted-foreground">Fecha:</span><p className="font-medium">{formatDate(selectedSale.date)}</p></div>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Producto</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Precio</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr></thead>
                  <tbody>
                    {selectedSale.items?.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2"><p className="font-medium">{item.product?.name}</p><p className="text-xs text-muted-foreground font-mono">{item.product?.code}</p></td>
                        <td className="px-4 py-2 text-center">{Number(item.quantity).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-semibold font-mono">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(selectedSale.ivaAmount)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t border-border pt-1"><span>Total</span><span className="font-mono text-primary">{formatCurrency(selectedSale.total)}</span></div>
                </div>
              </div>
            </div>
        )}
      </Dialog>
    </>
  )
}
