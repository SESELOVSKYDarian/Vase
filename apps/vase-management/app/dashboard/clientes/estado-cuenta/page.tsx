'use client'
// app/dashboard/clientes/estado-cuenta/page.tsx

import { useState, useCallback } from 'react'
import { formatCurrency, formatDate } from '@/utils'
import { toastError } from '@/components/ui/Toaster'
import { cn } from '@/utils'
import {
  Search, Loader2, DollarSign, TrendingUp,
  TrendingDown, FileText, AlertCircle, FileSpreadsheet
} from 'lucide-react'

export default function EstadoCuentaPage() {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [accountData, setAccountData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const searchCustomers = useCallback(async () => {
    if (!search.trim()) return
    setLoadingSearch(true)
    try {
      const res = await fetch(`/api/clientes?search=${encodeURIComponent(search)}&limit=10`)
      const json = await res.json()
      setCustomers(json.data ?? [])
    } catch { toastError('Error al buscar') }
    finally { setLoadingSearch(false) }
  }, [search])

  async function loadAccount(customer: any) {
    setSelected(customer)
    setAccountData(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ customerId: customer.id })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/clientes/estado-cuenta?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAccountData(json)
    } catch (err: any) { toastError('Error', err.message) }
    finally { setLoading(false) }
  }

  async function exportExcel() {
    if (!accountData) return
    try {
      const res = await fetch('/api/reportes/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Estado de cuenta — ${selected?.name}`,
          format: 'excel',
          columns: [
            { key: 'date', label: 'Fecha', type: 'date' },
            { key: 'type', label: 'Tipo', type: 'string' },
            { key: 'number', label: 'Comprobante', type: 'string' },
            { key: 'debe', label: 'Debe', type: 'currency' },
            { key: 'haber', label: 'Haber', type: 'currency' },
            { key: 'saldo', label: 'Saldo', type: 'currency' },
          ],
          rows: accountData.movements,
          summary: accountData.totals,
        }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `estado_cuenta_${selected?.name?.replace(/\s/g,'_')}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch { toastError('Error al exportar') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Estado de Cuenta</h1>
          <p className="page-subtitle">Extracto de cuenta corriente por cliente</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="font-semibold text-sm">Buscar cliente</p>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchCustomers()}
                placeholder="Nombre, CUIT..."
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button onClick={searchCustomers} disabled={loadingSearch}
                className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                {loadingSearch ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {customers.map(c => (
                <button key={c.id} onClick={() => loadAccount(c)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors',
                    selected?.id === c.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'
                  )}
                >
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.documentNumber ?? 'Sin CUIT'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel cuenta */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
          ) : !selected ? (
            <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
              <FileText size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Buscá y seleccioná un cliente para ver su estado de cuenta</p>
            </div>
          ) : accountData ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-lg">{accountData.customer.name}</h2>
                    <p className="text-sm text-muted-foreground">{accountData.customer.documentNumber ?? 'Sin CUIT'} · {accountData.customer.ivaCondition?.replace(/_/g,' ')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
                      <FileSpreadsheet size={13} className="text-green-600" />Excel
                    </button>
                    <button onClick={() => selected && loadAccount(selected)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Facturado', value: accountData.totals.totalFacturado, icon: <TrendingUp size={14} />, color: 'text-blue-600' },
                    { label: 'Cobrado', value: accountData.totals.totalCobrado, icon: <DollarSign size={14} />, color: 'text-green-600' },
                    { label: 'Saldo pendiente', value: accountData.totals.saldoPendiente, icon: <AlertCircle size={14} />, color: 'text-red-600' },
                    { label: 'Crédito disp.', value: accountData.totals.available, icon: <TrendingDown size={14} />, color: accountData.totals.available >= 0 ? 'text-green-600' : 'text-red-600' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                      <div className={cn('flex items-center gap-1.5 mb-1', item.color)}>
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <p className={cn('font-bold text-sm font-mono', item.color)}>
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla extracto */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm">Extracto de cuenta corriente</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Tipo</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Comprobante</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Debe</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Haber</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountData.movements.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Sin movimientos en el período</td></tr>
                      ) : accountData.movements.map((m: any, i: number) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 text-muted-foreground">{m.date}</td>
                          <td className="px-3 py-2">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                              m.type === 'FACTURA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            )}>
                              {m.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono">{m.number}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {m.debe > 0 ? <span className="text-red-600">{formatCurrency(m.debe)}</span> : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {m.haber > 0 ? <span className="text-green-600">{formatCurrency(m.haber)}</span> : '—'}
                          </td>
                          <td className={cn('px-3 py-2 text-right font-mono font-bold', m.saldo > 0 ? 'text-red-600' : 'text-green-600')}>
                            {formatCurrency(Math.abs(m.saldo))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
