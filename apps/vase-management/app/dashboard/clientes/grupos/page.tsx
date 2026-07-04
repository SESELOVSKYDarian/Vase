'use client'
// app/dashboard/clientes/grupos/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Plus, Users, Edit2, Trash2, Loader2, X, RefreshCw, Percent } from 'lucide-react'

export default function GruposClientesPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', discount: 0 })

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clientes/grupos')
      const json = await res.json()
      setGroups(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  async function handleSave() {
    if (!form.name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clientes/grupos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error al crear')
      toastSuccess('Grupo creado', form.name)
      setShowModal(false)
      setForm({ name: '', description: '', discount: 0 })
      fetchGroups()
    } catch { toastError('Error al crear') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Grupos de Clientes</h1><p className="page-subtitle">Segmentación comercial y descuentos por grupo</p></div>
        <div className="flex gap-2">
          <button onClick={fetchGroups} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nuevo grupo</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay grupos de clientes todavía</p>
            </div>
          ) : groups.map(g => (
            <div key={g.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                  <Users size={18} className="text-indigo-600" />
                </div>
                {Number(g.discount) > 0 && (
                  <span className="badge-success flex items-center gap-1">
                    <Percent size={10} />{Number(g.discount)}% off
                  </span>
                )}
              </div>
              <p className="font-semibold">{g.name}</p>
              {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{g._count?.customers ?? 0} clientes</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo grupo de clientes">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nuevo grupo</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Mayoristas, VIP, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Descripción</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Descuento automático (%)</label>
                <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" min="0" max="100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Crear grupo
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
