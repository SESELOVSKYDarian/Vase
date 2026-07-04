// components/modules/tesoreria/FlujoCajaPanel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Loader2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-4 py-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((e: any) => (
        <p key={e.dataKey} style={{ color: e.color }} className="font-semibold">
          {e.name}: {formatCurrency(e.value)}
        </p>
      ))}
    </div>
  )
}

export function FlujoCajaPanel() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tipo: 'flujo_caja', from, to })
      const res = await fetch(`/api/reportes?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch { toastError('Error al cargar flujo de caja') }
    finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { fetchData() }, [fetchData])

  // Agrupar ingresos y egresos por día
  const chartData = (() => {
    if (!data) return []
    const days: Record<string, { date: string; ingresos: number; egresos: number }> = {}
    const addDay = (dateStr: string) => {
      const key = new Date(dateStr).toISOString().slice(0, 10)
      if (!days[key]) days[key] = { date: key, ingresos: 0, egresos: 0 }
      return key
    }
    data.income?.forEach((m: any) => { const k = addDay(m.date); days[k].ingresos += Number(m.amount) })
    data.expense?.forEach((m: any) => { const k = addDay(m.date); days[k].egresos += Number(m.amount) })
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, date: d.date.slice(5).replace('-', '/') }))
  })()

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none" />
        </div>
        <button onClick={fetchData} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : !data ? null : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-5">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(data.totalIncome ?? 0)}</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Total Egresos</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(data.totalExpense ?? 0)}</p>
            </div>
            <div className={cn('rounded-xl border p-5',
              (data.balance ?? 0) >= 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            )}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Balance Neto</p>
              <p className={cn('text-2xl font-bold', (data.balance ?? 0) >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300')}>
                {formatCurrency(data.balance ?? 0)}
              </p>
            </div>
          </div>

          {/* Gráfico barras agrupadas */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Ingresos vs Egresos por día</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico área acumulado */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Flujo acumulado</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={chartData.map((d, i, arr) => ({
                    ...d,
                    acumulado: arr.slice(0, i + 1).reduce((s, x) => s + x.ingresos - x.egresos, 0),
                  }))}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="acumulado" name="Saldo acumulado" stroke="#3b82f6" strokeWidth={2} fill="url(#gradAcum)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
