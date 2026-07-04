'use client'
// app/dashboard/reportes/guardados/page.tsx

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import {
  BookMarked, Plus, Play, Download, Trash2, Edit2,
  Loader2, RefreshCw, Calendar, Clock, BarChart2,
  Table, FileSpreadsheet, Bot, Search, Filter
} from 'lucide-react'
import { ReportViewer } from '@/components/modules/reportes/ReportViewer'

const ENTITY_LABELS: Record<string, string> = {
  customers: 'Clientes', sales: 'Ventas', products: 'Productos',
  stock: 'Stock', invoices: 'Facturas', purchases: 'Compras', payments: 'Caja',
}

const DATE_RANGE_LABELS: Record<string, string> = {
  CURRENT_MONTH: 'Mes actual', LAST_MONTH: 'Mes anterior',
  LAST_7_DAYS: 'Últimos 7 días', LAST_30_DAYS: 'Últimos 30 días',
  CURRENT_YEAR: 'Año actual', CUSTOM: 'Personalizado',
}

export default function ReportesGuardadosPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [activeReport, setActiveReport] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEntity) params.set('entity', filterEntity)
      const res = await fetch(`/api/reportes/guardados?${params}`)
      const json = await res.json()
      setReports(json.data ?? [])
    } catch { toastError('Error al cargar reportes') }
    finally { setLoading(false) }
  }, [filterEntity])

  useEffect(() => { fetchReports() }, [fetchReports])

  const filtered = reports.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleExecute(report: any) {
    setExecuting(report.id)
    setActiveReport(report)
    setResult(null)
    try {
      const res = await fetch(`/api/reportes/guardados/${report.id}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json.data)
      toastSuccess('Reporte ejecutado', `${json.data.total} registros`)
    } catch (err: any) {
      toastError('Error al ejecutar', err.message)
    } finally {
      setExecuting(null)
    }
  }

  async function handleExport(reportId: string, format: 'excel') {
    try {
      const res = await fetch('/api/reportes/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, format }),
      })
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${reportId.slice(0, 8)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Excel exportado')
    } catch { toastError('Error al exportar') }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este reporte guardado?')) return
    try {
      await fetch(`/api/reportes/guardados/${id}`, { method: 'DELETE' })
      toastSuccess('Reporte eliminado')
      fetchReports()
      if (activeReport?.id === id) { setActiveReport(null); setResult(null) }
    } catch { toastError('Error al eliminar') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes Guardados</h1>
          <p className="page-subtitle">Tus reportes personalizados y recurrentes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReports} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground">
            <RefreshCw size={15} />
          </button>
          <Link href="/dashboard/reportes/generador"
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm">
            <Bot size={15} />Crear con IA
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar reportes..."
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filterEntity}
          onChange={e => setFilterEntity(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none"
        >
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Lista de reportes */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <BookMarked size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No hay reportes guardados</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Creá uno con el Generador IA</p>
              <Link href="/dashboard/reportes/generador"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                <Bot size={14} />Generar con IA
              </Link>
            </div>
          ) : filtered.map(report => (
            <div
              key={report.id}
              onClick={() => { setActiveReport(report); setResult(null) }}
              className={`rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-all ${
                activeReport?.id === report.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{report.name}</p>
                  {report.description && (
                    <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); handleExport(report.id, 'excel') }}
                    className="w-7 h-7 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center text-muted-foreground hover:text-green-600"
                    title="Exportar Excel"
                  >
                    <FileSpreadsheet size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(report.id) }}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="badge-info">{ENTITY_LABELS[report.entity] ?? report.entity}</span>
                {report.dateRange && (
                  <span className="badge-neutral">{DATE_RANGE_LABELS[report.dateRange] ?? report.dateRange}</span>
                )}
                {report.isScheduled && (
                  <span className="badge-success flex items-center gap-1">
                    <Clock size={9} />Programado
                  </span>
                )}
                {report.format === 'CHART' && (
                  <span className="badge-warning flex items-center gap-1">
                    <BarChart2 size={9} />Gráfico
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {report._count?.executions ?? 0} ejecuciones
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleExecute(report) }}
                  disabled={executing === report.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {executing === report.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Play size={11} />
                  }
                  Ejecutar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Visor de resultados */}
        <div className="lg:col-span-3">
          {result && activeReport ? (
            <ReportViewer
              report={activeReport}
              result={result}
              onExport={() => handleExport(activeReport.id, 'excel')}
            />
          ) : activeReport ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center h-full flex flex-col items-center justify-center">
              <BarChart2 size={40} className="text-muted-foreground/30 mb-3" />
              <p className="font-medium text-sm mb-1">{activeReport.name}</p>
              <p className="text-muted-foreground text-xs mb-6">
                Entidad: {ENTITY_LABELS[activeReport.entity]} · {DATE_RANGE_LABELS[activeReport.dateRange] ?? 'Sin período'}
              </p>
              <button
                onClick={() => handleExecute(activeReport)}
                disabled={!!executing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                {executing ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Ejecutar reporte
              </button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border h-full min-h-64 flex flex-col items-center justify-center text-center p-8">
              <Table size={36} className="text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná un reporte para ejecutarlo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
