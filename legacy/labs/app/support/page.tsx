'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    MessageSquare, User, Clock, Send,
    CheckCircle2, Bot, AlertCircle, Loader2,
    ChevronRight, Search, Filter, Phone
} from 'lucide-react';

interface Ticket {
    id: string;
    status: 'open' | 'closed';
    created_at: string;
    subject: string;
    profiles?: {
        business_name: string;
        phone: string;
    };
}

interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id?: string;
    content: string;
    is_bot: boolean;
    created_at: string;
}

export default function SupportChatPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
        const subscription = supabase
            .channel('support_updates')
            .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    useEffect(() => {
        if (activeTicket) {
            fetchMessages(activeTicket.id);
            const msgSub = supabase
                .channel(`chat_${activeTicket.id}`)
                .on('postgres_changes' as any, {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${activeTicket.id}`
                }, (payload: { new: SupportMessage }) => {
                    setMessages(prev => [...prev, payload.new]);
                })
                .subscribe();

            return () => { supabase.removeChannel(msgSub); };
        }
    }, [activeTicket]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const fetchTickets = async () => {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*, profiles(business_name, phone)')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setTickets(data || []);
        setLoading(false);
    };

    const fetchMessages = async (ticketId: string) => {
        const { data, error } = await supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) console.error(error);
        else setMessages(data || []);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeTicket || sending) return;

        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: activeTicket.id,
                sender_id: user?.id,
                content: input,
                is_bot: false
            });

        if (error) alert(error.message);
        else setInput('');
        setSending(false);
    };

    const closeTicket = async (id: string) => {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: 'closed' })
            .eq('id', id);
        if (error) alert(error.message);
        else fetchTickets();
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden">
            {/* Sidebar de Tickets */}
            <aside className="w-80 border-r border-white/5 bg-[#0a0b14]/50 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-secondary transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar tickets..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-secondary/50 font-black uppercase tracking-widest"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-secondary" size={24} /></div>
                    ) : tickets.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">Cola de tickets vacía</div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setActiveTicket(ticket)}
                                className={`w-full p-5 flex flex-col gap-2 border-b border-white/5 text-left transition-all ${activeTicket?.id === ticket.id ? 'bg-secondary/10 border-r-2 border-r-secondary shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]' : 'hover:bg-white/[0.02]'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${ticket.status === 'open' ? 'text-green-500' : 'text-slate-500'}`}>
                                        {ticket.status === 'open' ? '• En Espera' : '• Resuelto'}
                                    </span>
                                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-xs font-black text-white uppercase italic tracking-tight truncate">{ticket.profiles?.business_name || 'Business User'}</div>
                                <div className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-widest">{ticket.subject}</div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Area de Chat */}
            <main className="flex-1 flex flex-col bg-[#05060d] relative">
                {!activeTicket ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="size-20 rounded-3xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-[0_0_40px_-5px_#06b6d433]">
                            <MessageSquare size={32} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Lobby de Asistencia</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Selecciona un ticket para iniciar el protocolo</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <header className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center text-secondary shadow-[0_0_20px_-5px_#06b6d4]">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">{activeTicket.profiles?.business_name || 'Sesión Activa'}</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-secondary uppercase tracking-widest">
                                            <div className="size-1.5 rounded-full bg-secondary animate-pulse"></div> Canal Seguro
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            <Phone size={10} /> {activeTicket.profiles?.phone || 'Sin tel.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => closeTicket(activeTicket.id)}
                                className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]"
                            >
                                Resolver Ticket
                            </button>
                        </header>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar" ref={scrollRef}>
                            {messages.map((msg, i) => {
                                const isMe = msg.sender_id && !msg.is_bot; // Implementación real: comparar con current user
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1.5 px-2">
                                            <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest italic">
                                                {msg.is_bot ? 'Sytem Hub' : isMe ? 'Agent Alpha' : 'Business Unit'}
                                            </span>
                                        </div>
                                        <div className={`max-w-[70%] p-4 rounded-2xl text-[11px] font-bold leading-relaxed shadow-lg ${isMe
                                            ? 'bg-secondary text-white shadow-[0_10px_30px_-10px_rgba(6,182,212,0.4)]'
                                            : msg.is_bot
                                                ? 'bg-white/5 border border-white/10 text-slate-400 italic'
                                                : 'bg-white/10 border border-white/10 text-slate-100'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSend} className="p-8 border-t border-white/5 bg-white/[0.01]">
                            <div className="flex gap-4 items-center bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-secondary/50 transition-all shadow-inner">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Inyectar respuesta en el canal..."
                                    className="flex-1 bg-transparent border-none outline-none px-4 text-xs text-white placeholder:text-slate-600 font-body"
                                />
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="size-12 rounded-xl bg-secondary flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all shadow-[0_0_20px_-5px_#06b6d4]"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </main>
        </div>
    );
}
