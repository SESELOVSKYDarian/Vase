'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ModalPortal from '@/components/modal-portal';
import {
    Users, Building2, ShieldCheck, TrendingUp,
    Search, Filter, Plus, Mail, Shield,
    MoreHorizontal, Download, Loader2, AlertCircle,
    BarChart3, UserPlus, HeartPulse, ChevronRight, X
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSupport: 0,
        totalBusinesses: 0,
        averagePlan: 'Pro'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'support',
        business_name: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const response = await fetch('/api/admin/create-staff-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert('Usuario staff creado exitosamente');
            setShowCreateModal(false);
            setFormData({ email: '', password: '', role: 'support', business_name: '' });
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // En una implementación real, esto vendría de una vista o múltiples queries
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(profiles || []);

            setStats({
                totalUsers: profiles?.length || 0,
                activeSupport: profiles?.filter(p => p.role === 'support').length || 0,
                totalBusinesses: profiles?.filter(p => p.role === 'business').length || 0,
                averagePlan: 'Mix'
            });
        } catch (err) {
            console.error('Error fetching admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    return (
        <div className="p-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <ShieldCheck size={14} />
                        Acceso Super Admin
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                        Centro de <span className="text-primary">Control</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 italic">
                        Gestión global de la red VaseLabs
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Download size={14} />
                        Exportar Reporte
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="glow-button py-2 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <UserPlus size={14} />
                        Nuevo Soporte
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="glass-card flex flex-col gap-2">
                    <div className="flex items-center justify-between text-slate-500 font-black uppercase tracking-widest text-[10px]">
                        Usuarios Totales
                        <Users size={16} className="text-primary" />
                    </div>
                    <div className="text-3xl font-black text-white italic">{stats.totalUsers}</div>
                    <div className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                        <TrendingUp size={12} /> +12% este mes
                    </div>
                </div>

                <div className="glass-card flex flex-col gap-2">
                    <div className="flex items-center justify-between text-slate-500 font-black uppercase tracking-widest text-[10px]">
                        Staff de Soporte
                        <Shield size={16} className="text-secondary" />
                    </div>
                    <div className="text-3xl font-black text-white italic">{stats.activeSupport}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personal Activo</div>
                </div>

                <div className="glass-card flex flex-col gap-2">
                    <div className="flex items-center justify-between text-slate-500 font-black uppercase tracking-widest text-[10px]">
                        Empresas B2B
                        <Building2 size={16} className="text-orange-500" />
                    </div>
                    <div className="text-3xl font-black text-white italic">{stats.totalBusinesses}</div>
                    <div className="text-[10px] text-orange-400/80 font-bold uppercase tracking-widest italic">Activos en plataforma</div>
                </div>

                <div className="glass-card flex flex-col gap-2">
                    <div className="flex items-center justify-between text-slate-500 font-black uppercase tracking-widest text-[10px]">
                        Estado de Salud
                        <HeartPulse size={16} className="text-accent" />
                    </div>
                    <div className="text-3xl font-black text-white italic uppercase tracking-tighter">Optimo</div>
                    <div className="text-[10px] text-accent/80 font-bold uppercase tracking-widest italic flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-accent animate-ping"></div>
                        Latencia 42ms
                    </div>
                </div>
            </div>

            {/* Database View Section */}
            <div className="glass-card !p-0 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Base de Datos Usuarios</h3>
                        <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-green-500"></span>
                            <span className="text-[10px] font-black uppercase text-slate-500">Sincronizado</span>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por empresa o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-6 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-80"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Empresa / Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status / Rol</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Plan Actual</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Conexión</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando Nodos de Datos</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <AlertCircle className="mx-auto text-slate-700 mb-2" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No se encontraron registros</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-white italic group-hover:bg-primary/20 group-hover:border-primary/50 transition-all">
                                                    {user.business_name?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white uppercase tracking-wider">{user.business_name || 'Sin Nombre'}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">{user.business_type || 'Personal'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.role === 'super_admin' ? 'bg-primary/10 border-primary/20 text-primary' :
                                                user.role === 'support' ? 'bg-secondary/10 border-secondary/20 text-secondary' :
                                                    'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                                }`}>
                                                <div className={`size-1.5 rounded-full ${user.role === 'super_admin' ? 'bg-primary shadow-[0_0_8px_#9333ea]' :
                                                    user.role === 'support' ? 'bg-secondary' : 'bg-slate-500'
                                                    }`}></div>
                                                {user.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[10px] font-black text-white uppercase italic">{user.plan || 'Gratuito'}</div>
                                                <div className="text-[9px] text-slate-500 font-bold uppercase">Ciclo Mensual</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-black text-slate-400 font-mono italic">{user.phone || 'No asig.'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="size-8 rounded-lg border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Mostrando {filteredUsers.length} de {stats.totalUsers} registros</p>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1.5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600">Prev</button>
                        <button disabled className="px-3 py-1.5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600">Next</button>
                    </div>
                </div>
            </div>

            {/* CREATE STAFF MODAL */}
            {showCreateModal && (
                <ModalPortal>
                    <div className="modal-overlay">
                        <div className="modal-content !max-w-lg">
                            <div className="flex flex-col space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                            <UserPlus size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Onboarding Staff</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Crear nueva credencial de staff</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateStaff} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Email Corporativo</label>
                                        <input
                                            type="email" required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="agente@vaselabs.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Password Temporal</label>
                                        <input
                                            type="password" required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Rol de Staff</label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="support">Soporte (Agente)</option>
                                                <option value="super_admin">Super Admin (Master)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Nombre Mostrar</label>
                                            <input
                                                type="text" required
                                                value={formData.business_name}
                                                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="Agent Alpha"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        disabled={createLoading}
                                        className="glow-button w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-4"
                                    >
                                        {createLoading ? <Loader2 className="animate-spin" size={18} /> : <>Crear Credenciales staff <ChevronRight size={16} /></>}
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
