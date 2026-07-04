// app/dashboard/productos/marcas/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Plus, Edit2, Trash2, Loader2, X, RefreshCw, Award } from 'lucide-react'

export default function MarcasPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/productos/marcas')
      const json = await res.json()
      setBrands(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  function openCreate() { setEditingId(null); setName(''); setShowModal(true) }
  function openEdit(b: any) { setEditingId(b.id); setName(b.name); setShowModal(true) }

  async function handleSave() {
    if (!name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/productos/marcas/${editingId}` : '/api/productos/marcas'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess(editingId ? 'Marca actualizada' : 'Marca creada', name)
      setShowModal(false)
      fetchBrands()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/productos/marcas/${id}`, { method: 'DELETE' })
      toastSuccess('Marca eliminada')
      fetchBrands()
    } catch { toastError('Error al eliminar') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Marcas</h1><p className="page-subtitle">Marcas y fabricantes de productos</p></div>
        <div className="flex gap-2">
          <button onClick={fetchBrands} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={openCreate} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nueva marca</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {brands.length === 0 ? (
            <div className="col-span-full rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Award size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay marcas todavía</p>
            </div>
          ) : brands.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <Award size={15} className="text-purple-600 dark:text-purple-400" />
                </div>
                <p className="font-semibold text-sm">{b.name}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(b.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label={editingId ? 'Editar marca' : 'Nueva marca'}>
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">{editingId ? 'Editar marca' : 'Nueva marca'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium mb-1.5">Nombre *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Samsung, Apple, Genérico..." autoFocus />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}{editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
