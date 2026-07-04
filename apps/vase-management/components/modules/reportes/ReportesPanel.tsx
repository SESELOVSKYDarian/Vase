// components/modules/reportes/ReportesPanel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { Loader2, Download, BarChart3, Users, Package, TrendingUp, FileText, Wallet, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'

const REPORT_TYPES = [
  { id: 'ventas_mes', label: 'Ventas del mes', icon: TrendingUp, color: 'text-blue-600' },
  { id: 'productos_top', label: 'Top productos', icon: Package, color: 'text-green-600' },
  { id: 'clientes_top', label: 'Top clientes', icon: Users, color: 'text-purple-600' },
  { id: 'stock_critico', label: 'Stock crítico', icon: AlertTriangle, color: 'text-red-600' },
  { id: 'iva_ventas', label: 'Libro IVA ventas', icon: FileText, color: 'text-orange-600' },
  { id: 'cuentas_cobrar', label: 'Cuentas por cobrar', icon: Wallet, color: 'text-teal-600' },
  { id: 'flujo_caja', label: 'Flujo de caja', icon: BarChart3, color: 'text-indigo-600' },
]

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-4 py-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((e: any) => (
        <p key={e.dataKey} style={{ color: e.color }} className="font-semibold">
          {typeof e.value === 'number' && e.value > 100 ? formatCurrency(e.value) : e.value}
        </p>
      ))}
    </div>
  )
}

