'use client'
// app/dashboard/reportes/generador/page.tsx

import { useState, useRef, useEffect } from 'react'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import { ReportViewer } from '@/components/modules/reportes/ReportViewer'
import {
  Bot, Send, Loader2, Sparkles, BookMarked,
  Play, X, Check, ChevronRight, RotateCcw
} from 'lucide-react'
import { cn } from '@/utils'

interface Message { role: 'user' | 'assistant'; content: string; intent?: any; showResult?: boolean }

const EXAMPLES = [
  'Reporte de ventas del mes actual ordenado por total mayor a menor',
  'Clientes con deuda pendiente ordenados por saldo, con riesgo crediticio',
  'Stock crítico de todos los productos con cantidad menor al mínimo',
  'Facturas emitidas en los últimos 30 días con CAE y saldo pendiente',
  'Compras por proveedor del mes anterior con total e IVA',
]

const SAVE_OPTIONS = [
  { value: 'no_save', label: 'No guardar' },
  { value: 'DAILY', label: '📅 Guardar como diario' },
  { value: 'WEEKLY', label: '📆 Guardar como semanal' },
  { value: 'MONTHLY', label: '🗓️ Guardar como mensual' },
]

export default function GeneradorIAPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentIntent, setCurrentIntent] = useState<any>(null)
  const [reportResult, setReportResult] = useState<any>(null)
  const [savingReport, setSavingReport] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveForm, setSaveForm] = useState({ name: '', description: '', frequency: 'no_save', dateRange: 'CURRENT_MONTH' })
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(msg?: string) {
    const text = msg ?? input.trim()
    if (!text || loading) return
    setInput('')
    const newMsg: Message = { role: 'user', content: text }
    const updated = [...messages, newMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/ia/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: updated.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar')

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        intent: data.intent,
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.intent && !data.needsClarification) {
        setCurrentIntent(data.intent)
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message ?? 'No pude procesar tu solicitud. Verificá que GROQ_API_KEY esté configurada.'}`,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleGenerate() {
    if (!currentIntent) return
    setLoading(true)
    setReportResult(null)
    try {
      const res = await fetch('/api/ia/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', intent: currentIntent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReportResult(data.data)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **Reporte generado** — ${data.data.total} registros encontrados.\n\n¿Querés guardar este reporte para reutilizarlo?`,
      }])
      setShowSaveModal(true)
    } catch (err: any) {
      toastError('Error al generar', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!currentIntent) return
    setSavingReport(true)
    try {
      const res = await fetch('/api/ia/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', intent: currentIntent, saveConfig: saveForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toastSuccess('Reporte guardado', saveForm.name)
      setShowSaveModal(false)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `📌 **"${saveForm.name}"** guardado en Reportes guardados${saveForm.frequency !== 'no_save' ? ` con frecuencia ${saveForm.frequency.toLowerCase()}` : ''}. Podés encontrarlo en el menú de Reportes.`,
      }])
    } catch (err: any) {
      toastError('Error al guardar', err.message)
    } finally {
      setSavingReport(false)
    }
  }

  function resetChat() {
    setMessages([])
    setCurrentIntent(null)
    setReportResult(null)
    setShowSaveModal(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-4">
      <div className="page-header flex-shrink-0">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" />
            Generador de Reportes IA
          </h1>
          <p className="page-subtitle">Describí el reporte que necesitás en lenguaje natural</p>
        </div>
        <button onClick={resetChat} className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border hover:bg-muted text-sm text-muted-foreground">
          <RotateCcw size={14} />Nueva consulta
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0">

        {/* Chat */}
        <div className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <Bot size={28} className="text-purple-600" />
                </div>
                <h3 className="font-semibold text-base mb-2">Asistente de Reportes</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                  Describí el reporte que necesitás. Puedo interpretar ventas, clientes, stock, facturas y más.
                </p>
                <div className="space-y-2 w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Ejemplos:</p>
                  {EXAMPLES.map((ex, i) => (
                    <button key={i} onClick={() => sendMessage(ex)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    )}>
                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Intent card */}
          {currentIntent && !reportResult && (
            <div className="mx-4 mb-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">Reporte detectado</p>
                <span className="text-[10px] text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                  {Math.round((currentIntent.confidence ?? 0.8) * 100)}% confianza
                </span>
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 space-y-0.5 mb-3">
                <p>📊 <strong>Entidad:</strong> {currentIntent.entity}</p>
                <p>📋 <strong>Columnas:</strong> {currentIntent.columns?.join(', ')}</p>
                {currentIntent.dateRange && <p>📅 <strong>Período:</strong> {currentIntent.dateRange}</p>}
              </div>
              <button onClick={handleGenerate} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Generar reporte
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ej: Reporte de clientes con saldo..."
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90">
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Resultado */}
        <div className="min-h-0">
          {reportResult ? (
            <ReportViewer
              report={{ name: 'Reporte IA', entity: currentIntent?.entity }}
              result={reportResult}
              onExport={async () => {
                try {
                  const res = await fetch('/api/reportes/exportar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows: reportResult.rows, columns: reportResult.columns, title: 'Reporte IA', format: 'excel' }),
                  })
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'reporte_ia.xlsx'; a.click()
                  URL.revokeObjectURL(url)
                  toastSuccess('Excel exportado')
                } catch { toastError('Error al exportar') }
              }}
            />
          ) : (
            <div className="h-full rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-8">
              <Sparkles size={40} className="text-purple-300 mb-4" />
              <p className="font-medium text-sm mb-1">Resultado del reporte</p>
              <p className="text-muted-foreground text-xs max-w-xs">
                Describí qué reporte necesitás en el chat y el resultado aparecerá aquí
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal guardar reporte */}
      <LegacyDialog open={showSaveModal} onOpenChange={setShowSaveModal} label="Guardar reporte">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookMarked size={18} className="text-primary" />
                <h2 className="font-semibold">Guardar reporte</h2>
              </div>
              <button onClick={() => setShowSaveModal(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre del reporte *</label>
                <input
                  value={saveForm.name}
                  onChange={e => setSaveForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Ventas mensuales por cliente"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Descripción</label>
                <input
                  value={saveForm.description}
                  onChange={e => setSaveForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción opcional"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Frecuencia de ejecución</label>
                <div className="grid grid-cols-2 gap-2">
                  {SAVE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSaveForm(f => ({ ...f, frequency: opt.value }))}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors',
                        saveForm.frequency === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rango de fechas dinámico</label>
                <select
                  value={saveForm.dateRange}
                  onChange={e => setSaveForm(f => ({ ...f, dateRange: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="CURRENT_MONTH">Mes actual</option>
                  <option value="LAST_MONTH">Mes anterior</option>
                  <option value="LAST_7_DAYS">Últimos 7 días</option>
                  <option value="LAST_30_DAYS">Últimos 30 días</option>
                  <option value="CURRENT_YEAR">Año actual</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                Omitir
              </button>
              <button
                onClick={handleSave}
                disabled={!saveForm.name || savingReport}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2"
              >
                {savingReport ? <Loader2 size={14} className="animate-spin" /> : <BookMarked size={14} />}
                Guardar
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
