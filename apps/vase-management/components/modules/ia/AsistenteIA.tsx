// components/modules/ia/AsistenteIA.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, User, Sparkles, Lightbulb, RefreshCw } from 'lucide-react'
import { cn } from '@/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  queryType?: string
}

const SUGGESTED_QUESTIONS = [
  '¿Cuánto vendí este mes?',
  '¿Qué productos tienen bajo stock?',
  '¿Cuál fue mi mejor cliente?',
  'Dame un resumen del mes',
  '¿Qué facturas tengo pendientes?',
  '¿Cuáles son mis productos más vendidos?',
]

function formatMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>')
    .replace(/\n/g, '<br />')
}

export function AsistenteIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: '¡Hola! Soy el **Asistente IA de Vase Management**.\n\nPuedo consultar datos reales de tu empresa y responderte en lenguaje natural.\n\nProbá preguntarme algo sobre tus ventas, stock, clientes o facturación.',
      timestamp: new Date(),
      queryType: 'general',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(question?: string) {
    const q = question ?? input.trim()
    if (!q || loading) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const json = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: json.answer ?? 'No pude procesar tu consulta.',
        timestamp: new Date(),
        queryType: json.queryType,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Hubo un error al procesar tu consulta. Por favor, intentá de nuevo.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: '✨ Conversación reiniciada. ¿En qué te puedo ayudar?',
      timestamp: new Date(),
    }])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
      {/* Sidebar sugerencias */}
      <div className="hidden lg:flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-yellow-500" />
            <span className="text-sm font-semibold">Preguntas sugeridas</span>
          </div>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} disabled={loading}
                className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-border hover:bg-muted hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-blue-500" />
            <span className="text-sm font-semibold">Sobre el asistente</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            El asistente consulta datos reales de tu base de datos y responde con análisis contextualizados. Arquitectura preparada para integrar modelos de IA externos (Anthropic, OpenAI).
          </p>
        </div>
      </div>

      {/* Chat principal */}
      <div className="lg:col-span-3 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Header chat */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Asistente Vase Management</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-muted-foreground">Conectado · Datos en tiempo real</p>
              </div>
            </div>
          </div>
          <button onClick={clearChat} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Limpiar chat">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div className={cn('w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center',
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                  : 'bg-primary'
              )}>
                {msg.role === 'assistant'
                  ? <Bot size={16} className="text-white" />
                  : <User size={16} className="text-primary-foreground" />
                }
              </div>

              {/* Burbuja */}
              <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted/60 border border-border text-foreground rounded-tl-sm'
              )}>
                {msg.role === 'assistant' ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&_ul]:my-1 [&_li]:my-0.5"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                ) : (
                  <p>{msg.content}</p>
                )}
                <p className={cn('text-[10px] mt-2 opacity-60', msg.role === 'user' ? 'text-right' : 'text-left')}>
                  {msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Sugerencias móvil */}
        <div className="lg:hidden px-5 pb-2 flex gap-2 overflow-x-auto">
          {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
            <button key={q} onClick={() => sendMessage(q)} disabled={loading}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted text-muted-foreground whitespace-nowrap disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              disabled={loading}
              placeholder="Escribí tu consulta... (Enter para enviar)"
              className="flex-1 h-10 px-4 rounded-xl border border-border bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
