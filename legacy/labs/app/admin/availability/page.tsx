'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Plus, Clock, ArrowRight, Shield } from 'lucide-react';

const DAYS = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 7, name: 'Domingo' },
];

export default function AvailabilityPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [day, setDay] = useState(1);
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('17:00');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    async function fetchRules() {
        setLoading(true);
        const { data } = await supabase
            .from('availability_rules')
            .select('*')
            .order('day_of_week')
            .order('start_time');
        setRules(data || []);
        setLoading(false);
    }

    async function addRule(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);

        const { data: trainers } = await supabase.from('trainers').select('id').limit(1);
        let trainerId = trainers?.[0]?.id;
        if (!trainerId) {
            const { data: newTrainer } = await supabase.from('trainers').insert({ display_name: 'Entrenadora' }).select().single();
            trainerId = newTrainer.id;
        }

        const { error } = await supabase.from('availability_rules').insert({
            trainer_id: trainerId,
            day_of_week: day,
            start_time: start,
            end_time: end,
            is_active: true
        });

        if (!error) fetchRules();
        setIsSaving(false);
    }

    async function deleteRule(id: string) {
        await supabase.from('availability_rules').delete().eq('id', id);
        fetchRules();
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight uppercase flex items-center gap-4">
                        <Clock className="text-primary size-10" /> Disponibilidad
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] italic">Define tus horarios de atención para que el bot pueda agendar turnos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="lg:col-span-1">
                    <div className="glass-card border-white/10 shadow-2xl sticky top-8">
                        <h2 className="text-lg font-black uppercase italic tracking-tight mb-8 flex items-center gap-2">
                            <Plus size={20} className="text-primary" /> Nuevo Horario
                        </h2>
                        <form onSubmit={addRule} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Día de la Semana</label>
                                <select
                                    value={day}
                                    onChange={e => setDay(Number(e.target.value))}
                                    className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                >
                                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Desde</label>
                                    <input
                                        type="time"
                                        value={start}
                                        onChange={e => setStart(e.target.value)}
                                        className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Hasta</label>
                                    <input
                                        type="time"
                                        value={end}
                                        onChange={e => setEnd(e.target.value)}
                                        className="w-full p-4 border border-white/5 rounded-2xl bg-background-dark/50 text-slate-300 text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="glow-button w-full !py-4 text-[10px] uppercase tracking-[0.2em]"
                            >
                                {isSaving ? <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" /> : <Plus size={16} />}
                                {isSaving ? 'Guardando...' : 'Agregar Horario'}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield size={16} className="text-slate-500" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Validación</h4>
                            </div>
                            <p className="text-[10px] text-slate-600 font-bold leading-relaxed italic">
                                El sistema verificará que no haya superposición de horarios automáticamente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* List Column */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2 italic mb-4">Horarios Activos</h3>
                    {loading ? (
                        <div className="flex flex-col items-center py-20 animate-pulse">
                            <div className="animate-spin size-10 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rules.map(rule => (
                                <div key={rule.id} className="glass-card group flex items-center justify-between hover:border-primary/30 transition-all duration-500 hover:translate-x-1">
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                <div className="text-[10px] font-black uppercase">{DAYS.find(d => d.id === rule.day_of_week)?.name.slice(0, 3)}</div>
                                            </div>
                                            <div className="w-24 font-black text-white uppercase tracking-widest text-sm italic">
                                                {DAYS.find(d => d.id === rule.day_of_week)?.name}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-2 rounded-xl border border-white/5">
                                                <span className="text-xs font-black text-slate-300">{rule.start_time.slice(0, 5)}</span>
                                                <ArrowRight size={12} className="text-primary" />
                                                <span className="text-xs font-black text-slate-300">{rule.end_time.slice(0, 5)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteRule(rule.id)}
                                        className="text-slate-600 hover:text-red-400 p-2 rounded-xl hover:bg-red-400/10 transition-all active:scale-95"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {rules.length === 0 && (
                                <div className="glass-card flex flex-col items-center justify-center py-20 border-dashed text-center">
                                    <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700 mb-4">
                                        <Clock size={24} />
                                    </div>
                                    <h3 className="text-sm font-black uppercase italic tracking-widest text-slate-600">Sin Horarios</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">No has configurado ningún horario de atención.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
