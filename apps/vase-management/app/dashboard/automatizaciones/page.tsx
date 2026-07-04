'use client'
// app/dashboard/automatizaciones/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Zap, Plus, Loader2, X, Trash2, ToggleLeft, ToggleRight,
  Bell, Webhook, Mail, Activity
} from 'lucide-react'

const TRIGGER_LABELS: Record<string, string> = {
  LOW_STOCK: 'Stock bajo', INVOICE_OVERDUE: 'Factura vencida', NEW_CUSTOMER: 'Cliente nuevo',
  PRODUCT_EXPIRING: 'Producto por vencer', CREDIT_LIMIT_EXCEEDED: 'Límite de crédito excedido',
  SALE_CREATED: 'Venta creada',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE_ALERT: <Bell size={12} />, WEBHOOK: <Webhook size={12} />, SEND_EMAIL: <Mail size={12} />,
}

export default function AutomatizacionesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', trigger: 'LOW_STOCK', actionType: 'CREATE_ALERT',
    title: '', message: '', url: '', to: '', subject: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/automatizaciones')
      const json = await res.json()
      setRules(json.data ?? [])
    } catch { toastError('Error al cargar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!form.name) { toastError('Nombre requerido'); return }
    setSaving(true)
    try {
      const action: any = { type: form.actionType }
      if (form.actionType === 'CREATE_ALERT') { action.title = form.title; action.message = form.message }
      if (form.actionType === 'WEBHOOK') { action.url = form.url }
      if (form.actionType === 'SEND_EMAIL') { action.to = form.to; action.subject = form.subject; action.message = form.message }

      const res = await fetch('/api/automatizaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, trigger: form.trigger, actions: [action] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Automatización creada', form.name)
      setShowModal(false)
      setForm({ name: '', trigger: 'LOW_STOCK', actionType: 'CREATE_ALERT', title: '', message: '', url: '', to: '', subject: '' })
      fetchData()
    } catch (err: any) { toastError('Error', err.message) }
    finally { setSaving(false) }
  }

  async function toggleActive(rule: any) {
    try {
      await fetch(`/api/automatizaciones/${rule.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      fetchData()
    } catch { toastError('Error al actualizar') }
  }

  async function deleteRule(id: string) {
    if (!confirm('¿Eliminar esta automatización?')) return
    try {
      await fetch(`/api/automatizaciones/${id}`, { method: 'DELETE' })
      toastSuccess('Eliminada')
      fetchData()
    } catch { toastError('Error al eliminar') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Zap size={20} />Automatizaciones</h1>
          <p className="page-subtitle">Reglas &ldquo;si esto, entonces esto&rdquo; — alertas, webhooks y emails automáticos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-9 flex items-center gap-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={15} />Nueva regla
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Zap size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No hay automatizaciones configuradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(rule)} className="text-muted-foreground hover:text-primary">
                    {rule.isActive ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} />}
                  </button>
                  <p className="font-semibold text-sm">{rule.name}</p>
                  <span className="badge-info text-xs">{TRIGGER_LABELS[rule.trigger] ?? rule.trigger}</span>
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {(rule.actions as any[])?.map((a, i) => (
                    <span key={i} className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                      {ACTION_ICONS[a.type]}{a.type}
                    </span>
                  ))}
                </span>
                <span className="flex items-center gap-1"><Activity size={11} />{rule.runCount} ejecuciones</span>
                {rule.lastRunAt && <span>· última: {new Date(rule.lastRunAt).toLocaleString('es-AR')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <LegacyDialog open={showModal} onOpenChange={setShowModal} label="Nueva automatización">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Nueva automatización</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Avisar cuando el stock esté bajo" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Cuando pase esto (trigger)</label>
                <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Hacer esto (acción)</label>
                <select value={form.actionType} onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                  <option value="CREATE_ALERT">Crear alerta interna</option>
                  <option value="WEBHOOK">Llamar a un webhook</option>
                  <option value="SEND_EMAIL">Enviar email</option>
                </select>
              </div>

              {form.actionType === 'CREATE_ALERT' && (
                <>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título de la alerta" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Mensaje (podés usar {{productName}}, {{currentStock}}, etc.)" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                </>
              )}
              {form.actionType === 'WEBHOOK' && (
                <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://tu-endpoint.com/webhook" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              )}
              {form.actionType === 'SEND_EMAIL' && (
                <>
                  <input value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} placeholder="destinatario@email.com" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Asunto" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                    ⚠️ El envío de email todavía no está conectado a un proveedor SMTP real — la regla se registrará pero no llegará el correo hasta configurarlo.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}Crear
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
