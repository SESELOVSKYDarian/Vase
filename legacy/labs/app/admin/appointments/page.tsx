'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, Phone, Zap, Plus, Trash2, Edit2, X } from 'lucide-react';
import ModalPortal from '@/components/modal-portal';

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit/Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        date: '',
        time: '',
        duration: 60,
        isTrial: false,
        notes: ''
    });

    useEffect(() => {
        fetchAppointments();
    }, []);

    // ... existing functions ...

    // Replace the simple conditional rendering with Portal wrapping

    async function fetchAppointments() {
        setLoading(true);
        const { data } = await supabase
            .from('appointments')
            .select(`*, clients ( name, phone )`)
            .eq('status', 'confirmed')
            .order('start_at', { ascending: false })
            .limit(50);
        setAppointments(data || []);
        setLoading(false);
    }

    // --- DELETE LOGIC ---
    function confirmDelete(id: string) {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
    }

    async function executeDelete() {
        if (!deletingId) return;

        await supabase.from('appointments').delete().eq('id', deletingId);

        setIsDeleteModalOpen(false);
        setDeletingId(null);
        fetchAppointments();
    }

    // --- FORM LOGIC ---
    function openEdit(appt: any) {
        setEditingId(appt.id);
        const start = new Date(appt.start_at);
        const end = new Date(appt.end_at);
        const duration = (end.getTime() - start.getTime()) / 60000;

        setFormData({
            clientName: appt.clients?.name || '',
            clientPhone: appt.clients?.phone || '',
            date: format(start, 'yyyy-MM-dd'),
            time: format(start, 'HH:mm'),
            duration: duration,
            isTrial: appt.notes?.includes('Clase de Prueba') || false,
            notes: appt.notes?.replace('Clase de Prueba ', '') || ''
        });
        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setFormData({
            clientName: '',
            clientPhone: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: '09:00',
            duration: 60,
            isTrial: false,
            notes: ''
        });
        setIsModalOpen(true);
    }

    async function handleSave() {
        // 1. Resolve Client
        let clientId = null;
        if (formData.clientPhone) {
            const { data: existingClient } = await supabase.from('clients').select('id').eq('phone', formData.clientPhone).single();
            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient } = await supabase.from('clients').insert({ name: formData.clientName, phone: formData.clientPhone }).select().single();
                clientId = newClient?.id;
            }
        }

        // 2. Resolve Trainer (Default)
        const { data: trainers } = await supabase.from('trainers').select('id').limit(1);
        const trainerId = trainers && trainers[0] ? trainers[0].id : null;
        if (!trainerId) return alert("Error interno: No hay entrenadores.");

        // 3. Dates
        const startAt = new Date(`${formData.date}T${formData.time}:00`);
        const endAt = addMinutes(startAt, formData.duration);

        const payload = {
            trainer_id: trainerId,
            client_id: clientId,
            start_at: startAt.toISOString(),
            end_at: endAt.toISOString(),
            status: 'confirmed',
            source: 'manual',
            notes: formData.isTrial ? 'Clase de Prueba ' + formData.notes : formData.notes
        };

        if (editingId) {
            await supabase.from('appointments').update(payload).eq('id', editingId);
        } else {
            await supabase.from('appointments').insert(payload);
        }

        setIsModalOpen(false);
        fetchAppointments();
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight uppercase flex items-center gap-4">
                        <Calendar className="text-accent size-10" /> Agenda de Turnos
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.2em] italic">Gestión manual y automática de sesiones.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="glow-button !from-accent !to-blue-500 !py-2.5 text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                    <Plus size={16} /> Asignar Turno
                </button>
            </div>

            {/* EDIT/CREATE MODAL */}
            {isModalOpen && (
                <ModalPortal>
                    <div className="modal-overlay">
                        <div className="modal-content !max-w-md">
                            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                                    <Edit2 size={18} className="text-accent" /> {editingId ? 'Editar Turno' : 'Nuevo Turno'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="bg-white/5 p-1 rounded-full hover:bg-white/20 transition-all cursor-pointer z-50">
                                    <X size={20} className="text-slate-400 hover:text-white" />
                                </button>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Cliente Nombre</label>
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                            value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Teléfono (ID)</label>
                                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                            value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Fecha</label>
                                        <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                            value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Hora Inicio</label>
                                        <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                            value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Duración (min)</label>
                                        <input type="number" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                            value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="flex items-center gap-3 pt-6 bg-white/5 rounded-xl px-3 border border-white/5">
                                        <input type="checkbox" id="trial" className="accent-accent size-5"
                                            checked={formData.isTrial} onChange={e => setFormData({ ...formData, isTrial: e.target.checked })} />
                                        <label htmlFor="trial" className="text-[10px] font-black text-white uppercase cursor-pointer select-none">¿Clase de Prueba?</label>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Notas / Tipo</label>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none focus:ring-1 focus:ring-accent"
                                        placeholder="Ej: Pack Mensual, Rehabilitación..."
                                        value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                                </div>

                                <button onClick={handleSave} className="w-full py-4 mt-6 bg-accent text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-accent/80 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer z-50">
                                    {editingId ? 'Guardar Cambios' : 'Crear Turno'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <ModalPortal>
                    <div className="modal-overlay !bg-black/90">
                        <div className="modal-content !max-w-sm border-red-500/30">
                            <div className="flex flex-col items-center text-center space-y-4 p-4 relative z-10">
                                <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 border border-red-500/20">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-black uppercase text-white tracking-widest leading-none">¿Eliminar Turno?</h3>
                                <p className="text-slate-400 text-xs font-medium max-w-xs leading-relaxed">
                                    Esta acción no se puede deshacer. El turno se borrará permanentemente de la base de datos.
                                </p>

                                <div className="flex gap-4 w-full pt-4">
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer z-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={executeDelete}
                                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 cursor-pointer z-50"
                                    >
                                        Sí, Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            <div className="glass-card !p-0 overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black border-b border-white/5 bg-white/[0.02]">
                                <th className="p-6">Fecha y Hora</th>
                                <th className="p-6">Cliente</th>
                                <th className="p-6">Contacto</th>
                                <th className="p-6">Tipo/Info</th>
                                <th className="p-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {appointments?.map((appt: any) => (
                                <tr key={appt.id} className="group hover:bg-white/5 transition-all duration-300">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                <Calendar size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white uppercase tracking-widest">
                                                    {format(new Date(appt.start_at), "EEEE d 'de' MMMM", { locale: es })}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic">
                                                    {format(new Date(appt.start_at), "HH:mm", { locale: es })} hs
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <p className="text-xs font-black text-white uppercase tracking-widest group-hover:text-accent transition-colors">
                                                {appt.clients?.name || 'Desconocido'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-300 transition-colors">
                                            <Phone size={14} className="opacity-50" />
                                            <p className="text-[10px] font-bold italic select-all">
                                                {appt.clients?.phone}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${appt.notes?.includes('Prueba') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                                            {appt.source === 'whatsapp' ? 'Bot IA' : (appt.notes || 'Manual')}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(appt)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-white/0 hover:bg-blue-400/10 rounded-lg">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => confirmDelete(appt.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors bg-white/0 hover:bg-red-400/10 rounded-lg">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!appointments || appointments.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700 mb-4 border border-dashed border-white/10">
                                                <Zap size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">No hay turnos registrados</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
