'use client'
// app/dashboard/tesoreria/cheques/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { FileCheck, Plus, Loader2, X, AlertTriangle } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', DEPOSITED: 'Depositado', CLEARED: 'Cobrado', REJECTED: 'Rechazado', DELIVERED: 'Entregado',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-warning', DEPOSITED: 'badge-info', CLEARED: 'badge-success', REJECTED: 'badge-error', DELIVERED: 'badge-neutral',
}

export default function ChequesPage() {
  const [checks, setChecks] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'RECEIVED', number: '', bankName: '', issueDate: '', dueDate: '', amount: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      const res = await fetch(`/api/tesoreria/cheques?${params}`)
      const json = await res.json()
      setChecks(json.data ?? [])
      setSummary(json.summary)
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [filterType])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    const amount = parseFloat(form.amount)
    if (!form.number || !amount || !form.dueDate) { toastError('Completá los campos requeridos'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tesoreria/cheques', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount, issueDate: form.issueDate || new Date().toISOString().slice(0, 10) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Cheque registrado')
      setShowModal(false)
      setForm({ type: 'RECEIVED', number: '', bankName: '', issueDate: '', dueDate: '', amount: '' })
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch(`/api/tesoreria/cheques/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      toastSuccess('Estado actualizado')
      fetchData()
    } catch { toastError('Error al actualizar') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Cartera de Cheques</h1><p className="page-subtitle">Cheques recibidos y emitidos</p></div>
        <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={15} />Nuevo cheque
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="metric-card"><p className="text-xs text-muted-foreground">Pendiente</p><p className="text-xl font-bold">{formatCurrency(summary.pendingAmount)}</p></div>
          <div className="metric-card"><p className="text-xs text-muted-foreground">Vencen esta semana</p><p className="text-xl font-bold text-amber-600">{summary.dueThisWeek}</p></div>
          <div className="metric-card"><p className="text-xs text-muted-foreground">Vencidos</p><p className="text-xl font-bold text-red-600">{summary.overdue}</p></div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setFilterType('')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterType === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>Todos</button>
        <button onClick={() => setFilterType('RECEIVED')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterType === 'RECEIVED' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>Recibidos</button>
        <button onClick={() => setFilterType('ISSUED')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border', filterType === 'ISSUED' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}>Emitidos</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead><tr className="table-header border-b border-border">
              <th className="table-cell text-left font-medium">N°</th>
              <th className="table-cell text-left font-medium hidden sm:table-cell">Banco</th>
              <th className="table-cell text-left font-medium hidden md:table-cell">Vencimiento</th>
              <th className="table-cell text-right font-medium">Monto</th>
              <th className="table-cell text-center font-medium">Estado</th>
            </tr></thead>
            <tbody>
              {checks.length === 0 ? (
                <tr><td colSpan={5} className="table-cell text-center py-16">
                  <FileCheck size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground text-sm">Sin cheques registrados</p>
                </td></tr>
              ) : checks.map((c) => {
                const isOverdue = c.status === 'PENDING' && new Date(c.dueDate) < new Date()
                return (
                  <tr key={c.id} className={cn('table-row', isOverdue && 'bg-red-50/30 dark:bg-red-900/10')}>
                    <td className="table-cell font-mono text-xs">{c.number}</td>
                    <td className="table-cell hidden sm:table-cell text-muted-foreground">{c.bankName ?? '—'} {c.partyName && `· ${c.partyName}`}</td>
                    <td className="table-cell hidden md:table-cell">
                      <span className={isOverdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-muted-foreground'}>
                        {isOverdue && <AlertTriangle size={11} />}{formatDate(c.dueDate)}
                      </span>
                    </td>
                    <td className="table-cell text-right font-mono">{formatCurrency(Number(c.amount))}</td>
                    <td className="table-cell text-center">
                      <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}
                        className={cn('text-xs rounded-full px-2 py-1 border-0 font-semibold', STATUS_COLORS[c.status])}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nuevo cheque">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nuevo cheque</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option value="RECEIVED">Recibido</option>
                <option value="ISSUED">Emitido</option>
              </select>
              <input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="Número de cheque *" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Banco" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Emisión</label>
                  <input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vencimiento *</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                </div>
              </div>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Monto *" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Registrar
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
