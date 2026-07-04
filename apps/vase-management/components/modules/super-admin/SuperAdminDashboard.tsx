'use client'
// components/modules/super-admin/SuperAdminDashboard.tsx
//
// Componente cliente puro — NO usa useSession() porque este proyecto no
// tiene SessionProvider configurado (el patrón usado en todo el resto de
// la app es pasar `session.user` como prop desde un Server Component).
// La verificación de isSuperAdmin real y vinculante ocurre en el backend
// (requireSuperAdmin en cada endpoint /api/super-admin/*); el guard acá
// en el Server Component padre (app/dashboard/super-admin/page.tsx) es
// solo para evitar el flash de contenido antes del redirect.

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import {
  Building2, Users, Receipt, TrendingUp, Loader2,
  Shield, Ban, CheckCircle2, Search
} from 'lucide-react'

const PLAN_COLORS: Record<string, string> = {
  BASIC: 'badge-neutral', PROFESSIONAL: 'badge-info', ENTERPRISE: 'badge-success',
}

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/super-admin/metricas'),
        fetch(`/api/super-admin/empresas${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      ])
      const [mJson, cJson] = await Promise.all([mRes.json(), cRes.json()])
      if (mRes.ok) setMetrics(mJson.data)
      if (cRes.ok) setCompanies(cJson.data ?? [])
    } catch { toastError('Error al cargar métricas') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  async function toggleSuspend(company: any) {
    const action = company.isActive ? 'SUSPEND' : 'REACTIVATE'
    const reason = action === 'SUSPEND' ? prompt('Motivo de suspensión (obligatorio):') : undefined
    if (action === 'SUSPEND' && !reason) return

    try {
      const res = await fetch(`/api/super-admin/empresas/${company.id}/suspender`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toastSuccess(action === 'SUSPEND' ? 'Empresa suspendida' : 'Empresa reactivada')
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
  }

  async function changePlan(company: any, plan: string) {
    try {
      const res = await fetch(`/api/super-admin/empresas/${company.id}/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toastSuccess('Plan actualizado', plan)
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shield size={20} />Super Admin</h1>
          <p className="page-subtitle">Panel operativo de la plataforma — todas las empresas</p>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="metric-card">
                <div className="flex items-center gap-2 text-blue-600 mb-1"><Building2 size={14} /><span className="text-xs font-medium">Empresas activas</span></div>
                <p className="text-2xl font-bold">{metrics.companies.active}</p>
                <p className="text-xs text-muted-foreground">{metrics.companies.suspended} suspendidas · +{metrics.companies.newLast30Days} últ. 30d</p>
              </div>
              <div className="metric-card">
                <div className="flex items-center gap-2 text-purple-600 mb-1"><Users size={14} /><span className="text-xs font-medium">Usuarios totales</span></div>
                <p className="text-2xl font-bold">{metrics.usage.totalUsers}</p>
              </div>
              <div className="metric-card">
                <div className="flex items-center gap-2 text-green-600 mb-1"><Receipt size={14} /><span className="text-xs font-medium">Facturas del mes</span></div>
                <p className="text-2xl font-bold">{metrics.usage.invoicesThisMonth}</p>
              </div>
              <div className="metric-card">
                <div className="flex items-center gap-2 text-amber-600 mb-1"><TrendingUp size={14} /><span className="text-xs font-medium">Ventas del mes</span></div>
                <p className="text-2xl font-bold">{formatCurrency(metrics.usage.salesAmountThisMonth)}</p>
                <p className="text-xs text-muted-foreground">{metrics.usage.salesThisMonth} operaciones</p>
              </div>
            </div>
          )}

          {metrics?.companies.byPlan && (
            <div className="flex gap-3">
              {metrics.companies.byPlan.map((p: any) => (
                <div key={p.plan} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                  <span className={cn('text-xs', PLAN_COLORS[p.plan])}>{p.plan}</span>
                  <span className="font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa..."
              className="w-full max-w-sm pl-9 pr-3 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none" />
          </div>

          <div className="table-container">
            <table className="w-full text-sm">
              <thead><tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium">Empresa</th>
                <th className="table-cell text-center font-medium">Plan</th>
                <th className="table-cell text-center font-medium hidden sm:table-cell">Usuarios</th>
                <th className="table-cell text-center font-medium hidden md:table-cell">Facturas/mes</th>
                <th className="table-cell text-center font-medium">Estado</th>
                <th className="table-cell text-center font-medium">Acciones</th>
              </tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-medium">{c.name}<p className="text-xs text-muted-foreground font-normal">{c.cuit ?? '—'}</p></td>
                    <td className="table-cell text-center">
                      <select value={c.plan} onChange={(e) => changePlan(c, e.target.value)}
                        className={cn('text-xs rounded-full px-2 py-1 border-0 font-semibold cursor-pointer', PLAN_COLORS[c.plan])}>
                        <option value="BASIC">BASIC</option>
                        <option value="PROFESSIONAL">PROFESSIONAL</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>
                    <td className="table-cell text-center hidden sm:table-cell font-mono">
                      {c.usage.users}{c.limits.maxUsers !== -1 && `/${c.limits.maxUsers}`}
                    </td>
                    <td className="table-cell text-center hidden md:table-cell font-mono">
                      {c.usage.invoicesThisMonth}{c.limits.maxInvoicesPerMonth !== -1 && `/${c.limits.maxInvoicesPerMonth}`}
                    </td>
                    <td className="table-cell text-center">
                      <span className={c.isActive ? 'badge-success' : 'badge-error'}>{c.isActive ? 'Activa' : 'Suspendida'}</span>
                    </td>
                    <td className="table-cell text-center">
                      <button onClick={() => toggleSuspend(c)}
                        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium',
                          c.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20'
                        )}>
                        {c.isActive ? <><Ban size={11} />Suspender</> : <><CheckCircle2 size={11} />Reactivar</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
