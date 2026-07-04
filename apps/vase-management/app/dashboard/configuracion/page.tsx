'use client'
// app/dashboard/configuracion/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { cn } from '@/utils'
import {
  Building2, MapPin, Users, CreditCard, Loader2,
  Save, Plus, Shield, Receipt, X
} from 'lucide-react'

const TABS = [
  { id: 'empresa', label: 'Empresa', icon: <Building2 size={15} /> },
  { id: 'sucursales', label: 'Sucursales', icon: <MapPin size={15} /> },
  { id: 'pdv', label: 'Puntos de Venta', icon: <Receipt size={15} /> },
  { id: 'usuarios', label: 'Usuarios y Roles', icon: <Users size={15} /> },
]

const IVA_CONDITIONS = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
]

export default function ConfiguracionPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'empresa')

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Configuración</h1><p className="page-subtitle">Datos de empresa, sucursales, puntos de venta y usuarios</p></div>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'empresa' && <EmpresaTab />}
      {tab === 'sucursales' && <SucursalesTab />}
      {tab === 'pdv' && <PuntosVentaTab />}
      {tab === 'usuarios' && <UsuariosTab />}
    </div>
  )
}

function EmpresaTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/configuracion/empresa')
      const json = await res.json()
      setData(json.data)
      setForm(json.data ?? {})
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/empresa', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toastSuccess('Empresa actualizada')
      fetchData()
    } catch { toastError('Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card"><p className="text-xs text-muted-foreground">Clientes</p><p className="text-xl font-bold">{data?._count?.customers ?? 0}</p></div>
        <div className="metric-card"><p className="text-xs text-muted-foreground">Productos</p><p className="text-xl font-bold">{data?._count?.products ?? 0}</p></div>
        <div className="metric-card"><p className="text-xs text-muted-foreground">Ventas</p><p className="text-xl font-bold">{data?._count?.sales ?? 0}</p></div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="font-semibold text-sm flex items-center gap-2"><Building2 size={15} />Datos generales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre comercial</label>
            <input value={form.name ?? ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Razón social</label>
            <input value={form.legalName ?? ''} onChange={e => setForm((f: any) => ({ ...f, legalName: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CUIT</label>
            <input value={form.cuit ?? ''} onChange={e => setForm((f: any) => ({ ...f, cuit: e.target.value }))}
              placeholder="30-12345678-9"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Condición IVA</label>
            <select value={form.ivaCondition ?? ''} onChange={e => setForm((f: any) => ({ ...f, ivaCondition: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none">
              {IVA_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input value={form.email ?? ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Teléfono</label>
            <input value={form.phone ?? ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Dirección</label>
            <input value={form.address ?? ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ciudad</label>
            <input value={form.city ?? ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Provincia</label>
            <input value={form.province ?? ''} onChange={e => setForm((f: any) => ({ ...f, province: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

function SucursalesTab() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '', isMain: false })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/configuracion/sucursales')
      const json = await res.json()
      setBranches(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!form.name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/sucursales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toastSuccess('Sucursal creada')
      setShowModal(false)
      setForm({ name: '', address: '', phone: '', isMain: false })
      fetchData()
    } catch { toastError('Error al crear') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={15} />Nueva sucursal
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {branches.map(b => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={15} className="text-blue-600" />
              <p className="font-semibold">{b.name}</p>
              {b.isMain && <span className="badge-info text-xs">Principal</span>}
            </div>
            {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
            <p className="text-xs text-muted-foreground mt-2">{b.pointsOfSale?.length ?? 0} punto(s) de venta</p>
          </div>
        ))}
      </div>

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva sucursal">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nueva sucursal</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono"
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

function PuntosVentaTab() {
  return (
    <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
      <Receipt size={36} className="mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground text-sm">Los puntos de venta se gestionan dentro de cada sucursal.</p>
    </div>
  )
}

function UsuariosTab() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/configuracion/usuarios')
      const json = await res.json()
      setUsers(json.data ?? [])
      setRoles(json.roles ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!form.name || !form.email) { toastError('Nombre y email requeridos'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Usuario agregado', form.name)
      setShowModal(false)
      setForm({ name: '', email: '', password: '', roleId: '' })
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={15} />Invitar usuario
        </button>
      </div>

      <div className="table-container">
        <table className="w-full text-sm">
          <thead><tr className="table-header border-b border-border">
            <th className="table-cell text-left font-medium">Usuario</th>
            <th className="table-cell text-left font-medium hidden sm:table-cell">Email</th>
            <th className="table-cell text-center font-medium">Rol</th>
            <th className="table-cell text-center font-medium">Estado</th>
          </tr></thead>
          <tbody>
            {users.map(cu => (
              <tr key={cu.id} className="table-row">
                <td className="table-cell font-medium">{cu.user.name ?? '—'}</td>
                <td className="table-cell hidden sm:table-cell text-muted-foreground">{cu.user.email}</td>
                <td className="table-cell text-center"><span className="badge-info">{cu.role?.name ?? 'Sin rol'}</span></td>
                <td className="table-cell text-center"><span className={cu.user.isActive ? 'badge-success' : 'badge-neutral'}>{cu.user.isActive ? 'Activo' : 'Inactivo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo usuario">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Invitar usuario</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo *"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Contraseña temporal" type="password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">Sin rol asignado</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Invitar
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
