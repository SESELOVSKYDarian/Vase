'use client'

import { useMemo, useReducer, useRef, useState } from 'react'
import { Bot, CheckCircle2, ImageIcon, LoaderCircle, Mic, RotateCcw, Send, Sparkles, Square, Upload, UserRound, X } from 'lucide-react'
import { aiChatReducer, initialAiChatState, type AiChatMessage } from '@/components/warehouse/ai-state'
import { getErrorMessage, warehouseRequest } from '@/components/warehouse/client'
import type { AiCommandResponse, AiProposal } from '@/components/warehouse/types'
import { WarehousePageHeader, WarehousePanel, WarehouseStatusBadge } from '@/components/warehouse/ui'

const suggestions = [
  '¿Dónde está PC06?',
  'Cambia el LED de PC06 al 14',
  'Apaga todos los LEDs',
  'Busca productos del sector Herrajes',
]

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function proposalEntries(proposal: AiProposal) {
  return Object.entries(proposal).filter(([, value]) => value !== undefined).slice(0, 8)
}

function proposalValue(value: unknown) {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function DepositoIAPanel() {
  const [text, setText] = useState('')
  const [state, dispatch] = useReducer(aiChatReducer, initialAiChatState)
  const [lastCommand, setLastCommand] = useState('')
  const [recording, setRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const canSend = text.trim().length > 0 && !state.sending
  const hasMessages = state.messages.length > 0
  const pendingProposal = useMemo(() => state.messages.some((message) => message.proposalStatus === 'confirming'), [state.messages])

  const send = async (override?: string) => {
    const command = (override ?? text).trim()
    if (!command || state.sending) return
    const userMessage: AiChatMessage = { id: messageId('user'), role: 'user', text: command }
    dispatch({ type: 'SEND', message: userMessage })
    setText('')
    setLastCommand(command)

    try {
      const response = await warehouseRequest<AiCommandResponse>('/api/warehouse/ai/command', {
        method: 'POST',
        body: JSON.stringify({ text: command }),
      })
      dispatch({
        type: 'RECEIVE',
        message: {
          id: messageId('ai'),
          role: 'ai',
          text: response.text || 'Comando procesado.',
          response,
          proposalStatus: response.requiresConfirmation && response.proposal ? 'idle' : undefined,
        },
      })
    } catch (requestError) {
      dispatch({ type: 'FAIL', message: getErrorMessage(requestError) })
    }
  }

  const sendAudio = async (file: File) => {
    if (state.sending) return
    dispatch({ type: 'SEND', message: { id: messageId('audio'), role: 'user', text: 'Audio enviado' } })
    try {
      const formData = new FormData()
      formData.append('audio', file)
      const response = await warehouseRequest<AiCommandResponse & { transcript: string }>('/api/warehouse/ai/audio', { method: 'POST', body: formData })
      dispatch({ type: 'RECEIVE', message: { id: messageId('ai'), role: 'ai', text: `Transcripción: “${response.transcript}”\n\n${response.text || 'Comando procesado.'}`, response, proposalStatus: response.requiresConfirmation && response.proposal ? 'idle' : undefined } })
    } catch (requestError) {
      dispatch({ type: 'FAIL', message: getErrorMessage(requestError) })
    }
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return dispatch({ type: 'FAIL', message: 'Este navegador no permite usar el micrófono.' })
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    audioChunksRef.current = []
    recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      void sendAudio(new File([blob], 'warehouse-audio.webm', { type: blob.type }))
    }
    recorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }

  const confirmAction = async (message: AiChatMessage) => {
    if (!message.response?.proposal || message.proposalStatus !== 'idle') return
    dispatch({ type: 'CONFIRM_START', messageId: message.id })
    try {
      const response = await warehouseRequest<AiCommandResponse>('/api/warehouse/ai/command', {
        method: 'POST',
        body: JSON.stringify({ proposal: message.response.proposal }),
      })
      dispatch({
        type: 'CONFIRM_DONE',
        messageId: message.id,
        result: { id: messageId('result'), role: 'ai', text: response.text || 'Acción completada.', response },
      })
    } catch (requestError) {
      dispatch({ type: 'FAIL', message: getErrorMessage(requestError), messageId: message.id })
    }
  }

  return (
    <div className="warehouse-shell mx-auto max-w-6xl">
      <WarehousePageHeader
        title="Copiloto de depósito"
        description="Consultá ubicaciones y prepará cambios con lenguaje natural. Las acciones importantes siempre piden confirmación."
        actions={<WarehouseStatusBadge tone={pendingProposal ? 'warning' : 'success'}>{pendingProposal ? 'Acción en proceso' : 'Listo para consultar'}</WarehouseStatusBadge>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <WarehousePanel className="flex min-h-[620px] flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {!hasMessages ? (
              <div className="flex min-h-[410px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Sparkles size={28} /></div>
                <h2 className="mt-5 text-xl font-semibold text-foreground">¿Qué necesitás encontrar o cambiar?</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Podés preguntar por un código, modificar un LED o preparar el alta de un producto.</p>
                <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => <button key={suggestion} type="button" className="ui-button ui-button-secondary" onClick={() => { setText(suggestion); textareaRef.current?.focus() }}>{suggestion}</button>)}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {state.messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'ai' ? <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={17} /></div> : null}
                    <div className={`max-w-[min(88%,46rem)] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted/55 text-foreground'}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                      {message.response?.proposal ? (
                        <div className="mt-4 rounded-xl border border-border bg-card/90 p-4 text-foreground">
                          <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Propuesta de acción</p>{message.proposalStatus === 'done' ? <WarehouseStatusBadge tone="success">Ejecutada</WarehouseStatusBadge> : message.proposalStatus === 'cancelled' ? <WarehouseStatusBadge tone="neutral">Cancelada</WarehouseStatusBadge> : null}</div>
                          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                            {proposalEntries(message.response.proposal).map(([key, value]) => <div key={key} className="rounded-lg bg-muted/70 px-3 py-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{key}</dt><dd className="mt-1 break-words text-sm text-foreground">{proposalValue(value)}</dd></div>)}
                          </dl>
                          {message.proposalStatus === 'idle' || message.proposalStatus === 'confirming' ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" className="ui-button ui-button-primary" onClick={() => confirmAction(message)} disabled={message.proposalStatus === 'confirming'}>{message.proposalStatus === 'confirming' ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {message.proposalStatus === 'confirming' ? 'Ejecutando…' : 'Confirmar cambio'}</button><button type="button" className="ui-button ui-button-secondary" onClick={() => dispatch({ type: 'CANCEL', messageId: message.id })} disabled={message.proposalStatus === 'confirming'}><X size={16} /> Cancelar</button></div> : null}
                        </div>
                      ) : null}
                    </div>
                    {message.role === 'user' ? <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background"><UserRound size={17} /></div> : null}
                  </div>
                ))}
                {state.sending ? <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={17} /></div><div className="rounded-2xl border border-border bg-muted/55 px-4 py-3 text-sm text-muted-foreground"><LoaderCircle size={16} className="mr-2 inline animate-spin" />Interpretando el comando…</div></div> : null}
              </div>
            )}
          </div>

          {state.error ? <div className="mx-4 mb-3 flex flex-col gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200 sm:flex-row sm:items-center"><span className="flex-1">{state.error}</span>{lastCommand ? <button type="button" className="ui-button ui-button-secondary" onClick={() => send(lastCommand)}><RotateCcw size={15} /> Reintentar</button> : null}</div> : null}

          <div className="border-t border-border bg-card/70 p-4">
            <div className="flex items-end gap-2">
              <div className="flex gap-1"><input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void sendAudio(file); event.currentTarget.value = '' }} /><button type="button" className="ui-icon-button" onClick={() => audioInputRef.current?.click()} disabled={state.sending || recording} title="Subir audio" aria-label="Subir audio"><Upload size={18} /></button><button type="button" className={`ui-icon-button ${recording ? 'text-destructive' : ''}`} onClick={recording ? stopRecording : () => void startRecording()} disabled={state.sending} title={recording ? 'Detener grabación' : 'Grabar audio'} aria-label={recording ? 'Detener grabación' : 'Grabar audio'}>{recording ? <Square size={18} /> : <Mic size={18} />}</button><button type="button" className="ui-icon-button" disabled title="Imágenes próximamente" aria-label="Adjuntar imagen, próximamente"><ImageIcon size={18} /></button></div>
              <textarea ref={textareaRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} placeholder="Ej: ¿dónde está PC06?" className="input-field min-h-12 flex-1 resize-none" rows={1} />
              <button type="button" className="ui-button ui-button-primary h-12 w-12 px-0" onClick={() => send()} disabled={!canSend} aria-label="Enviar consulta"><Send size={18} /></button>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Enter para enviar · Shift + Enter para nueva línea</p>
          </div>
        </WarehousePanel>

        <aside className="space-y-4">
          <WarehousePanel title="Qué puede hacer"><div className="space-y-3 p-4 text-sm text-muted-foreground"><p>Buscar productos por código o nombre.</p><p>Responder ubicación física.</p><p>Preparar cambios de LED.</p><p>Crear propuestas de productos.</p></div></WarehousePanel>
          <WarehousePanel title="Acciones seguras"><div className="p-4 text-sm leading-6 text-muted-foreground">La IA no guarda cambios importantes sin mostrar primero una propuesta para confirmar.</div></WarehousePanel>
        </aside>
      </div>
    </div>
  )
}
