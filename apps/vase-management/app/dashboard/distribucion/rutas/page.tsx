'use client'
// app/dashboard/distribucion/rutas/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Plus, Truck, Loader2, X, RefreshCw, Users } from 'lucide-react'

export default function RutasPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  const fetchRoutes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/distribucion/rutas')
      const json = await res.json()
      setRoutes(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRoutes() }, [fetchRoutes])

  async function handleSave() {
    if (!form.name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/distribucion/rutas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toastSuccess('Ruta creada', form.name)
      setShowModal(false)
      setForm({ name: '', description: '' })
      fetchRoutes()
    } catch { toastError('Error al crear') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Rutas de Reparto</h1><p className="page-subtitle">Zonas de distribución y entrega</p></div>
        <div className="flex gap-2">
          <button onClick={fetchRoutes} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nueva ruta</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Truck size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay rutas de reparto configuradas</p>
            </div>
          ) : routes.map(r => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <Truck size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">{r.name}</p>
                  {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border">
                <Users size={12} />{r._count?.customers ?? 0} clientes asignados
              </div>
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva ruta">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nueva ruta</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la ruta *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" autoFocus />
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción / zona"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Crear
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
