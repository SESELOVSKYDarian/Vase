// components/modules/contabilidad/ContabilidadPanel.tsx
'use client'

import { useState, useCallback } from 'react'
import { formatCurrency, formatDate, formatInvoiceNumber, cn } from '@/utils'
import { toastError, toastSuccess } from '@/components/ui/Toaster'
import { Download, BookOpen, Loader2, FileText, Calculator, TrendingUp, TrendingDown } from 'lucide-react'

const TABS = [
  { id: 'iva_ventas', label: 'Libro IVA Ventas', icon: TrendingUp },
  { id: 'iva_compras', label: 'Libro IVA Compras', icon: TrendingDown },
  { id: 'cuentas', label: 'Plan de Cuentas', icon: Calculator },
]

const PLAN_CUENTAS = [
  { codigo: '1', nombre: 'ACTIVO', nivel: 0, tipo: 'header' },
  { codigo: '1.1', nombre: 'Activo Corriente', nivel: 1, tipo: 'header' },
  { codigo: '1.1.1', nombre: 'Caja y Bancos', nivel: 2, tipo: 'cuenta' },
  { codigo: '1.1.2', nombre: 'Créditos por Ventas', nivel: 2, tipo: 'cuenta' },
  { codigo: '1.1.3', nombre: 'Mercaderías', nivel: 2, tipo: 'cuenta' },
  { codigo: '1.1.4', nombre: 'IVA Crédito Fiscal', nivel: 2, tipo: 'cuenta' },
  { codigo: '1.2', nombre: 'Activo No Corriente', nivel: 1, tipo: 'header' },
  { codigo: '1.2.1', nombre: 'Bienes de Uso', nivel: 2, tipo: 'cuenta' },
  { codigo: '2', nombre: 'PASIVO', nivel: 0, tipo: 'header' },
  { codigo: '2.1', nombre: 'Pasivo Corriente', nivel: 1, tipo: 'header' },
  { codigo: '2.1.1', nombre: 'Deudas Comerciales', nivel: 2, tipo: 'cuenta' },
  { codigo: '2.1.2', nombre: 'IVA Débito Fiscal', nivel: 2, tipo: 'cuenta' },
  { codigo: '2.1.3', nombre: 'Sueldos a Pagar', nivel: 2, tipo: 'cuenta' },
  { codigo: '2.1.4', nombre: 'Cargas Sociales a Pagar', nivel: 2, tipo: 'cuenta' },
  { codigo: '3', nombre: 'PATRIMONIO NETO', nivel: 0, tipo: 'header' },
  { codigo: '3.1', nombre: 'Capital Social', nivel: 1, tipo: 'cuenta' },
  { codigo: '3.2', nombre: 'Resultados No Asignados', nivel: 1, tipo: 'cuenta' },
  { codigo: '4', nombre: 'INGRESOS', nivel: 0, tipo: 'header' },
  { codigo: '4.1', nombre: 'Ventas', nivel: 1, tipo: 'cuenta' },
  { codigo: '4.2', nombre: 'Otros Ingresos', nivel: 1, tipo: 'cuenta' },
  { codigo: '5', nombre: 'EGRESOS', nivel: 0, tipo: 'header' },
  { codigo: '5.1', nombre: 'Costo de Mercaderías Vendidas', nivel: 1, tipo: 'cuenta' },
  { codigo: '5.2', nombre: 'Gastos de Comercialización', nivel: 1, tipo: 'cuenta' },
  { codigo: '5.3', nombre: 'Gastos de Administración', nivel: 1, tipo: 'cuenta' },
  { codigo: '5.4', nombre: 'Gastos Financieros', nivel: 1, tipo: 'cuenta' },
]

