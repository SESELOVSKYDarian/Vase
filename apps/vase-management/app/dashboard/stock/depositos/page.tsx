// app/dashboard/stock/depositos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Plus, Loader2, X, RefreshCw, Warehouse, MapPin } from 'lucide-react'

export default function DepositosPage() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '' })

  const fetchWarehouses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock/depositos')
      const json = await res.json()
      setWarehouses(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

  async function handleSave() {
    if (!form.name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/stock/depositos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Depósito creado', form.name)
      setShowModal(false)
      setForm({ name: '', address: '' })
      fetchWarehouses()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Depósitos</h1><p className="page-subtitle">Gestioná tus almacenes y depósitos</p></div>
        <div className="flex gap-2">
          <button onClick={fetchWarehouses} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nuevo depósito</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Warehouse size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay depósitos configurados</p>
            </div>
          ) : warehouses.map((w) => (
            <div key={w.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${w.isMain ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted'}`}>
                  <Warehouse size={18} className={w.isMain ? 'text-blue-600' : 'text-muted-foreground'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{w.name}</p>
                    {w.isMain && <span className="badge-info text-xs">Principal</span>}
                  </div>
                  {w.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />{w.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                <span className={w.isActive ? 'badge-success' : 'badge-neutral'}>{w.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo depósito">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nuevo depósito</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Depósito Central" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Dirección</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Av. Industrial 1234" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Crear depósito
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
