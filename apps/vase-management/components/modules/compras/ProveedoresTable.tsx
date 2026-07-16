// components/modules/compras/ProveedoresTable.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatCurrency, getIvaConditionLabel } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Search, Plus, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, RefreshCw, X, Truck } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Requerido'),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER']).default('CUIT'),
  documentNumber: z.string().min(7, 'Requerido'),
  ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_RESPONSABLE', 'SUJETO_NO_CATEGORIZADO']).default('RESPONSABLE_INSCRIPTO'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function ProveedoresTable() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const limit = 15

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema as never),
    defaultValues: { documentType: 'CUIT', ivaCondition: 'RESPONSABLE_INSCRIPTO' },
  })

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search })
      const res = await fetch(`/api/compras/proveedores?${params}`)
      const json = await res.json()
      setSuppliers(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch { toastError('Error al cargar proveedores') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])
  useEffect(() => { const t = setTimeout(() => setPage(1), 300); return () => clearTimeout(t) }, [search])

  function openCreate() {
    setEditingId(null)
    reset({ documentType: 'CUIT', ivaCondition: 'RESPONSABLE_INSCRIPTO' })
    setShowModal(true)
  }

  function openEdit(s: any) {
    setEditingId(s.id)
    reset({ name: s.name, documentType: s.documentType, documentNumber: s.documentNumber, ivaCondition: s.ivaCondition, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', city: s.city ?? '', province: s.province ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const url = editingId ? `/api/compras/proveedores/${editingId}` : '/api/compras/proveedores'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess(editingId ? 'Proveedor actualizado' : 'Proveedor creado', data.name)
      setShowModal(false)
      fetchSuppliers()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/compras/proveedores/${id}`, { method: 'DELETE' })
      toastSuccess('Proveedor eliminado')
      fetchSuppliers()
    } catch { toastError('Error al eliminar') }
    finally { setDeletingId(null) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedor..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSuppliers} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={openCreate} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"><Plus size={15} />Nuevo proveedor</button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{total} proveedor{total !== 1 ? 'es' : ''}</div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Proveedor</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Documento</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">Condición IVA</th>
              <th className="table-cell text-left font-medium hidden xl:table-cell">Contacto</th>
              <th className="table-cell text-center font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={5} className="table-cell text-center py-16">
                <Truck size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron proveedores</p>
              </td></tr>
            ) : suppliers.map((s) => (
              <tr key={s.id} className="table-row">
                <td className="table-cell">
                  <p className="font-medium">{s.name}</p>
                </td>
                <td className="table-cell hidden md:table-cell">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.documentType}</span>
                  <span className="ml-2 text-muted-foreground">{s.documentNumber}</span>
                </td>
                <td className="table-cell hidden lg:table-cell"><span className="badge-neutral">{getIvaConditionLabel(s.ivaCondition)}</span></td>
                <td className="table-cell hidden xl:table-cell">
                  {s.phone && <p className="text-xs">{s.phone}</p>}
                  {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 disabled:opacity-50">
                      {deletingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}>
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
              <h2 className="font-semibold text-lg">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                  <input {...register('name')} className="input-field" placeholder="Proveedor SA" />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo documento</label>
                  <select {...register('documentType')} className="input-field">
                    <option value="CUIT">CUIT</option><option value="CUIL">CUIL</option>
                    <option value="DNI">DNI</option><option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Número *</label>
                  <input {...register('documentNumber')} className="input-field font-mono" placeholder="30-12345678-9" />
                  {errors.documentNumber && <p className="text-xs text-red-600 mt-1">{errors.documentNumber.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Condición IVA</label>
                  <select {...register('ivaCondition')} className="input-field">
                    <option value="RESPONSABLE_INSCRIPTO">Responsable Inscripto</option>
                    <option value="MONOTRIBUTISTA">Monotributista</option>
                    <option value="EXENTO">Exento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Teléfono</label>
                  <input {...register('phone')} className="input-field" placeholder="11 1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input {...register('email')} type="email" className="input-field" placeholder="ventas@proveedor.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Dirección</label>
                  <input {...register('address')} className="input-field" placeholder="Av. Industrial 1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ciudad</label>
                  <input {...register('city')} className="input-field" placeholder="Buenos Aires" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Provincia</label>
                  <input {...register('province')} className="input-field" placeholder="CABA" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear proveedor'}
                </button>
              </div>
            </form>
          </div>
      </LegacyDialog>

      <style jsx>{`
        .input-field{width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s;color:hsl(var(--foreground))}
        .input-field:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.15)}
      `}</style>
    </>
  )
}
