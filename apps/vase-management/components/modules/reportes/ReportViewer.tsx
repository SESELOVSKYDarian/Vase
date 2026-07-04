'use client'
// components/modules/reportes/ReportViewer.tsx

import { useState } from 'react'
import { formatCurrency, cn } from '@/utils'
import { FileSpreadsheet, BarChart2, Table, Download, ChevronUp, ChevronDown } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface Props {
  report: any
  result: {
    columns: { key: string; label: string; type: string }[]
    rows: Record<string, any>[]
    summary?: Record<string, any>
    chartData?: any[]
    total: number
  }
  onExport?: () => void
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

const BADGE_COLORS: Record<string, string> = {
  AUTHORIZED: 'badge-success', PENDING: 'badge-warning', CANCELLED: 'badge-error',
  ERROR: 'badge-error', CONFIRMED: 'badge-success', DRAFT: 'badge-neutral',
  DELIVERED: 'badge-info', INVOICED: 'badge-success',
  ENTRY: 'badge-success', EXIT: 'badge-error', ADJUSTMENT: 'badge-warning',
  SALE: 'badge-info', PURCHASE: 'badge-success',
  ALTO: 'badge-error', MEDIO: 'badge-warning', BAJO: 'badge-success', BLOQUEADO: 'badge-error',
  NORMAL: 'badge-success', CRITICO: 'badge-warning', SIN_STOCK: 'badge-error',
  INCOME: 'badge-success', EXPENSE: 'badge-error',
}

function formatCell(value: any, type: string): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground/40">—</span>
  switch (type) {
    case 'currency': return <span className="font-mono tabular-nums">{formatCurrency(value)}</span>
    case 'number': return <span className="font-mono tabular-nums">{Number(value).toLocaleString('es-AR')}</span>
    case 'percent': return <span className="font-mono tabular-nums">{Number(value).toFixed(2)}%</span>
    case 'date': return <span className="text-muted-foreground">{String(value).slice(0,10).split('-').reverse().join('/')}</span>
    case 'badge': return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase', BADGE_COLORS[String(value)] ?? 'badge-neutral')}>{value}</span>
    default: return <span className="truncate max-w-48 block">{String(value)}</span>
  }
}

type SortDir = 'asc' | 'desc' | null

export function ReportViewer({ report, result, onExport }: Props) {
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [page, setPage] = useState(1)
  const pageSize = 25

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')
      if (sortDir === 'desc') setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const sorted = [...result.rows].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    const va = a[sortKey]; const vb = b[sortKey]
    const n = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? n : -n
  })

  const pageCount = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const chartData = result.chartData ?? []
  const numericCols = result.columns.filter(c => ['currency','number','percent'].includes(c.type))

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate max-w-56">{report.name}</p>
          <span className="text-xs text-muted-foreground">{result.total} filas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView('table')} className={cn('px-2.5 py-1.5 text-xs', view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <Table size={13} />
            </button>
            {(chartData.length > 0 || numericCols.length > 0) && (
              <button onClick={() => setView('chart')} className={cn('px-2.5 py-1.5 text-xs', view === 'chart' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <BarChart2 size={13} />
              </button>
            )}
          </div>
          {onExport && (
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs hover:bg-muted">
              <FileSpreadsheet size={13} className="text-green-600" />Excel
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      {result.summary && Object.keys(result.summary).length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-muted/20 border-b border-border">
          {Object.entries(result.summary).map(([key, val]) => {
            const label = key.replace(/([A-Z])/g,' $1').replace(/^./, s => s.toUpperCase())
            const isNum = typeof val === 'number'
            return (
              <div key={key} className="text-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-sm font-bold">
                  {isNum && val > 100 ? formatCurrency(val as number) : String(val)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista tabla */}
      {view === 'table' && (
        <>
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  {result.columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                          : <ChevronDown size={11} className="opacity-0 group-hover:opacity-50" />
                        }
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={result.columns.length} className="text-center py-12 text-muted-foreground text-sm">Sin datos</td></tr>
                ) : paginated.map((row, i) => (
                  <tr key={row.id ?? i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    {result.columns.map(col => (
                      <td key={col.key} className={cn('px-3 py-2', ['currency','number','percent'].includes(col.type) && 'text-right')}>
                        {formatCell(row[col.key], col.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {(page-1)*pageSize+1}–{Math.min(page*pageSize, sorted.length)} de {sorted.length}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('w-7 h-7 rounded text-xs', p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                    {p}
                  </button>
                ))}
                {pageCount > 7 && <span className="text-muted-foreground px-1">...</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Vista gráfico */}
      {view === 'chart' && (
        <div className="p-4 space-y-4">
          {chartData.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Evolución temporal</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : numericCols.length > 0 && sorted.length <= 20 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">Distribución por registros</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sorted.slice(0,20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey={result.columns[0]?.key} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey={numericCols[0]?.key} fill="#3b82f6" radius={[3,3,0,0]} name={numericCols[0]?.label} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No hay datos suficientes para graficar</div>
          )}
        </div>
      )}
    </div>
  )
}
