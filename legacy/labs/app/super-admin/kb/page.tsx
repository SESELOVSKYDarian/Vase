'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus, Search, Database, MessageSquare,
    Trash2, Edit2, Loader2, Save, X,
    AlertCircle, BookOpen, Sparkles
} from 'lucide-react';
import ModalPortal from '@/components/modal-portal';

export default function KBManagement() {
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [formData, setFormData] = useState({ question: '', answer: '', tags: '' });

    useEffect(() => {
        fetchKB();
    }, []);

    const fetchKB = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('support_kb')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setEntries(data || []);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const entryData = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
        };

        if (editingEntry) {
            const { error } = await supabase
                .from('support_kb')
                .update(entryData)
                .eq('id', editingEntry.id);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase
                .from('support_kb')
                .insert(entryData);
            if (error) alert(error.message);
        }

        setShowModal(false);
        setEditingEntry(null);
        setFormData({ question: '', answer: '', tags: '' });
        fetchKB();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta entrada?')) return;
        const { error } = await supabase.from('support_kb').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchKB();
    };

    const openEditor = (entry: any = null) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                question: entry.question,
                answer: entry.answer,
                tags: entry.tags?.join(', ') || ''
            });
        } else {
            setEditingEntry(null);
            setFormData({ question: '', answer: '', tags: '' });
        }
        setShowModal(true);
    };

    const filteredEntries = entries.filter(e =>
        e.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-secondary font-black uppercase tracking-widest text-[10px] mb-2">
                        <Database size={14} /> Neural Knowledge Base
                    </div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Cerebro <span className="text-secondary">Soporte</span></h1>
                </div>
                <button
                    onClick={() => openEditor()}
                    className="glow-button-secondary py-3 px-8 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                    <Plus size={18} /> Nueva Entrada
                </button>
            </div>

            <div className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-secondary transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Buscar en la base de conocimientos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-body"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <Loader2 className="animate-spin mx-auto text-secondary mb-4" size={40} />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Accediendo a la red neuronal...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <BookOpen className="mx-auto text-slate-700 mb-4" size={40} />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Base de datos vacía. Empieza a entrenar al bot.</p>
                    </div>
                ) : (
                    filteredEntries.map(entry => (
                        <div key={entry.id} className="glass-card flex flex-col group hover:border-secondary/30 transition-all duration-300">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                    <span className="text-[10px] font-black uppercase text-secondary tracking-widest bg-secondary/10 px-2 py-0.5 rounded-lg border border-secondary/20 flex items-center gap-1.5">
                                        <Sparkles size={10} /> Nodo Neural
                                    </span>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditor(entry)} className="p-1.5 text-slate-400 hover:text-white transition"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <h4 className="text-sm font-black text-white leading-tight uppercase italic">{entry.question}</h4>
                                <p className="text-[11px] text-slate-400 font-bold leading-relaxed line-clamp-3 italic opacity-80">{entry.answer}</p>
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {entry.tags?.map((tag: string) => (
                                        <span key={tag} className="text-[8px] font-black uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <ModalPortal>
                    <div className="modal-overlay">
                        <div className="modal-content !max-w-2xl !bg-[#0a0b14]">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                                            <Save size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Entrenar Chatbot</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Actualizar Base de Conocimiento</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition"><X size={20} /></button>
                                </div>

                                <form onSubmit={handleSave} className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Pregunta / Título</label>
                                        <input
                                            type="text" required
                                            value={formData.question}
                                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body"
                                            placeholder="¿Cómo configuro mi bot?"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Respuesta Detallada</label>
                                        <textarea
                                            required
                                            rows={6}
                                            value={formData.answer}
                                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body resize-none"
                                            placeholder="Escribe la respuesta que el chatbot debe dar..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Tags (separados por coma)</label>
                                        <input
                                            type="text"
                                            value={formData.tags}
                                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 font-body"
                                            placeholder="configuracion, whatsapp, errores"
                                        />
                                    </div>

                                    <button className="glow-button-secondary w-full py-5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3">
                                        <Save size={18} /> Guardar Nodo Neural
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
