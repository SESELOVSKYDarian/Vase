// components/modules/compras/ComprasPanel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, getStatusLabel, getStatusColor, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Search, Plus, Eye, Loader2, ChevronLeft, ChevronRight, RefreshCw, X, Trash2, ShoppingCart } from 'lucide-react'

export function ComprasPanel() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const limit = 15

  const [form, setForm] = useState({
    supplierId: '', number: '', type: 'INVOICE',
    date: new Date().toISOString().slice(0, 10), notes: '',
    items: [] as { productId: string; productName: string; code: string; quantity: number; unitCost: number; ivaRate: number; subtotal: number; ivaAmount: number; total: number }[],
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      const [purchRes, suppRes] = await Promise.all([fetch(`/api/compras?${params}`), fetch('/api/compras/proveedores?limit=200')])
      const [purch, supp] = await Promise.all([purchRes.json(), suppRes.json()])
      setPurchases(purch.data ?? [])
      setTotal(purch.total ?? 0)
      setSuppliers(supp.data ?? [])
    } catch { toastError('Error al cargar compras') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!showModal) return
    fetch('/api/productos?limit=200&isActive=true').then((r) => r.json()).then((j) => setProducts(j.data ?? []))
  }, [showModal])

  useEffect(() => {
    if (productSearch.length < 2) { setProductResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/productos?search=${productSearch}&limit=8`)
      const json = await res.json()
      setProductResults(json.data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [productSearch])

  function addProduct(p: any) {
    const unitCost = Number(p.cost)
    const ivaRate = Number(p.ivaRate)
    const subtotal = unitCost
    const ivaAmount = subtotal * (ivaRate / 100)
    setForm((f) => ({
      ...f,
      items: [...f.items, { productId: p.id, productName: p.name, code: p.code, quantity: 1, unitCost, ivaRate, subtotal, ivaAmount, total: subtotal + ivaAmount }],
    }))
    setProductSearch('')
    setProductResults([])
  }

  function updateItem(idx: number, field: string, value: number) {
    setForm((f) => {
      const items = [...f.items]
      const item = { ...items[idx], [field]: value }
      const subtotal = item.quantity * item.unitCost
      const ivaAmount = subtotal * (item.ivaRate / 100)
      items[idx] = { ...item, subtotal, ivaAmount, total: subtotal + ivaAmount }
      return { ...f, items }
    })
  }

  const totals = form.items.reduce((acc, i) => ({ subtotal: acc.subtotal + i.subtotal, iva: acc.iva + i.ivaAmount, total: acc.total + i.total }), { subtotal: 0, iva: 0, total: 0 })

  async function handleSubmit() {
    if (!form.supplierId) { toastError('Seleccioná un proveedor'); return }
    if (form.items.length === 0) { toastError('Agregá al menos un producto'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: form.items.map((i) => ({ productId: i.productId, description: i.productName, quantity: i.quantity, unitCost: i.unitCost, ivaRate: i.ivaRate, subtotal: i.subtotal, ivaAmount: i.ivaAmount, total: i.total })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Compra registrada', formatCurrency(totals.total))
      setShowModal(false)
      setForm({ supplierId: '', number: '', type: 'INVOICE', date: new Date().toISOString().slice(0, 10), notes: '', items: [] })
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar compras..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nueva compra</button>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Proveedor</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">N° Factura</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Fecha</th>
              <th className="table-cell text-right font-medium">Total</th>
              <th className="table-cell text-center font-medium">Estado</th>
              <th className="table-cell text-center font-medium">Ver</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center py-16">
                <ShoppingCart size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay compras registradas</p>
              </td></tr>
            ) : purchases.map((p) => (
              <tr key={p.id} className="table-row">
                <td className="table-cell font-medium">{p.supplier?.name}</td>
                <td className="table-cell hidden sm:table-cell font-mono text-xs text-muted-foreground">{p.number ?? '—'}</td>
                <td className="table-cell hidden md:table-cell text-muted-foreground">{formatDate(p.date)}</td>
                <td className="table-cell text-right font-semibold font-mono">{formatCurrency(p.total)}</td>
                <td className="table-cell text-center"><span className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</span></td>
                <td className="table-cell text-center">
                  <button onClick={() => setSelectedPurchase(p)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mx-auto"><Eye size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronLeft size={15} /></button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronRight size={15} /></button>
        </div>
      )}

      {/* Modal nueva compra */}
      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva compra">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[92vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-lg">Nueva compra</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Proveedor *</label>
                  <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} className="input-field">
                    <option value="">Seleccionar proveedor...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field">
                    <option value="INVOICE">Factura</option>
                    <option value="ORDER">Orden de compra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fecha</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">N° de factura proveedor</label>
                  <input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="Ej: A-0001-00012345" className="input-field font-mono" />
                </div>
              </div>

              {/* Buscar productos */}
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Agregar producto</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar producto..." className="input-field pl-9" />
                </div>
                {productResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                    {productResults.map((p) => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted text-left">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatCurrency(p.cost)}</span>
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
                        <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">Cant.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">Costo unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2"><p className="font-medium text-xs">{item.productName}</p><p className="text-xs text-muted-foreground font-mono">{item.code}</p></td>
                          <td className="px-3 py-2">
                            <input type="number" value={item.quantity} min="0.01" step="0.01" onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-center rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={item.unitCost} min="0" step="0.01" onChange={(e) => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full text-right rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold font-mono text-xs">{formatCurrency(item.total)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="w-7 h-7 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 mx-auto"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {form.items.length > 0 && (
                <div className="flex justify-end">
                  <div className="bg-muted/50 rounded-xl p-4 space-y-1.5 min-w-[200px]">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Neto</span><span className="font-mono">{formatCurrency(totals.subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(totals.iva)}</span></div>
                    <div className="flex justify-between font-bold text-base border-t border-border pt-1.5"><span>Total</span><span className="font-mono text-primary">{formatCurrency(totals.total)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving || !form.supplierId || form.items.length === 0}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />}Registrar compra
              </button>
            </div>
          </div>
      </LegacyDialog>

      <style jsx>{`
        .input-field{width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s;color:hsl(var(--foreground))}
        .input-field:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.15)}
      `}</style>
    </>
  )
}
