"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Zap
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPanel({ ready = true }: { ready?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente inteligente de Atlas. ¿En qué puedo ayudarte hoy con la gestión de tu negocio?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && ready,
    [input, loading, ready]
  );

  async function sendMessage() {
    if (!canSend) return;
    const userText = input.trim();
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    console.log("AssistantPanel: Sending message...", userText);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Error de comunicación");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "" },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "No pude conectar con la IA. Revisá la configuración."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0b14]/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center text-secondary shadow-[0_0_15px_-5px_#06b6d4]">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              Atlas Intelligence
              {ready && <div className="size-1.5 rounded-full bg-secondary animate-pulse" />}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Protocolo de Asistencia Activo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!ready && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest">
              <AlertCircle size={10} /> Offline
            </div>
          )}
          <Sparkles size={14} className="text-secondary opacity-50" />
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`flex items-center gap-1.5 mb-1 px-1 text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-slate-500' : 'text-secondary/70'}`}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              {msg.role === 'user' ? 'Administrador' : 'Atlas AI'}
            </div>
            <div
              className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold leading-relaxed shadow-lg ${msg.role === "user"
                  ? "bg-secondary text-white shadow-[0_5px_15px_-5px_rgba(6,182,212,0.3)] rounded-tr-none"
                  : "bg-white/5 border border-white/10 text-slate-100 rounded-tl-none"
                }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 p-2 text-secondary animate-pulse">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-widest italic">Procesando vectores...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/[0.01] border-t border-white/5">
        {!ready && (
          <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-tight">
              Configuración incompleta: Faltan variables de entorno (OPENAI_API_KEY). El asistente opera en modo restringido.
            </p>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="relative group"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={ready ? "Pregunta sobre tu negocio..." : "Asistente inactivo..."}
            className="w-full min-h-[100px] bg-white/5 border border-white/10 rounded-2xl p-4 pr-14 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-secondary/50 transition-all shadow-inner font-medium resize-none"
            disabled={!ready || loading}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="absolute right-3 bottom-3 size-10 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg disabled:opacity-30 disabled:grayscale hover:scale-105 transition-all shadow-[0_0_15px_-5px_#06b6d4]"
          >
            <Send size={18} />
          </button>

          <div className="absolute left-4 bottom-3 flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-slate-600">
            <span className="flex items-center gap-1"><Zap size={10} className="text-amber-500" /> Turbo 4.0</span>
            <span className="flex items-center gap-1"><MessageSquare size={10} className="text-secondary" /> Contextual</span>
          </div>
        </form>
      </div>
    </div>
  );
}
