'use client'
// app/dashboard/tesoreria/caja/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { Wallet, Loader2, Plus, Lock, Unlock, X, AlertTriangle } from 'lucide-react'

export default function CajaPage() {
  const [registers, setRegisters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpenModal, setShowOpenModal] = useState<any>(null)
  const [showCloseModal, setShowCloseModal] = useState<any>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tesoreria/cajas-registradoras')
      const json = await res.json()
      setRegisters(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleOpen() {
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) { toastError('Monto inválido'); return }
    setProcessing(true)
    try {
      const res = await fetch('/api/tesoreria/caja/sesiones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashRegisterId: showOpenModal.id, openingAmount: amount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Caja abierta', formatCurrency(amount))
      setShowOpenModal(null); setOpeningAmount('')
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setProcessing(false) }
  }

  async function handleClose() {
    const amount = parseFloat(countedAmount)
    if (isNaN(amount) || amount < 0) { toastError('Monto inválido'); return }
    setProcessing(true)
    try {
      const res = await fetch(`/api/tesoreria/caja/sesiones/${showCloseModal.currentSession.id}/cerrar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedAmount: amount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const diff = json.data.difference
      toastSuccess('Caja cerrada', diff === 0 ? 'Arqueo exacto' : `Diferencia: ${formatCurrency(diff)}`)
      setShowCloseModal(null); setCountedAmount('')
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setProcessing(false) }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Caja Diaria</h1><p className="page-subtitle">Apertura, arqueo y cierre de cajas registradoras</p></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : registers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Wallet size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No hay cajas registradoras configuradas todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {registers.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
                    r.currentSession ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-muted text-muted-foreground'
                  )}>
                    {r.currentSession ? <Unlock size={16} /> : <Lock size={16} />}
                  </div>
                  <p className="font-semibold">{r.name}</p>
                </div>
                <span className={cn(r.currentSession ? 'badge-success' : 'badge-neutral')}>
                  {r.currentSession ? 'Abierta' : 'Cerrada'}
                </span>
              </div>

              {r.currentSession ? (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Apertura</p>
                  <p className="font-mono font-semibold mb-4">{formatCurrency(Number(r.currentSession.openingAmount))}</p>
                  <button onClick={() => setShowCloseModal(r)}
                    className="w-full py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium hover:bg-red-100">
                    Cerrar caja con arqueo
                  </button>
                </>
              ) : (
                <button onClick={() => setShowOpenModal(r)}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  Abrir caja
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={!!showOpenModal} onOpenChange={(open) => { if (!open) setShowOpenModal(null) }} label="Abrir caja">
        {showOpenModal && (
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Abrir {showOpenModal.name}</h2>
              <button onClick={() => setShowOpenModal(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium mb-1.5">Monto de apertura</label>
              <input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowOpenModal(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleOpen} disabled={processing} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {processing && <Loader2 size={14} className="animate-spin" />}Abrir caja
              </button>
            </div>
          </div>
        )}
      </LegacyDialog>

      <LegacyDialog open={!!showCloseModal} onOpenChange={(open) => { if (!open) setShowCloseModal(null) }} label="Cerrar caja">
        {showCloseModal && (
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Cerrar {showCloseModal.name}</h2>
              <button onClick={() => setShowCloseModal(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                Contá el efectivo físico en la caja e ingresá el total. El sistema calculará la diferencia contra lo esperado.
              </div>
              <label className="block text-sm font-medium mb-1.5">Efectivo contado</label>
              <input type="number" value={countedAmount} onChange={(e) => setCountedAmount(e.target.value)} autoFocus
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" placeholder="0.00" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowCloseModal(null)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleClose} disabled={processing} className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm flex items-center gap-2">
                {processing && <Loader2 size={14} className="animate-spin" />}Confirmar cierre
              </button>
            </div>
          </div>
        )}
      </LegacyDialog>
    </div>
  )
}
