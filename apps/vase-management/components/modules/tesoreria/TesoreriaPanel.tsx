// components/modules/tesoreria/TesoreriaPanel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, getPaymentMethodLabel, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Plus, Loader2, RefreshCw, X, TrendingUp, TrendingDown,
  Wallet, ChevronLeft, ChevronRight, CreditCard, ArrowUpDown
} from 'lucide-react'

const CATEGORIES_INCOME = ['Ventas', 'Cobranza', 'Préstamo', 'Inversión', 'Otros ingresos']
const CATEGORIES_EXPENSE = ['Proveedor', 'Sueldos', 'Alquiler', 'Servicios', 'Impuestos', 'Gastos operativos', 'Marketing', 'Otros gastos']
const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'BANK_TRANSFER', label: 'Transferencia' },
  { value: 'CREDIT_CARD', label: 'Tarjeta crédito' },
  { value: 'DEBIT_CARD', label: 'Tarjeta débito' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Otro' },
]

const METHOD_ICONS: Record<string, string> = {
  CASH: '💵', BANK_TRANSFER: '🏦', CREDIT_CARD: '💳',
  DEBIT_CARD: '💳', MERCADO_PAGO: '📱', CHECK: '📋', OTHER: '💰',
}

export function TesoreriaPanel() {
  const [movements, setMovements] = useState<any[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [tipoFilter, setTipoFilter] = useState('')
  const [form, setForm] = useState({
    type: 'INCOME',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'CASH',
    reference: '',
  })
  const limit = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(tipoFilter && { tipo: tipoFilter }) })
      const res = await fetch(`/api/tesoreria?${params}`)
      const json = await res.json()
      setMovements(json.data ?? [])
      setTotal(json.total ?? 0)
      setSummary(json.summary ?? { income: 0, expense: 0, balance: 0 })
    } catch { toastError('Error al cargar tesorería') }
    finally { setLoading(false) }
  }, [page, tipoFilter])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!form.description || !form.amount || Number(form.amount) <= 0) {
      toastError('Completá todos los campos requeridos'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/tesoreria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Movimiento registrado', formatCurrency(Number(form.amount)))
      setShowModal(false)
      setForm({ type: 'INCOME', category: '', amount: '', description: '', date: new Date().toISOString().slice(0, 10), method: 'CASH', reference: '' })
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Ingresos del mes</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <TrendingDown size={18} className="text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Egresos del mes</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense)}</p>
        </div>
        <div className={cn('metric-card border-2', summary.balance >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800')}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', summary.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
              <Wallet size={18} className={summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'} />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Saldo neto</span>
          </div>
          <p className={cn('text-2xl font-bold', summary.balance >= 0 ? 'text-blue-600' : 'text-red-600')}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          {[{ v: '', l: 'Todos' }, { v: 'INCOME', l: 'Ingresos' }, { v: 'EXPENSE', l: 'Egresos' }].map((opt) => (
            <button key={opt.v} onClick={() => { setTipoFilter(opt.v); setPage(1) }}
              className={cn('h-8 px-3 rounded-lg text-sm font-medium transition-colors',
                tipoFilter === opt.v ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted text-muted-foreground'
              )}>
              {opt.l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"><RefreshCw size={15} /></button>
          <button onClick={() => { setForm((f) => ({ ...f, type: 'EXPENSE' })); setShowModal(true) }}
            className="h-9 flex items-center gap-2 px-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 transition-colors">
            <TrendingDown size={15} />Egreso
          </button>
          <button onClick={() => { setForm((f) => ({ ...f, type: 'INCOME' })); setShowModal(true) }}
            className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm">
            <Plus size={15} />Ingreso
          </button>
        </div>
      </div>

      {/* Tabla movimientos */}
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">Descripción</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Categoría</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Método</th>
              <th className="table-cell text-left font-medium hidden lg:table-cell">Fecha</th>
              <th className="table-cell text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-cell text-center py-16"><Loader2 size={24} className="animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan={5} className="table-cell text-center py-16">
                <ArrowUpDown size={36} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No hay movimientos registrados</p>
              </td></tr>
            ) : movements.map((m) => (
              <tr key={m.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0',
                      m.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    )}>
                      {m.type === 'INCOME' ? <TrendingUp size={13} className="text-green-600" /> : <TrendingDown size={13} className="text-red-600" />}
                    </div>
                    <span className="font-medium">{m.description}</span>
                  </div>
                </td>
                <td className="table-cell hidden sm:table-cell">
                  {m.category ? <span className="badge-neutral">{m.category}</span> : '—'}
                </td>
                <td className="table-cell hidden md:table-cell text-muted-foreground">
                  <span>{METHOD_ICONS[m.method] ?? '💰'} {getPaymentMethodLabel(m.method)}</span>
                </td>
                <td className="table-cell hidden lg:table-cell text-muted-foreground">{formatDate(m.date)}</td>
                <td className="table-cell text-right">
                  <span className={cn('font-bold font-mono', m.type === 'INCOME' ? 'text-green-600' : 'text-red-600')}>
                    {m.type === 'INCOME' ? '+' : '-'}{formatCurrency(m.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Pág. {page} de {totalPages} — {total} movimientos</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Modal nuevo movimiento */}
      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo movimiento de tesorería">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-lg">
                {form.type === 'INCOME' ? '💰 Nuevo ingreso' : '💸 Nuevo egreso'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div className="flex gap-2">
                {['INCOME', 'EXPENSE'].map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                    className={cn('flex-1 h-9 rounded-lg text-sm font-medium transition-colors border',
                      form.type === t
                        ? t === 'INCOME' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    )}>
                    {t === 'INCOME' ? '↑ Ingreso' : '↓ Egreso'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Descripción *</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Ej: Cobranza cliente Juan Pérez" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Monto *</label>
                  <input type="number" value={form.amount} min="0.01" step="0.01"
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input-field font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fecha</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
                    <option value="">Sin categoría</option>
                    {(form.type === 'INCOME' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Método de pago</label>
                  <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className="input-field">
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Referencia / N° comprobante</label>
                <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="input-field" placeholder="Opcional" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className={cn('px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2',
                  form.type === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                )}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Registrar {form.type === 'INCOME' ? 'ingreso' : 'egreso'}
              </button>
            </div>
          </div>
      </LegacyDialog>

      <style jsx>{`
        .input-field{width:100%;border-radius:.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s;color:hsl(var(--foreground))}
        .input-field:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.15)}
      `}</style>
    </>
  )
}
