'use client'
// app/dashboard/tesoreria/bancos/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatDate, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Landmark, Plus, Loader2, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function BancosPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loadingMov, setLoadingMov] = useState(false)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [accountForm, setAccountForm] = useState({ bankName: '', accountNumber: '', cbu: '', alias: '' })
  const [movForm, setMovForm] = useState({ type: 'DEPOSIT', amount: '', description: '' })
  const [saving, setSaving] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tesoreria/bancos')
      const json = await res.json()
      setAccounts(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  async function loadMovements(account: any) {
    setSelected(account)
    setLoadingMov(true)
    try {
      const res = await fetch(`/api/tesoreria/bancos/${account.id}/movimientos`)
      const json = await res.json()
      setMovements(json.data ?? [])
    } catch { toastError('Error al cargar movimientos') }
    finally { setLoadingMov(false) }
  }

  async function createAccount() {
    if (!accountForm.bankName) { toastError('Nombre del banco requerido'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tesoreria/bancos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountForm),
      })
      if (!res.ok) throw new Error()
      toastSuccess('Cuenta creada')
      setShowNewAccount(false); setAccountForm({ bankName: '', accountNumber: '', cbu: '', alias: '' })
      fetchAccounts()
    } catch { toastError('Error al crear cuenta') }
    finally { setSaving(false) }
  }

  async function createMovement() {
    const amount = parseFloat(movForm.amount)
    if (!amount || !movForm.description) { toastError('Completá monto y descripción'); return }
    setSaving(true)
    try {
      const signedAmount = movForm.type === 'WITHDRAWAL' || movForm.type === 'FEE' ? -Math.abs(amount) : Math.abs(amount)
      const res = await fetch(`/api/tesoreria/bancos/${selected.id}/movimientos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...movForm, amount: signedAmount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Movimiento registrado')
      setShowNewMovement(false); setMovForm({ type: 'DEPOSIT', amount: '', description: '' })
      loadMovements(selected); fetchAccounts()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Bancos</h1><p className="page-subtitle">Cuentas bancarias y movimientos</p></div>
        <button onClick={() => setShowNewAccount(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={15} />Nueva cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <Landmark size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-xs">Sin cuentas bancarias</p>
            </div>
          ) : accounts.map((a) => (
            <button key={a.id} onClick={() => loadMovements(a)}
              className={cn('w-full text-left rounded-xl border p-4 transition-colors',
                selected?.id === a.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
              )}>
              <p className="font-semibold text-sm">{a.bankName}</p>
              <p className="text-xs text-muted-foreground">{a.alias ?? a.accountNumber ?? 'Sin alias'}</p>
              <p className="font-mono font-bold mt-2">{formatCurrency(Number(a.balance))}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl border-2 border-dashed border-border p-16 text-center h-full flex flex-col items-center justify-center">
              <Landmark size={36} className="text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná una cuenta para ver sus movimientos</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-sm">{selected.bankName} — {formatCurrency(Number(selected.balance))}</p>
                <button onClick={() => setShowNewMovement(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs">
                  <Plus size={12} />Movimiento
                </button>
              </div>
              {loadingMov ? (
                <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {movements.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">Sin movimientos</p>
                  ) : movements.map((m) => (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {Number(m.amount) >= 0
                          ? <ArrowDownLeft size={14} className="text-green-600" />
                          : <ArrowUpRight size={14} className="text-red-600" />}
                        <div>
                          <p className="text-sm">{m.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(m.date)}</p>
                        </div>
                      </div>
                      <p className={cn('font-mono font-semibold', Number(m.amount) >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(Number(m.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <LegacyDialog open={showNewAccount} onOpenChange={setShowNewAccount} label="Nueva cuenta bancaria">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nueva cuenta bancaria</h2>
              <button onClick={() => setShowNewAccount(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <input value={accountForm.bankName} onChange={(e) => setAccountForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Banco *" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={accountForm.cbu} onChange={(e) => setAccountForm((f) => ({ ...f, cbu: e.target.value }))} placeholder="CBU" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <input value={accountForm.alias} onChange={(e) => setAccountForm((f) => ({ ...f, alias: e.target.value }))} placeholder="Alias" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowNewAccount(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={createAccount} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Crear
              </button>
            </div>
          </div>
      </LegacyDialog>

      <LegacyDialog open={showNewMovement} onOpenChange={setShowNewMovement} label="Nuevo movimiento bancario">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nuevo movimiento</h2>
              <button onClick={() => setShowNewMovement(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <select value={movForm.type} onChange={(e) => setMovForm((f) => ({ ...f, type: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option value="DEPOSIT">Depósito</option>
                <option value="WITHDRAWAL">Retiro</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="FEE">Comisión</option>
                <option value="INTEREST">Interés</option>
              </select>
              <input type="number" value={movForm.amount} onChange={(e) => setMovForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Monto" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" />
              <input value={movForm.description} onChange={(e) => setMovForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowNewMovement(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={createMovement} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Registrar
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
