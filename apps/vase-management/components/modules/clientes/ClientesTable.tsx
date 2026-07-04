// components/modules/clientes/ClientesTable.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, formatCurrency, getIvaConditionLabel, formatDate } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Search, Plus, Edit2, Trash2, Eye, Loader2, ChevronLeft,
  ChevronRight, Users, MoreHorizontal, Check, X, RefreshCw
} from 'lucide-react'

const schema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER']),
  documentNumber: z.string().optional(),
  ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_RESPONSABLE', 'SUJETO_NO_CATEGORIZADO']),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  creditLimit: z.number().optional().nullable(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const IVA_CONDITIONS = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
  { value: 'SUJETO_NO_CATEGORIZADO', label: 'Sujeto No Categorizado' },
]

const DOC_TYPES = [
  { value: 'CUIT', label: 'CUIT' },
  { value: 'CUIL', label: 'CUIL' },
  { value: 'DNI', label: 'DNI' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'OTHER', label: 'Otro' },
]

export function ClientesTable() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
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
    resolver: zodResolver(schema),
    defaultValues: { documentType: 'DNI', ivaCondition: 'CONSUMIDOR_FINAL' },
  })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search })
      const res = await fetch(`/api/clientes?${params}`)
      const json = await res.json()
      setCustomers(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch {
      toastError('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timer)
  }, [search])

  function openCreate() {
    setEditingId(null)
    reset({ documentType: 'DNI', ivaCondition: 'CONSUMIDOR_FINAL' })
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditingId(c.id)
    reset({
      name: c.name, documentType: c.documentType,
      documentNumber: c.documentNumber, ivaCondition: c.ivaCondition,
      phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '',
      city: c.city ?? '', province: c.province ?? '',
      creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
      notes: c.notes ?? '',
    })
    setShowModal(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const url = editingId ? `/api/clientes/${editingId}` : '/api/clientes'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess(editingId ? 'Cliente actualizado' : 'Cliente creado', data.name)
      setShowModal(false)
      fetchCustomers()
    } catch (err: any) {
      toastError('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toastSuccess('Cliente eliminado')
      fetchCustomers()
    } catch {
      toastError('Error al eliminar cliente')
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento..."
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCustomers} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={openCreate}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground">
        {total} cliente{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell font-medium text-left">Cliente</th>
              <th className="table-cell font-medium text-left hidden md:table-cell">Documento</th>
              <th className="table-cell font-medium text-left hidden lg:table-cell">Condición IVA</th>
              <th className="table-cell font-medium text-left hidden xl:table-cell">Contacto</th>
              <th className="table-cell font-medium text-right hidden lg:table-cell">Deuda</th>
              <th className="table-cell font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="table-cell text-center py-16">
                  <Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center py-16">
                  <Users size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No se encontraron clientes</p>
                  {search && <p className="text-xs text-muted-foreground mt-1">Probá con otro término de búsqueda</p>}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.group && <p className="text-xs text-blue-600">{c.group.name}</p>}
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{c.documentType}</span>
                    <span className="ml-2 text-muted-foreground">{c.documentNumber}</span>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    <span className="badge-neutral">{getIvaConditionLabel(c.ivaCondition)}</span>
                  </td>
                  <td className="table-cell hidden xl:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <p className="text-xs">{c.phone}</p>}
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                    </div>
                  </td>
                  <td className="table-cell text-right hidden lg:table-cell">
                    <span className={cn('font-medium', Number(c.currentDebt) > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      {formatCurrency(c.currentDebt)}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/clientes/${c.id}`)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    n === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
                  )}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      <LegacyDialog open={showModal} onOpenChange={setShowModal} label={editingId ? 'Editar cliente' : 'Nuevo cliente'}>
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
              <h2 className="font-semibold text-lg">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nombre / Razón social *</label>
                  <input {...register('name')} className="input-field" placeholder="Juan Pérez" />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Código</label>
                  <input {...register('code')} className="input-field" placeholder="Opcional" />
                </div>
              </div>

              {/* Documento */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo documento *</label>
                  <select {...register('documentType')} className="input-field">
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Número *</label>
                  <input {...register('documentNumber')} className="input-field" placeholder="20-12345678-9" />
                  {errors.documentNumber && <p className="text-xs text-red-600 mt-1">{errors.documentNumber.message}</p>}
                </div>
              </div>

              {/* IVA */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Condición frente al IVA *</label>
                <select {...register('ivaCondition')} className="input-field">
                  {IVA_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Teléfono</label>
                  <input {...register('phone')} className="input-field" placeholder="11 1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input {...register('email')} type="email" className="input-field" placeholder="cliente@mail.com" />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
              </div>

              {/* Dirección */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Dirección</label>
                  <input {...register('address')} className="input-field" placeholder="Av. Corrientes 1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ciudad</label>
                  <input {...register('city')} className="input-field" placeholder="Buenos Aires" />
                </div>
              </div>

              {/* Provincia y Límite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Provincia</label>
                  <input {...register('province')} className="input-field" placeholder="CABA" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Límite de crédito</label>
                  <input
                    {...register('creditLimit', { valueAsNumber: true })}
                    type="number" step="100" min="0"
                    className="input-field" placeholder="0"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notas internas</label>
                <textarea {...register('notes')} rows={2} className="input-field resize-none" placeholder="Observaciones..." />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
      </LegacyDialog>

      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          color: hsl(var(--foreground));
        }
        .input-field:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </>
  )
}
