'use client'
// app/dashboard/stock/transferencias/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatDate, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Plus, ArrowRightLeft, Loader2, X, RefreshCw,
  Trash2, Package, Warehouse
} from 'lucide-react'

export default function TransferenciasPage() {
  const [transfers, setTransfers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '' })
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number }[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, wRes, pRes] = await Promise.all([
        fetch('/api/stock/transferencias'),
        fetch('/api/stock/depositos'),
        fetch('/api/productos?limit=200'),
      ])
      const [tJson, wJson, pJson] = await Promise.all([tRes.json(), wRes.json(), pRes.json()])
      setTransfers(tJson.data ?? [])
      setWarehouses(wJson.data ?? [])
      setProducts(pJson.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function addItem() {
    if (!selectedProduct || selectedQty <= 0) return
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return
    if (items.some(i => i.productId === selectedProduct)) {
      toastError('Producto ya agregado')
      return
    }
    setItems(prev => [...prev, { productId: product.id, productName: product.name, quantity: selectedQty }])
    setSelectedProduct('')
    setSelectedQty(1)
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  async function handleSave() {
    if (!form.fromWarehouseId || !form.toWarehouseId) { toastError('Seleccioná origen y destino'); return }
    if (form.fromWarehouseId === form.toWarehouseId) { toastError('Origen y destino deben ser diferentes'); return }
    if (items.length === 0) { toastError('Agregá al menos un producto'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/stock/transferencias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: items.map(({ productId, quantity }) => ({ productId, quantity })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Transferencia completada', `${items.length} producto(s) movidos`)
      setShowModal(false)
      setForm({ fromWarehouseId: '', toWarehouseId: '', notes: '' })
      setItems([])
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Transferencias entre Depósitos</h1><p className="page-subtitle">Movimientos de stock entre almacenes</p></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nueva transferencia</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium">Fecha</th>
                <th className="table-cell text-left font-medium">Origen</th>
                <th className="table-cell text-center font-medium"></th>
                <th className="table-cell text-left font-medium">Destino</th>
                <th className="table-cell text-left font-medium hidden md:table-cell">Productos</th>
                <th className="table-cell text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center py-16">
                  <ArrowRightLeft size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No hay transferencias registradas</p>
                </td></tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell text-muted-foreground">{formatDate(t.date)}</td>
                  <td className="table-cell font-medium">{t.fromWarehouse?.name}</td>
                  <td className="table-cell text-center text-muted-foreground"><ArrowRightLeft size={14} className="mx-auto" /></td>
                  <td className="table-cell font-medium">{t.toWarehouse?.name}</td>
                  <td className="table-cell hidden md:table-cell text-muted-foreground text-xs">
                    {t.items?.map((i: any) => `${i.product.name} (${Number(i.quantity)})`).join(', ')}
                  </td>
                  <td className="table-cell text-center">
                    <span className={cn('badge-success')}>{t.status === 'COMPLETED' ? 'Completada' : t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva transferencia">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-lg animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold">Nueva transferencia</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Depósito origen *</label>
                  <select value={form.fromWarehouseId} onChange={e => setForm(f => ({ ...f, fromWarehouseId: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Depósito destino *</label>
                  <select value={form.toWarehouseId} onChange={e => setForm(f => ({ ...f, toWarehouseId: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none">
                    <option value="">Seleccionar...</option>
                    {warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-2">Productos a transferir</p>
                <div className="flex gap-2 mb-3">
                  <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none">
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {Number(p.stock)})</option>)}
                  </select>
                  <input type="number" value={selectedQty} onChange={e => setSelectedQty(parseFloat(e.target.value) || 1)}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-sm focus:outline-none" min="1" />
                  <button onClick={addItem} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                    <Plus size={15} />
                  </button>
                </div>

                {items.length > 0 && (
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                        <span className="flex items-center gap-2"><Package size={13} className="text-muted-foreground" />{item.productName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{item.quantity} un.</span>
                          <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
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
                {saving && <Loader2 size={14} className="animate-spin" />}Confirmar transferencia
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
