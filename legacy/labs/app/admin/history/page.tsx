'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    History as HistoryIcon, Search, User,
    FileText, Plus, X,
    ChevronRight, Activity, Clock, HeartPulse,
    Database, MoreVertical, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClinicalHistoryPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [newRecord, setNewRecord] = useState({ content: '', type: 'Seguimiento' });
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchTerm.length > 2) {
            searchClients();
        } else if (searchTerm.length === 0) {
            setClients([]);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (selectedClient) {
            fetchRecords();
        }
    }, [selectedClient]);

    async function searchClients() {
        const { data } = await supabase
            .from('clients')
            .select('*')
            .ilike('name', `%${searchTerm}%`)
            .limit(5);
        setClients(data || []);
    }

    async function fetchRecords() {
        setLoading(true);
        const { data } = await supabase
            .from('class_records')
            .select('*')
            .eq('client_id', selectedClient.id)
            .order('created_at', { ascending: false });
        setRecords(data || []);
        setLoading(false);
    }

    async function addRecord() {
        if (!newRecord.content) return;
        const { error } = await supabase
            .from('class_records')
            .insert({
                client_id: selectedClient.id,
                content: newRecord.content,
                type: newRecord.type,
                created_at: new Date().toISOString()
            });

        if (!error) {
            setNewRecord({ content: '', type: 'Seguimiento' });
            setIsAdding(false);
            fetchRecords();
        }
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight uppercase flex items-center gap-4">
                        <HistoryIcon className="text-secondary size-10" /> Historia Clínica
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] italic">Registro de evolución y notas de pacientes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Search & Results Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card !p-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar Paciente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background-dark/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs font-black uppercase tracking-widest text-slate-300 outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2 italic">Resultados</h3>
                        {clients.map((client) => (
                            <button
                                key={client.id}
                                onClick={() => setSelectedClient(client)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${selectedClient?.id === client.id
                                    ? 'bg-primary/20 border-primary/40 shadow-[0_0_20px_rgba(147,51,234,0.1)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-slate-400'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`size-8 rounded-lg flex items-center justify-center font-black text-xs ${selectedClient?.id === client.id ? 'bg-primary text-white' : 'bg-white/5 text-slate-500'}`}>
                                        {client.name[0]}
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-widest ${selectedClient?.id === client.id ? 'text-white' : 'text-slate-300'}`}>
                                            {client.name}
                                        </p>
                                        <p className="text-[9px] font-bold italic opacity-50">{client.phone}</p>
                                    </div>
                                </div>
                                <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedClient?.id === client.id ? 'text-primary' : ''}`} />
                            </button>
                        ))}
                        {searchTerm.length > 2 && clients.length === 0 && (
                            <p className="text-[10px] text-slate-500 font-black uppercase text-center py-8 italic tracking-widest">No encontrado</p>
                        )}
                    </div>
                </div>

                {/* Content Area Column */}
                <div className="lg:col-span-3">
                    {selectedClient ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-6 border-secondary/20 bg-gradient-to-r from-secondary/5 to-transparent">
                                <div className="flex items-center gap-6">
                                    <div className="size-20 rounded-3xl glass-card !p-0 flex items-center justify-center bg-secondary/10 border-secondary/20 rotate-3">
                                        <User size={40} className="text-secondary filter drop-shadow-[0_0_10px_#2dd4bf]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white italic tracking-tight uppercase leading-none">{selectedClient.name}</h2>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                <Clock size={12} className="text-secondary" /> ID: {selectedClient.id.slice(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="glow-button !from-secondary !to-emerald-500 !py-3 px-6 text-[10px] uppercase tracking-[0.2em]"
                                    >
                                        <Plus size={16} /> Agregar Nota
                                    </button>
                                </div>
                            </div>

                            {isAdding && (
                                <div className="glass-card border-secondary/30 animate-in zoom-in-95 duration-300 shadow-[0_0_40px_rgba(45,212,191,0.1)]">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                                            <Activity size={18} className="text-secondary" /> Nueva Entrada
                                        </h3>
                                        <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2 block">Tipo de Nota</label>
                                            <select
                                                value={newRecord.type}
                                                onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                                                className="w-full md:w-1/3 bg-background-dark/50 border border-white/5 rounded-xl py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-300 outline-none focus:ring-1 focus:ring-secondary/50"
                                            >
                                                <option>Seguimiento</option>
                                                <option>Evaluación Inicial</option>
                                                <option>Rutina</option>
                                                <option>Observación</option>
                                            </select>
                                        </div>

                                        <textarea
                                            placeholder="Escribí aquí los detalles..."
                                            value={newRecord.content}
                                            onChange={(e) => setNewRecord({ ...newRecord, content: e.target.value })}
                                            className="w-full h-40 bg-background-dark/50 border border-white/5 rounded-2xl p-6 text-sm font-medium text-slate-300 outline-none focus:ring-1 focus:ring-secondary/50 resize-none transition-all placeholder:text-slate-600 leading-relaxed"
                                        />

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={addRecord}
                                                className="px-8 py-3 rounded-xl bg-secondary text-background-dark font-black text-[10px] uppercase tracking-widest hover:bg-secondary-light transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(45,212,191,0.2)]"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2 italic">Historial</h3>
                                {records.length > 0 ? (
                                    records.map((record, i) => (
                                        <div key={record.id} className="glass-card relative border-white/5 hover:border-white/10 transition-all duration-500 group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-secondary">
                                                        {record.type === 'Evaluación Inicial' ? <HeartPulse size={18} /> : <FileText size={18} />}
                                                    </div>
                                                    <div>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black uppercase tracking-widest text-secondary border border-secondary/20">
                                                            {record.type}
                                                        </span>
                                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase italic tracking-tighter">
                                                            {format(new Date(record.created_at), "eeee, d 'de' MMMM, HH:mm", { locale: es })} hs
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className="text-slate-600 hover:text-white transition-colors">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                            <p className="text-slate-300 text-sm font-medium leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5 italic">
                                                "{record.content}"
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass-card flex flex-col items-center justify-center py-20 border-dashed">
                                        <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-slate-600 mb-4">
                                            <Database size={24} />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 italic">No hay registros</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card flex flex-col items-center justify-center min-h-[500px] border-dashed text-center">
                            <div className="size-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-8 relative">
                                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin opacity-20"></div>
                                <Users size={48} className="text-slate-700" />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-widest text-slate-600 mb-2">Selecciona un Paciente</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 max-w-xs leading-relaxed">
                                Usa el buscador de la izquierda para ver el historial.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
