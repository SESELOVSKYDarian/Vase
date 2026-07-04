// components/modules/productos/ProductosTable.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn, formatCurrency, formatNumber } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Search, Plus, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight,
  Package, AlertTriangle, RefreshCw, X, Tag, BarChart3
} from 'lucide-react'

const schema = z.object({
  code: z.string().min(1, 'Código requerido'),
  barcode: z.string().optional(),
  name: z.string().min(2, 'Nombre requerido'),
  description: z.string().optional(),
  unit: z.string().default('UN'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  cost: z.number().min(0).default(0),
  price: z.number().min(0, 'Requerido'),
  ivaRate: z.number().min(0).max(100),
  minStock: z.number().min(0),
})

type FormData = z.infer<typeof schema>

const UNITS = ['UN', 'KG', 'GR', 'LT', 'ML', 'MT', 'CM', 'M2', 'M3', 'PAQ', 'CAJ', 'DOC']
const IVA_RATES = [0, 2.5, 5, 10.5, 21, 27]

export function ProductosTable() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterLowStock, setFilterLowStock] = useState(false)
  const limit = 15

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: 'UN', ivaRate: 21, minStock: 0, cost: 0, price: 0 },
  })

  const cost = watch('cost')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search, ...(filterLowStock && { lowStock: 'true' }) })
      const [prodRes, catRes, brandRes] = await Promise.all([
        fetch(`/api/productos?${params}`),
        fetch('/api/productos/categorias'),
        fetch('/api/productos/marcas'),
      ])
      const [prod, cat, brand] = await Promise.all([prodRes.json(), catRes.json(), brandRes.json()])
      setProducts(prod.data ?? [])
      setTotal(prod.total ?? 0)
      setCategories(cat.data ?? [])
      setBrands(brand.data ?? [])
    } catch {
      toastError('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterLowStock])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { const t = setTimeout(() => setPage(1), 300); return () => clearTimeout(t) }, [search])

  function openCreate() {
    setEditingId(null)
    reset({ unit: 'UN', ivaRate: 21, minStock: 0, cost: 0, price: 0 })
    setShowModal(true)
  }

  function openEdit(p: any) {
    setEditingId(p.id)
    reset({
      code: p.code, barcode: p.barcode ?? '', name: p.name, description: p.description ?? '',
      unit: p.unit, categoryId: p.categoryId ?? '', brandId: p.brandId ?? '',
      cost: Number(p.cost), price: Number(p.price),
      ivaRate: Number(p.ivaRate), minStock: Number(p.minStock),
    })
    setShowModal(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const url = editingId ? `/api/productos/${editingId}` : '/api/productos'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess(editingId ? 'Producto actualizado' : 'Producto creado', data.name)
      setShowModal(false)
      fetchAll()
    } catch (err: any) {
      toastError('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/productos/${id}`, { method: 'DELETE' })
      toastSuccess('Producto desactivado')
      fetchAll()
    } catch {
      toastError('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={cn('h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors',
              filterLowStock ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400' : 'border-border hover:bg-muted text-muted-foreground'
            )}
          >
            <AlertTriangle size={14} />
            Stock crítico
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <RefreshCw size={15} />
          </button>
          <button onClick={openCreate} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <Plus size={15} />Nuevo producto
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{total} producto{total !== 1 ? 's' : ''}</div>

      {/* Tabla */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Producto</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Categoría</th>
              <th className="table-cell text-right font-medium hidden md:table-cell">Costo</th>
              <th className="table-cell text-right font-medium">Precio venta</th>
              <th className="table-cell text-center font-medium hidden lg:table-cell">IVA</th>
              <th className="table-cell text-center font-medium">Stock</th>
              <th className="table-cell text-center font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-16">
                <Package size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron productos</p>
              </td></tr>
            ) : products.map((p) => {
              const isLow = Number(p.stock) <= Number(p.minStock)
              return (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{p.code}</span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      {p.brand && <p className="text-xs text-muted-foreground mt-0.5">{p.brand.name}</p>}
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    {p.category ? <span className="badge-neutral">{p.category.name}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="table-cell text-right hidden md:table-cell font-mono text-muted-foreground">{formatCurrency(p.cost)}</td>
                  <td className="table-cell text-right font-semibold font-mono">{formatCurrency(p.price)}</td>
                  <td className="table-cell text-center hidden lg:table-cell">
                    <span className="badge-info">{Number(p.ivaRate)}%</span>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn('font-bold text-sm', isLow ? 'text-red-600' : 'text-foreground')}>
                        {formatNumber(p.stock, 0)}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.unit}</span>
                      {isLow && <AlertTriangle size={12} className="text-red-500 mt-0.5" />}
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50">
                        {deletingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Pág. {page} de {totalPages} — {total} registros</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <LegacyDialog open={showModal} onOpenChange={setShowModal} label={editingId ? 'Editar producto' : 'Nuevo producto'}>
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background">
              <h2 className="font-semibold text-lg">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Código y nombre */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Código *</label>
                  <input {...register('code')} className="input-field" placeholder="ELEC-001" />
                  {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                  <input {...register('name')} className="input-field" placeholder="Nombre del producto" />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                </div>
              </div>

              {/* Categoría, marca y unidad */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Categoría</label>
                  <select {...register('categoryId')} className="input-field">
                    <option value="">Sin categoría</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Marca</label>
                  <select {...register('brandId')} className="input-field">
                    <option value="">Sin marca</option>
                    {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Unidad</label>
                  <select {...register('unit')} className="input-field">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Precio de costo *</label>
                  <input {...register('cost', { valueAsNumber: true })} type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Precio de venta *</label>
                  <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" min="0" className="input-field" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Alícuota IVA</label>
                  <select {...register('ivaRate', { valueAsNumber: true })} className="input-field">
                    {IVA_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              {/* Stock mínimo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stock mínimo</label>
                  <input {...register('minStock', { valueAsNumber: true })} type="number" step="1" min="0" className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Código de barras</label>
                  <input {...register('barcode')} className="input-field font-mono" placeholder="7790001001234" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Descripción</label>
                <textarea {...register('description')} rows={2} className="input-field resize-none" placeholder="Descripción opcional..." />
              </div>

              {/* Stock control: ahora se gestiona vía depósitos / niveles de stock */}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
      </LegacyDialog>

      <style jsx>{`
        .input-field { width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;transition:border-color 0.15s,box-shadow 0.15s;color:hsl(var(--foreground)); }
        .input-field:focus { border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/0.15); }
      `}</style>
    </>
  )
}
