'use client'
// app/dashboard/clientes/riesgo/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  AlertTriangle, ShieldCheck, ShieldAlert, ShieldX,
  Loader2, RefreshCw, TrendingUp, Edit2, X
} from 'lucide-react'

const RISK_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  BAJO: { label: 'Bajo', icon: <ShieldCheck size={14} />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  MEDIO: { label: 'Medio', icon: <ShieldAlert size={14} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  ALTO: { label: 'Alto', icon: <AlertTriangle size={14} />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  BLOQUEADO: { label: 'Bloqueado', icon: <ShieldX size={14} />, color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700' },
}

export default function RiesgoCrediticioPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [editForm, setEditForm] = useState({ creditLimit: 0, creditRisk: 'BAJO' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r2 = await fetch('/api/clientes?limit=200&orderBy=totalDebt&orderDir=desc')
      const json = await r2.json()
      setCustomers(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openEdit(c: any) {
    setEditingCustomer(c)
    setEditForm({ creditLimit: Number(c.creditLimit ?? 0), creditRisk: c.creditRisk ?? 'BAJO' })
  }

  async function handleSave() {
    if (!editingCustomer) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clientes/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Error al guardar')
      toastSuccess('Actualizado', editingCustomer.name)
      setEditingCustomer(null)
      fetchData()
    } catch { toastError('Error al guardar') }
    finally { setSaving(false) }
  }

  const filtered = filterRisk ? customers.filter(c => c.creditRisk === filterRisk) : customers
  const withCredit = customers.filter(c => Number(c.creditLimit) > 0)
  const stats = {
    total: customers.length,
    alto: customers.filter(c => c.creditRisk === 'ALTO' || c.creditRisk === 'BLOQUEADO').length,
    totalDebt: customers.reduce((s, c) => s + Number(c.totalDebt ?? 0), 0),
    overLimit: withCredit.filter(c => Number(c.totalDebt) > Number(c.creditLimit)).length,
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Riesgo Crediticio</h1><p className="page-subtitle">Análisis de riesgo y límites de crédito por cliente</p></div>
        <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-xs text-muted-foreground mb-1">Total clientes</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-muted-foreground mb-1">Riesgo alto/bloqueado</p>
          <p className="text-2xl font-bold text-red-600">{stats.alto}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-muted-foreground mb-1">Deuda total</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalDebt)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-muted-foreground mb-1">Exceden límite</p>
          <p className="text-2xl font-bold text-red-600">{stats.overLimit}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterRisk('')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterRisk === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>
          Todos
        </button>
        {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterRisk(filterRisk === key ? '' : key)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5',
              filterRisk === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}>
            {cfg.icon}{cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium">Cliente</th>
                <th className="table-cell text-left font-medium hidden md:table-cell">CUIT/DNI</th>
                <th className="table-cell text-right font-medium">Límite crédito</th>
                <th className="table-cell text-right font-medium">Deuda actual</th>
                <th className="table-cell text-right font-medium hidden sm:table-cell">Uso %</th>
                <th className="table-cell text-center font-medium">Riesgo</th>
                <th className="table-cell text-center font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center py-12 text-muted-foreground">Sin clientes en esta categoría</td></tr>
              ) : filtered.map(c => {
                const limit = Number(c.creditLimit ?? 0)
                const debt = Number(c.totalDebt ?? 0)
                const usage = limit > 0 ? (debt / limit) * 100 : 0
                const cfg = RISK_CONFIG[c.creditRisk ?? 'BAJO']
                return (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell font-medium">{c.name}</td>
                    <td className="table-cell hidden md:table-cell text-muted-foreground">{c.documentNumber ?? '—'}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(limit)}</td>
                    <td className="table-cell text-right font-mono font-semibold">
                      <span className={debt > limit && limit > 0 ? 'text-red-600' : ''}>{formatCurrency(debt)}</span>
                    </td>
                    <td className="table-cell text-right hidden sm:table-cell">
                      {limit > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full', usage >= 100 ? 'bg-red-500' : usage >= 80 ? 'bg-amber-500' : 'bg-green-500')}
                              style={{ width: `${Math.min(usage, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">{usage.toFixed(0)}%</span>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">Sin límite</span>}
                    </td>
                    <td className="table-cell text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border', cfg.bg, cfg.color)}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <LegacyDialog open={!!editingCustomer} onOpenChange={(open) => { if (!open) setEditingCustomer(null) }} label="Editar riesgo crediticio">
        {editingCustomer && (
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">{editingCustomer.name}</h2>
              <button onClick={() => setEditingCustomer(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Límite de crédito</label>
                <input type="number" value={editForm.creditLimit}
                  onChange={e => setEditForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nivel de riesgo</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setEditForm(f => ({ ...f, creditRisk: key }))}
                      className={cn('px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5',
                        editForm.creditRisk === key ? `${cfg.bg} ${cfg.color} border-current` : 'border-border text-muted-foreground hover:bg-muted'
                      )}>
                      {cfg.icon}{cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setEditingCustomer(null)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Guardar
              </button>
            </div>
          </div>
        )}
      </LegacyDialog>
    </div>
  )
}
