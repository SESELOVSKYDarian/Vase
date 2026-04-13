'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Zap } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * FormattedText: High-contrast markdown-like formatter for the AI.
 */
const FormattedText = ({ text }: { text: string }) => {
    const lines = text.split('\n');
    return (
        <div className="space-y-3">
            {lines.map((line, i) => {
                // Headers - Gradient text
                if (line.startsWith('### ')) {
                    return (
                        <h3 key={i} className="text-sm font-black uppercase tracking-[0.15em] bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mt-4 first:mt-0">
                            {line.replace('### ', '')}
                        </h3>
                    );
                }

                // Bold and Inline styles
                let html = line
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300 font-extrabold">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');

                // List items
                if (line.trim().startsWith('- ')) {
                    return (
                        <div key={i} className="flex gap-3 ml-1 items-start group">
                            <div className="mt-[7px] size-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.6)] group-hover:scale-125 transition-transform" />
                            <span className="text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: html.replace('- ', '') }} />
                        </div>
                    );
                }

                if (!line.trim()) return <div key={i} className="h-1.5" />;

                return <p key={i} className="text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
            })}
        </div>
    );
};

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '### ¡Bienvenido a VaseLabs!\n\nHola, soy **Vase**, tu asistente de inteligencia avanzada. Estoy aquí para resolver tus dudas y ayudarte a potenciar tu negocio.\n\n- ¿Cómo puedo ayudarte hoy?\n- ¿Tienes dudas sobre la configuración?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    if (!mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/support/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Lo siento, hubo un error de comunicación.' }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: '### Error de Red\nNo pude conectar con mi núcleo central.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop Overlay with Blur & Gradient */}
            {isOpen && (
                <div
                    className="fixed inset-0 animate-in fade-in duration-300"
                    style={{
                        zIndex: 999998,
                        background: 'radial-gradient(ellipse at center, rgba(88, 28, 135, 0.15) 0%, rgba(0, 0, 0, 0.85) 100%)',
                        backdropFilter: 'blur(12px)'
                    }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className="flex flex-col items-end"
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 999999,
                    pointerEvents: 'none'
                }}
            >
                {/* Chat Window - Responsive: 30% width, taller */}
                {isOpen && (
                    <div
                        className="mb-6 w-[30vw] min-w-[320px] max-w-[380px] h-[75vh] max-h-[700px] min-h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-400 rounded-3xl relative"
                        style={{
                            pointerEvents: 'auto',
                            background: 'linear-gradient(180deg, rgba(15, 10, 30, 0.98) 0%, rgba(5, 5, 15, 0.99) 100%)',
                            boxShadow: '0 0 0 1px rgba(168, 85, 247, 0.2), 0 0 60px rgba(168, 85, 247, 0.15), 0 25px 80px -20px rgba(0, 0, 0, 0.9)'
                        }}
                    >
                        {/* Animated Border Glow */}
                        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                            <div className="absolute inset-[-2px] rounded-3xl bg-gradient-to-br from-purple-500/30 via-transparent to-pink-500/30 opacity-60" />
                        </div>

                        {/* Top Accent Gradient */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent z-20" />

                        {/* Header */}
                        <div className="relative z-10 px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-purple-950/40 to-transparent">
                            <div className="flex items-center gap-4">
                                {/* Avatar with glow */}
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-500/40 rounded-2xl blur-xl animate-pulse" />
                                    <div className="relative size-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 flex items-center justify-center shadow-lg">
                                        <Zap size={24} className="text-white" />
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-emerald-400 border-2 border-[#0a0512] shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-tight">
                                        Vase <span className="text-purple-400 font-normal">AI</span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                        <span className="text-[11px] text-slate-400 font-medium">Online • Listo para ayudarte</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="size-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:rotate-90 duration-300"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Chat Messages Area - Scrollable */}
                        <div
                            className="relative flex-1 overflow-y-scroll p-5 space-y-5 z-10 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent"
                            style={{
                                background: 'radial-gradient(ellipse at top, rgba(88, 28, 135, 0.05) 0%, transparent 50%)',
                                overflowY: 'scroll'
                            }}
                        >
                            {/* Subtle grid pattern */}
                            <div
                                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                                style={{
                                    backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.5) 1px, transparent 1px)',
                                    backgroundSize: '40px 40px'
                                }}
                            />

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-3 duration-300`}
                                >
                                    {/* Avatar */}
                                    <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-slate-600 to-slate-700 text-white'
                                        : 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                        }`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-[13px] relative ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-purple-600/80 to-purple-700/80 text-white rounded-br-md shadow-[0_4px_20px_rgba(168,85,247,0.25)]'
                                        : 'bg-white/[0.06] backdrop-blur-sm border border-white/10 text-slate-100 rounded-bl-md'
                                        }`}>
                                        <FormattedText text={msg.content} />
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {loading && (
                                <div className="flex items-end gap-3 animate-in fade-in duration-300">
                                    <div className="size-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white">
                                        <Sparkles size={16} className="animate-spin" />
                                    </div>
                                    <div className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-1.5">
                                        <div className="size-2 rounded-full bg-purple-400 animate-bounce" />
                                        <div className="size-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.15s]" />
                                        <div className="size-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.3s]" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form
                            onSubmit={handleSubmit}
                            className="relative z-10 p-4 border-t border-white/10 bg-gradient-to-t from-black/40 to-transparent"
                        >
                            <div className="relative group">
                                {/* Input glow effect */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                                <div className="relative flex items-center gap-2 bg-white/[0.05] border border-white/10 focus-within:border-purple-500/50 rounded-xl px-4 py-1 transition-colors">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Escribe tu mensaje..."
                                        className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="size-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center active:scale-95 shadow-lg shadow-purple-500/25"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Powered by text */}
                            <p className="text-center text-[10px] text-slate-600 mt-3 font-medium tracking-wide">
                                Powered by <span className="text-purple-500">VaseLabs AI</span>
                            </p>
                        </form>
                    </div>
                )}

                {/* Floating Button */}
                <div className="relative">
                    {!isOpen && (
                        <>
                            {/* Pulse rings */}
                            <div className="absolute inset-[-8px] rounded-full border-2 border-purple-500/30 animate-ping" />
                            <div className="absolute inset-[-4px] rounded-full bg-purple-500/20 blur-xl animate-pulse" />
                        </>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`group relative size-16 rounded-2xl transition-all duration-300 flex items-center justify-center overflow-hidden ${isOpen
                            ? 'bg-slate-800 border border-white/20 hover:bg-slate-700'
                            : 'bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 shadow-[0_8px_40px_rgba(168,85,247,0.4)] hover:shadow-[0_8px_50px_rgba(168,85,247,0.6)] hover:scale-105'
                            }`}
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    >
                        {/* Shine effect */}
                        {!isOpen && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        )}

                        {isOpen ? (
                            <X size={28} className="text-slate-300 group-hover:text-white transition-colors relative z-10" />
                        ) : (
                            <div className="relative z-10">
                                <Bot size={32} className="text-white" />
                                <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 border-2 border-purple-700 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
