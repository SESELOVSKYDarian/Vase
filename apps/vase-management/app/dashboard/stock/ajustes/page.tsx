'use client'
// app/dashboard/stock/ajustes/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatDate, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Plus, ClipboardCheck, Loader2, X, RefreshCw,
  Trash2, Package, AlertTriangle
} from 'lucide-react'

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'Rotura', EXPIRY: 'Vencimiento', LOSS: 'Pérdida', COUNT: 'Conteo físico', OTHER: 'Otro',
}

export default function AjustesPage() {
  const [adjustments, setAdjustments] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ warehouseId: '', reason: 'COUNT', notes: '' })
  const [items, setItems] = useState<{ productId: string; productName: string; expectedQty: number; actualQty: number }[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, wRes, pRes] = await Promise.all([
        fetch('/api/stock/ajustes'),
        fetch('/api/stock/depositos'),
        fetch('/api/productos?limit=200'),
      ])
      const [aJson, wJson, pJson] = await Promise.all([aRes.json(), wRes.json(), pRes.json()])
      setAdjustments(aJson.data ?? [])
      setWarehouses(wJson.data ?? [])
      setProducts(pJson.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function addItem() {
    if (!selectedProduct) return
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return
    if (items.some(i => i.productId === selectedProduct)) { toastError('Producto ya agregado'); return }
    setItems(prev => [...prev, {
      productId: product.id, productName: product.name,
      expectedQty: Number(product.stock), actualQty: Number(product.stock),
    }])
    setSelectedProduct('')
  }

  function updateActualQty(productId: string, value: number) {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, actualQty: value } : i))
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  async function handleSave() {
    if (items.length === 0) { toastError('Agregá al menos un producto'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/stock/ajustes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: items.map(({ productId, expectedQty, actualQty }) => ({ productId, expectedQty, actualQty })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Ajuste aplicado', `${items.length} producto(s) regularizados`)
      setShowModal(false)
      setForm({ warehouseId: '', reason: 'COUNT', notes: '' })
      setItems([])
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Ajustes de Inventario</h1><p className="page-subtitle">Regularización de existencias por rotura, pérdida o conteo</p></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nuevo ajuste</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {adjustments.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
              <ClipboardCheck size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay ajustes registrados</p>
            </div>
          ) : adjustments.map(adj => (
            <div key={adj.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span className="font-semibold text-sm">{REASON_LABELS[adj.reason] ?? adj.reason}</span>
                  {adj.warehouse && <span className="text-xs text-muted-foreground">· {adj.warehouse.name}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(adj.createdAt)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {adj.items?.map((item: any) => {
                  const diff = Number(item.difference)
                  return (
                    <span key={item.id} className={cn('text-xs px-2 py-1 rounded-lg', diff < 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : diff > 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-muted text-muted-foreground')}>
                      {item.product.name}: {diff > 0 ? '+' : ''}{diff}
                    </span>
                  )
                })}
              </div>
              {adj.notes && <p className="text-xs text-muted-foreground mt-2">{adj.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo ajuste de stock">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-lg animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold">Nuevo ajuste de inventario</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Depósito</label>
                  <select value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none">
                    <option value="">Sin especificar</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Motivo *</label>
                  <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none">
                    {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-2">Productos a ajustar</p>
                <div className="flex gap-2 mb-3">
                  <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none">
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {Number(p.stock)})</option>)}
                  </select>
                  <button onClick={addItem} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90"><Plus size={15} /></button>
                </div>

                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map(item => {
                      const diff = item.actualQty - item.expectedQty
                      return (
                        <div key={item.productId} className="bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm flex items-center gap-2"><Package size={13} className="text-muted-foreground" />{item.productName}</span>
                            <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-600"><Trash2 size={13} /></button>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-muted-foreground">Sistema: {item.expectedQty}</span>
                            <span>Real:</span>
                            <input type="number" value={item.actualQty}
                              onChange={e => updateActualQty(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded border border-border bg-background text-xs" />
                            <span className={cn('font-mono font-semibold ml-auto', diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none resize-none" rows={2} />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Aplicar ajuste
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
