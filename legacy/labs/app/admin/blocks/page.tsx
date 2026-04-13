'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, ShieldAlert, Lock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BlocksPage() {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [reason, setReason] = useState('Vacaciones');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchBlocks();
    }, []);

    async function fetchBlocks() {
        setLoading(true);
        const { data } = await supabase
            .from('blocks')
            .select('*')
            .order('start_at', { ascending: false });
        setBlocks(data || []);
        setLoading(false);
    }

    async function addBlock(e: React.FormEvent) {
        e.preventDefault();
        if (!start || !end) return;
        setIsSaving(true);

        // Get Trainer ID
        let { data: trainers } = await supabase.from('trainers').select('id').limit(1);
        let trainerId = trainers?.[0]?.id;
        if (!trainerId) {
            const { data: newTrainer } = await supabase.from('trainers').insert({ display_name: 'Entrenadora' }).select().single();
            trainerId = newTrainer.id;
        }

        const { error } = await supabase.from('blocks').insert({
            trainer_id: trainerId,
            start_at: new Date(start).toISOString(),
            end_at: new Date(end).toISOString(),
            reason
        });

        if (!error) {
            setStart('');
            setEnd('');
            fetchBlocks();
        }
        setIsSaving(false);
    }

    async function deleteBlock(id: string) {
        await supabase.from('blocks').delete().eq('id', id);
        fetchBlocks();
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight uppercase flex items-center gap-4">
                        <Lock className="text-red-500 size-10" /> Bloqueos de Agenda
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] italic">Establece periodos donde NO quieres recibir turnos (vacaciones, feriados, etc).</p>
                </div>
            </div>

            <div className="glass-card bg-red-500/5 border-red-500/20 p-6 flex items-start gap-4">
                <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 border border-red-500/20">
                    <ShieldAlert size={20} />
                </div>
                <div className="space-y-1">
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Información Importante</p>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        Los bloqueos anulan tu disponibilidad regular. El bot rechazará cualquier intento de reserva en estos horarios. Útil para días libres, mantenimiento o emergencias.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1">
                    <div className="glass-card border-white/10 shadow-2xl">
                        <h2 className="text-lg font-black uppercase italic tracking-tight mb-8 flex items-center gap-2 text-white/90">
                            <Plus size={20} className="text-red-500" /> Nuevo Bloqueo
                        </h2>
                        <form onSubmit={addBlock} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Fecha/Hora Inicio</label>
                                <input
                                    type="datetime-local"
                                    value={start}
                                    onChange={e => setStart(e.target.value)}
                                    className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Fecha/Hora Fin</label>
                                <input
                                    type="datetime-local"
                                    value={end}
                                    onChange={e => setEnd(e.target.value)}
                                    className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Razón</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-red-500/50"
                                    placeholder="Ej: Vacaciones, Feriado..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="glow-button !from-red-600 !to-orange-600 w-full !py-4 text-[10px] uppercase tracking-[0.2em]"
                            >
                                {isSaving ? <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" /> : <Lock size={16} />}
                                {isSaving ? 'Bloqueando...' : 'Crear Bloqueo'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2 italic mb-4">Bloqueos Activos</h3>
                    {loading ? (
                        <div className="flex flex-col items-center py-20 animate-pulse">
                            <div className="animate-spin size-10 border-2 border-red-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Cargando...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {blocks.map(block => (
                                <div key={block.id} className="glass-card group flex items-center justify-between hover:border-red-500/30 transition-all duration-500 hover:-translate-y-1 bg-gradient-to-r from-red-500/[0.02] to-transparent">
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 group-hover:rotate-6 transition-transform">
                                                <ShieldAlert size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{block.reason || 'Restricción'}</h4>
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Estado: Bloqueado</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 border-l border-white/5 pl-8">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-600 uppercase">Inicio</p>
                                                <p className="text-xs font-black text-slate-300 italic">{format(new Date(block.start_at), 'dd MMM, HH:mm', { locale: es })}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-600 uppercase">Fin</p>
                                                <p className="text-xs font-black text-slate-300 italic">{format(new Date(block.end_at), 'dd MMM, HH:mm', { locale: es })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteBlock(block.id)}
                                        className="text-slate-600 hover:text-white p-3 rounded-2xl hover:bg-white/5 transition-all active:scale-95"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {blocks.length === 0 && (
                                <div className="glass-card flex flex-col items-center justify-center py-20 border-dashed text-center">
                                    <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700 mb-4">
                                        <Sparkles size={24} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-600">Agenda Libre</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2 italic">No hay bloqueos activos en este momento.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