export function ContabilidadPanel() {
  const [tab, setTab] = useState('iva_ventas')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))

  const fetchData = useCallback(async (tipo: string) => {
    if (tipo === 'cuentas') { setData(null); return }
    setLoading(true)
    setData(null)
    try {
      const params = new URLSearchParams({ tipo, from, to })
      const res = await fetch(`/api/reportes?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
    } catch { toastError('Error al cargar datos') }
    finally { setLoading(false) }
  }, [from, to])

  function handleTabChange(id: string) {
    setTab(id)
    fetchData(id)
  }

  function exportCSV(tipo: string) {
    if (!data?.data?.length) { toastError('No hay datos para exportar'); return }
    const items = data.data

    let headers: string[]
    let rows: string[][]

    if (tipo === 'iva_ventas') {
      headers = ['Fecha', 'Tipo', 'Letra', 'Punto Venta', 'Número', 'Cliente', 'CUIT', 'Cond. IVA', 'Neto Gravado', 'IVA', 'Total', 'CAE']
      rows = items.map((inv: any) => [
        formatDate(inv.date),
        inv.type,
        inv.letter,
        String(inv.pointOfSale?.number ?? 0).padStart(4, '0'),
        String(inv.number).padStart(8, '0'),
        inv.customer?.name ?? 'Consumidor Final',
        inv.customer?.documentNumber ?? '',
        inv.customer?.ivaCondition ?? '',
        String(Number(inv.subtotal).toFixed(2)),
        String(Number(inv.ivaAmount).toFixed(2)),
        String(Number(inv.total).toFixed(2)),
        inv.cae ?? '',
      ])
    } else {
      headers = ['Fecha', 'Proveedor', 'Número', 'Neto', 'IVA', 'Total']
      rows = items.map((p: any) => [
        formatDate(p.date),
        p.supplier?.name ?? '',
        p.number ?? '',
        String(Number(p.subtotal).toFixed(2)),
        String(Number(p.ivaAmount).toFixed(2)),
        String(Number(p.total).toFixed(2)),
      ])
    }

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `libro_${tipo}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toastSuccess('Archivo exportado', `libro_${tipo}_${from}_${to}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
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
          <div className="mt-5">
            <button onClick={() => fetchData(tab)} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Buscar
            </button>
          </div>
        </div>
        {data?.data?.length > 0 && tab !== 'cuentas' && (
          <button onClick={() => exportCSV(tab)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Download size={15} /> Exportar CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Libro IVA Ventas */}
      {tab === 'iva_ventas' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
          ) : !data ? (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná un período y hacé click en Buscar</p>
            </div>
          ) : (
            <>
              {/* Resumen */}
              {data.totals && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-muted/50 border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">Neto Gravado</p>
                    <p className="text-xl font-bold">{formatCurrency(data.totals.subtotal)}</p>
                  </div>
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4">
                    <p className="text-xs text-muted-foreground mb-1">IVA Débito Fiscal</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(data.totals.iva)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Facturado</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(data.totals.total)}</p>
                  </div>
                </div>
              )}
              {/* Tabla */}
              <div className="table-container">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-header border-b border-border">
                      <th className="table-cell text-left font-medium">Fecha</th>
                      <th className="table-cell text-left font-medium">Comprobante</th>
                      <th className="table-cell text-left font-medium hidden md:table-cell">Cliente / CUIT</th>
                      <th className="table-cell text-right font-medium">Neto</th>
                      <th className="table-cell text-right font-medium">IVA</th>
                      <th className="table-cell text-right font-medium">Total</th>
                      <th className="table-cell text-left font-medium hidden lg:table-cell">CAE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data?.length === 0 ? (
                      <tr><td colSpan={7} className="table-cell text-center py-10 text-muted-foreground">No hay comprobantes para el período.</td></tr>
                    ) : data.data?.map((inv: any) => (
                      <tr key={inv.id} className="table-row">
                        <td className="table-cell text-muted-foreground">{formatDate(inv.date)}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-6 h-6 rounded text-xs font-bold flex items-center justify-center',
                              inv.letter === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                              inv.letter === 'B' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                            )}>{inv.letter}</span>
                            <span className="font-mono text-xs">{formatInvoiceNumber(inv.pointOfSale?.number ?? 0, inv.number)}</span>
                          </div>
                        </td>
                        <td className="table-cell hidden md:table-cell">
                          <p className="font-medium text-xs">{inv.customer?.name ?? 'Consumidor Final'}</p>
                          {inv.customer?.documentNumber && <p className="text-xs text-muted-foreground font-mono">{inv.customer.documentNumber}</p>}
                        </td>
                        <td className="table-cell text-right font-mono text-xs">{formatCurrency(inv.subtotal)}</td>
                        <td className="table-cell text-right font-mono text-xs text-orange-600">{formatCurrency(inv.ivaAmount)}</td>
                        <td className="table-cell text-right font-mono text-xs font-bold">{formatCurrency(inv.total)}</td>
                        <td className="table-cell hidden lg:table-cell">
                          {inv.cae ? <span className="font-mono text-xs text-green-700 dark:text-green-400">{inv.cae}</span> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {data.totals && (
                    <tfoot className="bg-muted/50">
                      <tr className="border-t-2 border-border font-bold">
                        <td className="table-cell" colSpan={3}>TOTALES ({data.count} comprobantes)</td>
                        <td className="table-cell text-right font-mono">{formatCurrency(data.totals.subtotal)}</td>
                        <td className="table-cell text-right font-mono text-orange-600">{formatCurrency(data.totals.iva)}</td>
                        <td className="table-cell text-right font-mono text-primary">{formatCurrency(data.totals.total)}</td>
                        <td className="table-cell hidden lg:table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Libro IVA Compras */}
      {tab === 'iva_compras' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
          ) : !data ? (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná un período y hacé click en Buscar</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header border-b border-border">
                    <th className="table-cell text-left font-medium">Fecha</th>
                    <th className="table-cell text-left font-medium">Proveedor</th>
                    <th className="table-cell text-left font-medium hidden md:table-cell">N° Factura</th>
                    <th className="table-cell text-right font-medium">Neto</th>
                    <th className="table-cell text-right font-medium">IVA Crédito</th>
                    <th className="table-cell text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(!data.data || data.data.length === 0) ? (
                    <tr><td colSpan={6} className="table-cell text-center py-10 text-muted-foreground">No hay compras para el período.</td></tr>
                  ) : data.data?.map((p: any) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="table-cell font-medium">{p.supplier?.name}</td>
                      <td className="table-cell hidden md:table-cell font-mono text-xs text-muted-foreground">{p.number ?? '—'}</td>
                      <td className="table-cell text-right font-mono text-xs">{formatCurrency(p.subtotal)}</td>
                      <td className="table-cell text-right font-mono text-xs text-blue-600">{formatCurrency(p.ivaAmount)}</td>
                      <td className="table-cell text-right font-mono text-xs font-bold">{formatCurrency(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Plan de cuentas */}
      {tab === 'cuentas' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Calculator size={16} className="text-primary" />Plan de Cuentas General</h3>
            <span className="text-xs text-muted-foreground">{PLAN_CUENTAS.length} cuentas</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header border-b border-border">
                <th className="table-cell text-left font-medium w-28">Código</th>
                <th className="table-cell text-left font-medium">Nombre de cuenta</th>
                <th className="table-cell text-center font-medium hidden sm:table-cell">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_CUENTAS.map((c) => (
                <tr key={c.codigo} className={cn('border-b border-border/50 last:border-0', c.tipo === 'header' && 'bg-muted/30')}>
                  <td className={cn('px-4 py-2.5 font-mono text-sm', c.nivel === 0 ? 'font-bold' : '')}
                    style={{ paddingLeft: `${16 + c.nivel * 20}px` }}>
                    {c.codigo}
                  </td>
                  <td className={cn('px-4 py-2.5', c.nivel === 0 ? 'font-bold uppercase tracking-wide text-xs' : c.nivel === 1 ? 'font-semibold' : 'text-muted-foreground')}
                    style={{ paddingLeft: `${16 + c.nivel * 20}px` }}>
                    {c.nombre}
                  </td>
                  <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                    {c.tipo === 'header'
                      ? <span className="badge-neutral text-xs">Rubro</span>
                      : <span className="badge-info text-xs">Cuenta</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