export function ReportesPanel() {
  const [activeReport, setActiveReport] = useState('ventas_mes')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setData(null)
    try {
      const params = new URLSearchParams({ tipo: activeReport, from, to })
      const res = await fetch(`/api/reportes?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch { toastError('Error al generar reporte') }
    finally { setLoading(false) }
  }, [activeReport, from, to])

  useEffect(() => { fetchReport() }, [fetchReport])

  function exportCSV() {
    if (!data?.data) return
    const rows = data.data
    if (!rows.length) return
    const keys = Object.keys(rows[0]).filter((k) => !['id', 'companyId', 'items'].includes(k))
    const csv = [
      keys.join(','),
      ...rows.map((row: any) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${activeReport}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeInfo = REPORT_TYPES.find((r) => r.id === activeReport)!

  return (
    <div className="space-y-6">
      {/* Filtros de fecha + export */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <button onClick={exportCSV} disabled={!data?.data?.length}
          className="h-9 flex items-center gap-2 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted disabled:opacity-40 transition-colors">
          <Download size={15} />Exportar CSV
        </button>
      </div>

      {/* Tabs de reportes */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((r) => {
          const Icon = r.icon
          return (
            <button key={r.id} onClick={() => setActiveReport(r.id)}
              className={cn('flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-colors',
                activeReport === r.id ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted text-muted-foreground'
              )}>
              <Icon size={14} />
              {r.label}
            </button>
          )
        })}
      </div>

      {/* Contenido del reporte */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <activeInfo.icon size={18} className={activeInfo.color} />
            {activeInfo.label}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
        ) : !data ? null : (
          <div className="p-5">
            {/* Ventas del mes */}
            {activeReport === 'ventas_mes' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total ventas</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(data.totalAmount ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Cantidad</p>
                    <p className="text-xl font-bold">{data.total ?? 0} ventas</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Ticket promedio</p>
                    <p className="text-xl font-bold">{data.total ? formatCurrency((data.totalAmount ?? 0) / data.total) : '—'}</p>
                  </div>
                </div>
                {data.byDay?.length > 0 && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={48} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <ReportTable headers={['Cliente', 'Fecha', 'Tipo', 'Total']}
                  rows={(data.data ?? []).slice(0, 20).map((s: any) => [
                    s.customer?.name ?? 'Consumidor Final',
                    formatDate(s.date),
                    s.type,
                    formatCurrency(s.total),
                  ])} />
              </div>
            )}

            {/* Top productos */}
            {activeReport === 'productos_top' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.data ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="product.name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <ReportTable headers={['Producto', 'Código', 'Cantidad', 'Ingresos']}
                    rows={(data.data ?? []).map((i: any) => [
                      i.product?.name ?? '—',
                      i.product?.code ?? '—',
                      Number(i.quantity).toFixed(0),
                      formatCurrency(i.revenue),
                    ])} />
                </div>
              </div>
            )}

            {/* Top clientes */}
            {activeReport === 'clientes_top' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.data ?? []} cx="50%" cy="50%" outerRadius={100} dataKey="total" nameKey="customer.name" label={({ name, percent }: any) => `${name?.slice(0, 12)} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                        {(data.data ?? []).map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ReportTable headers={['Cliente', 'Documento', 'Compras', 'Total']}
                    rows={(data.data ?? []).map((c: any) => [
                      c.customer?.name ?? '—',
                      c.customer?.documentNumber ?? '—',
                      c._count,
                      formatCurrency(c.total),
                    ])} />
                </div>
              </div>
            )}

            {/* Stock crítico */}
            {activeReport === 'stock_critico' && (
              <div className="space-y-4">
                {data.total === 0 ? (
                  <div className="text-center py-10">
                    <Package size={40} className="mx-auto text-green-400 mb-3" />
                    <p className="font-medium text-green-600">¡Excelente! No hay productos con stock crítico</p>
                  </div>
                ) : (
                  <ReportTable
                    headers={['Código', 'Producto', 'Categoría', 'Stock actual', 'Stock mínimo', 'Diferencia']}
                    rows={(data.data ?? []).map((p: any) => [
                      p.code,
                      p.name,
                      p.category?.name ?? '—',
                      `${Number(p.stock).toFixed(0)} ${p.unit}`,
                      `${Number(p.minStock).toFixed(0)} ${p.unit}`,
                      <span key="diff" className="text-red-600 font-bold">{(Number(p.stock) - Number(p.minStock)).toFixed(0)}</span>,
                    ])}
                  />
                )}
              </div>
            )}

            {/* Libro IVA ventas */}
            {activeReport === 'iva_ventas' && (
              <div className="space-y-4">
                {data.totals && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Neto gravado</p>
                      <p className="text-lg font-bold">{formatCurrency(data.totals.subtotal)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground mb-1">IVA total</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(data.totals.iva)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total facturado</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(data.totals.total)}</p>
                    </div>
                  </div>
                )}
                <ReportTable
                  headers={['Fecha', 'Cliente', 'CUIT', 'Neto', 'IVA', 'Total', 'CAE']}
                  rows={(data.data ?? []).map((inv: any) => [
                    formatDate(inv.date),
                    inv.customer?.name ?? 'Consumidor Final',
                    inv.customer?.documentNumber ?? '—',
                    formatCurrency(inv.subtotal),
                    formatCurrency(inv.ivaAmount),
                    formatCurrency(inv.total),
                    <span key="cae" className="font-mono text-xs">{inv.cae ?? '—'}</span>,
                  ])}
                />
              </div>
            )}

            {/* Cuentas por cobrar */}
            {activeReport === 'cuentas_cobrar' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Total por cobrar</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.totalPending ?? 0)}</p>
                </div>
                <ReportTable
                  headers={['Cliente', 'Fecha', 'Total', 'Pagado', 'Pendiente']}
                  rows={(data.data ?? []).map((s: any) => [
                    s.customer?.name ?? 'Consumidor Final',
                    formatDate(s.date),
                    formatCurrency(s.total),
                    formatCurrency(s.paidAmount),
                    <span key="pendiente" className="text-red-600 font-bold">{formatCurrency(Number(s.total) - Number(s.paidAmount))}</span>,
                  ])}
                />
              </div>
            )}

            {/* Flujo de caja */}
            {activeReport === 'flujo_caja' && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(data.totalIncome ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Egresos</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(data.totalExpense ?? 0)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Balance neto</p>
                    <p className={cn('text-xl font-bold', data.balance >= 0 ? 'text-blue-600' : 'text-red-600')}>{formatCurrency(data.balance ?? 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReportTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  if (!rows.length) return <p className="text-center py-8 text-muted-foreground text-sm">Sin datos para el período seleccionado</p>
  return (
    <div className="table-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header border-b border-border">
            {headers.map((h) => <th key={h} className="table-cell text-left font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="table-row border-b border-border/50 last:border-0">
              {row.map((cell, j) => <td key={j} className="table-cell">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
