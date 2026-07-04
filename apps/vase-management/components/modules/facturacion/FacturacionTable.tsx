// components/modules/facturacion/FacturacionTable.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, formatInvoiceNumber, getStatusColor, getStatusLabel, calcItemTotals } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Search, Plus, Eye, Loader2, ChevronLeft, ChevronRight, FileText, X, Trash2, RefreshCw, Receipt, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'

const LETTERS = [
  { value: '', label: 'Todas' },
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
  { value: 'M', label: 'Factura M' },
]

const IVA_OPTIONS = [
  { rate: 21, label: '21%' }, { rate: 10.5, label: '10.5%' },
  { rate: 27, label: '27%' }, { rate: 0, label: '0%' },
]

export function FacturacionTable() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [letterFilter, setLetterFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const limit = 15

  const [form, setForm] = useState({
    customerId: '',
    letter: 'B',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [] as { description: string; quantity: number; unitPrice: number; discount: number; ivaRate: number; subtotal: number; ivaAmount: number; total: number }[],
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search, ...(letterFilter && { letra: letterFilter }) })
      const [invRes, custRes] = await Promise.all([fetch(`/api/facturacion?${params}`), fetch('/api/clientes?limit=200')])
      const [inv, cust] = await Promise.all([invRes.json(), custRes.json()])
      setInvoices(inv.data ?? [])
      setTotal(inv.total ?? 0)
      setCustomers(cust.data ?? [])
    } catch { toastError('Error al cargar facturas') }
    finally { setLoading(false) }
  }, [page, search, letterFilter])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setTimeout(() => setPage(1), 300); return () => clearTimeout(t) }, [search])

  function addItem() {
    setForm((f) => ({
      ...f,
      items: [...f.items, { description: '', quantity: 1, unitPrice: 0, discount: 0, ivaRate: 21, subtotal: 0, ivaAmount: 0, total: 0 }],
    }))
  }

  function updateItem(idx: number, field: string, value: any) {
    setForm((f) => {
      const items = [...f.items]
      const item = { ...items[idx], [field]: value }
      const { subtotal, ivaAmount, total } = calcItemTotals(item.quantity, item.unitPrice, item.discount, item.ivaRate)
      items[idx] = { ...item, subtotal, ivaAmount, total }
      return { ...f, items }
    })
  }

  const totals = form.items.reduce((acc, i) => ({ subtotal: acc.subtotal + i.subtotal, iva: acc.iva + i.ivaAmount, total: acc.total + i.total }), { subtotal: 0, iva: 0, total: 0 })

  async function handleSubmit() {
    if (form.items.length === 0) { toastError('Agregá al menos un ítem'); return }
    if (form.items.some((i) => !i.description || i.unitPrice <= 0)) { toastError('Completá todos los ítems'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess(`Factura ${form.letter} emitida`, `CAE: ${json.data.cae}`)
      setShowModal(false)
      setForm({ customerId: '', letter: 'B', date: new Date().toISOString().slice(0, 10), notes: '', items: [] })
      fetchData()
    } catch (err: any) { toastError('Error AFIP', err.message) }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Banner MOCK */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-3 flex items-start gap-3">
        <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-yellow-800 dark:text-yellow-300">Modo Demo — Facturación con CAE simulado</p>
          <p className="text-yellow-700 dark:text-yellow-400 mt-0.5">Los CAE son generados localmente. Integrá con ARCA/WSFE para producción real. El servicio mock está en <code className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">app/api/facturacion/route.ts</code></p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar facturas..." className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={letterFilter} onChange={(e) => { setLetterFilter(e.target.value); setPage(1) }} className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
          {LETTERS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm">
            <Plus size={15} />Nueva factura
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{total} comprobante{total !== 1 ? 's' : ''}</div>

      {/* Tabla */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Comprobante</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Cliente</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Fecha</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">CAE</th>
              <th className="table-cell text-right font-medium">Total</th>
              <th className="table-cell text-center font-medium">Estado</th>
              <th className="table-cell text-center font-medium">Ver</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center py-16">
                <Receipt size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No se encontraron comprobantes</p>
              </td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                      inv.letter === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      inv.letter === 'B' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    )}>
                      {inv.letter}
                    </div>
                    <div>
                      <p className="font-mono text-xs font-medium">{formatInvoiceNumber(inv.pointOfSale?.number ?? 0, inv.number)}</p>
                      <p className="text-xs text-muted-foreground">Fact. {inv.letter}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell hidden sm:table-cell font-medium">{inv.customer?.name ?? 'Consumidor Final'}</td>
                <td className="table-cell hidden md:table-cell text-muted-foreground">{formatDate(inv.date)}</td>
                <td className="table-cell hidden lg:table-cell">
                  {inv.cae ? <span className="font-mono text-xs text-green-700 dark:text-green-400">{inv.cae}</span> : '—'}
                </td>
                <td className="table-cell text-right font-semibold font-mono">{formatCurrency(inv.total)}</td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    {inv.status === 'AUTHORIZED' && <CheckCircle2 size={14} className="text-green-500" />}
                    <span className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</span>
                  </div>
                </td>
                <td className="table-cell text-center">
                  <button onClick={() => setSelectedInvoice(inv)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground mx-auto"><Eye size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Pág. {page} de {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Modal nueva factura */}
      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva factura">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[92vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-lg">Nueva factura electrónica</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Cabecera */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo comprobante</label>
                  <select value={form.letter} onChange={(e) => setForm((f) => ({ ...f, letter: e.target.value }))} className="input-field">
                    <option value="A">Factura A</option>
                    <option value="B">Factura B</option>
                    <option value="C">Factura C</option>
                    <option value="M">Factura M</option>
                    <option value="E">Factura E</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fecha</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Cliente</label>
                  <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} className="input-field">
                    <option value="">Consumidor Final</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.documentNumber}</option>)}
                  </select>
                </div>
              </div>

              {/* Ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Ítems</label>
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"><Plus size={13} />Agregar ítem</button>
                </div>
                {form.items.length === 0 ? (
                  <button type="button" onClick={addItem} className="w-full rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors">
                    Hacer clic para agregar el primer ítem
                  </button>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">P. Unitario</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">IVA%</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-28">Total</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2">
                              <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                placeholder="Descripción del ítem" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={item.quantity} min="0.01" step="0.01"
                                onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full text-center rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" value={item.unitPrice} min="0" step="0.01"
                                onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full text-right rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                            </td>
                            <td className="px-3 py-2">
                              <select value={item.ivaRate} onChange={(e) => updateItem(idx, 'ivaRate', parseFloat(e.target.value))}
                                className="w-full rounded border border-border bg-background px-1.5 py-1.5 text-xs focus:outline-none">
                                {IVA_OPTIONS.map((o) => <option key={o.rate} value={o.rate}>{o.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold font-mono text-xs">{formatCurrency(item.total)}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                                className="w-7 h-7 rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-muted-foreground hover:text-red-600 mx-auto">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totales */}
              {form.items.length > 0 && (
                <div className="flex justify-end">
                  <div className="bg-muted/50 rounded-xl p-4 space-y-1.5 min-w-[220px]">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Neto gravado</span><span className="font-mono">{formatCurrency(totals.subtotal)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(totals.iva)}</span></div>
                    <div className="flex justify-between text-base font-bold border-t border-border pt-1.5"><span>Total</span><span className="font-mono text-primary">{formatCurrency(totals.total)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSubmit} disabled={saving || form.items.length === 0}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
                {saving ? <><Loader2 size={15} className="animate-spin" />Autorizando...</> : <>Emitir Factura {form.letter}</>}
              </button>
            </div>
          </div>
      </LegacyDialog>

      {/* Modal detalle factura */}
      <LegacyDialog open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null) }} label="Detalle de factura">
        {selectedInvoice && (
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-lg">Factura {selectedInvoice.letter} — {formatInvoiceNumber(selectedInvoice.pointOfSale?.number ?? 0, selectedInvoice.number)}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">CAE: {selectedInvoice.cae ?? 'Pendiente'}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{selectedInvoice.customer?.name ?? 'Consumidor Final'}</p></div>
                <div><span className="text-muted-foreground">Fecha:</span><p className="font-medium">{formatDate(selectedInvoice.date)}</p></div>
                <div><span className="text-muted-foreground">Estado:</span><p><span className={getStatusColor(selectedInvoice.status)}>{getStatusLabel(selectedInvoice.status)}</span></p></div>
                {selectedInvoice.caeDueDate && <div><span className="text-muted-foreground">Vto. CAE:</span><p className="font-medium">{formatDate(selectedInvoice.caeDueDate)}</p></div>}
              </div>
              {selectedInvoice.cae && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Comprobante autorizado por AFIP</p>
                    <p className="text-xs font-mono text-green-700 dark:text-green-400 mt-1">CAE: {selectedInvoice.cae}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Precio</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr></thead>
                  <tbody>
                    {selectedInvoice.items?.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 text-center">{Number(item.quantity)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right font-semibold font-mono">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Neto</span><span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="font-mono">{formatCurrency(selectedInvoice.ivaAmount)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t border-border pt-1"><span>Total</span><span className="font-mono text-primary">{formatCurrency(selectedInvoice.total)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </LegacyDialog>

      <style jsx>{`
        .input-field{width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s;color:hsl(var(--foreground))}
        .input-field:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.15)}
      `}</style>
    </>
  )
}
