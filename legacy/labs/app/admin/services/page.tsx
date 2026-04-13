'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, Clock, DollarSign, Plus, Trash2, X, Activity } from 'lucide-react';
import ModalPortal from '@/components/modal-portal';

export default function ServicesPage() {
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState({
        name: '',
        duration: 60,
        price: 0,
        description: ''
    });

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('services')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            setServices(data || []);
        }
        setLoading(false);
    }

    async function addService() {
        if (!newService.name) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('services')
            .insert({
                user_id: user.id,
                name: newService.name,
                duration: newService.duration,
                price: newService.price,
                description: newService.description
            });

        if (!error) {
            setNewService({ name: '', duration: 60, price: 0, description: '' });
            setIsAdding(false);
            fetchServices();
        }
    }

    async function deleteService(id: string) {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;
        await supabase.from('services').delete().eq('id', id);
        fetchServices();
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase flex items-center gap-4">
                        <Briefcase className="text-amber-400 size-8" /> Servicios y Precios
                    </h1>
                    <p className="text-slate-400 font-medium mt-1 text-sm">
                        Configura los servicios que puede ofrecer tu asistente.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="glow-button min-w-[200px] !from-amber-500 !to-orange-500"
                >
                    <Plus size={18} /> Nuevo Servicio
                </button>
            </div>

            {isAdding && (
                <ModalPortal>
                    <div className="modal-overlay">
                        <div className="modal-content border-amber-500/30">
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 relative z-10">
                                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                                    <Activity size={18} className="text-amber-400" /> Crear Servicio
                                </h3>
                                <button onClick={() => setIsAdding(false)} className="bg-white/5 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer z-50">
                                    <X size={20} className="text-slate-400 hover:text-white" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative z-10">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Nombre del Servicio</label>
                                    <input
                                        type="text"
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-amber-500/50 placeholder:text-slate-600"
                                        placeholder="Ej: Clase Funcional, Consulta..."
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Duración (Min)</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <input
                                                type="number"
                                                value={newService.duration}
                                                onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Precio ($)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                            <input
                                                type="number"
                                                value={newService.price}
                                                onChange={(e) => setNewService({ ...newService, price: parseInt(e.target.value) })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 relative z-10">
                                <button
                                    onClick={addService}
                                    className="w-full py-4 rounded-xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer z-50"
                                >
                                    Guardar Servicio
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div key={service.id} className="glass-card group hover:border-amber-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white">{service.name}</h3>
                            <button onClick={() => deleteService(service.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                                <Clock size={14} className="text-amber-400" />
                                <span className="text-xs font-bold text-slate-300">{service.duration} min</span>
                            </div>
                            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                                <DollarSign size={14} className="text-green-400" />
                                <span className="text-xs font-bold text-slate-300">${service.price}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {services.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No hay servicios configurados</p>
                    </div>
                )}
            </div>
        </div>
    );
}
