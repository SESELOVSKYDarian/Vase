'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare, Users, Rocket, MoreVertical,
  Calendar, RefreshCw, Smartphone, TrendingUp, Bell
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminDashboard() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'pairing'>('disconnected');
  const [loading, setLoading] = useState(true);

  // Dashboard Metrics State
  const [metrics, setMetrics] = useState({
    conversations: 0,
    leads: 0,
    appointments: 0,
    automationRate: 94.2,
    responseTime: 42,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ day: string, val: number }[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchMetrics();

    // Direct Status Subscription
    const statusChannel = supabase
      .channel('dashboard_status_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_status' }, (payload) => {
        if (payload.new.key === 'qr_code') setQrCode(JSON.parse(payload.new.value));
        if (payload.new.key === 'bot_status') setStatus(JSON.parse(payload.new.value));
      })
      .subscribe();

    // Metrics Subscriptions
    const metricsChannel = supabase
      .channel('dashboard_metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, []);

  async function fetchStatus() {
    setLoading(true);
    const { data: qrData } = await supabase.from('system_status').select('value').eq('key', 'qr_code').single();
    const { data: statusData } = await supabase.from('system_status').select('value').eq('key', 'bot_status').single();

    if (qrData?.value) setQrCode(JSON.parse(qrData.value));
    if (statusData?.value) setStatus(JSON.parse(statusData.value));
    setLoading(false);
  }

  async function fetchMetrics() {
    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const { count: convCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
      const { count: leadCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: apptCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });

      const { data: recent } = await supabase
        .from('appointments')
        .select(`
          id,
          start_at,
          status,
          source,
          clients (name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: historicalData } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return {
          full: d.toISOString().split('T')[0],
          short: d.toLocaleDateString('es-AR', { weekday: 'short' })
        };
      });

      const processedChartData = days.map(day => {
        const count = historicalData?.filter(c => c.created_at.startsWith(day.full)).length || 0;
        return { day: day.short, val: count };
      });

      const maxValue = Math.max(...processedChartData.map(d => d.val), 1);
      const normalizedData = processedChartData.map(d => ({
        day: d.day,
        val: d.val / maxValue
      }));

      setMetrics(prev => ({
        ...prev,
        conversations: convCount || 0,
        leads: leadCount || 0,
        appointments: apptCount || 0,
      }));
      setRecentAppointments(recent || []);
      setChartData(normalizedData);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tight uppercase leading-none">Resumen General</h2>
          <p className="text-slate-400 font-bold mt-2 flex items-center gap-2 text-sm">
            <div className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#9333ea]"></div>
            Tu negocio en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchMetrics} className="glow-button !py-2.5 text-[10px] uppercase tracking-widest">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {[
          { label: 'Conversaciones', value: metrics.conversations, icon: MessageSquare, color: 'text-primary' },
          { label: 'Clientes', value: metrics.leads, icon: Users, color: 'text-secondary' },
          { label: 'Turnos', value: metrics.appointments, icon: Calendar, color: 'text-accent' },
          { label: 'Efectividad', value: metrics.automationRate + '%', icon: Rocket, color: 'text-emerald-400' }
        ].map((kpi, i) => (
          <div key={i} className="glass-card group flex flex-col justify-between h-36 relative overflow-hidden border-white/5 hover:border-white/20">
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
              <kpi.icon size={120} />
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-widest">
              <div className={`p-1.5 rounded-lg bg-white/5 ${kpi.color}`}>
                <kpi.icon size={14} />
              </div>
              {kpi.label}
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-black text-white tracking-tighter">{kpi.value.toLocaleString()}</div>
              <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                <TrendingUp size={12} /> +2.4%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card flex flex-col h-[450px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Rocket size={160} />
            </div>

            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tight text-white/90">Actividad Reciente</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Interacciones de los últimos días</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary shadow-[0_0_10px_#9333ea]"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Leads Activos</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative mt-4">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333ea" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d={chartData.length > 1 ? `M ${chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100}% ${100 - (d.val * 80 + 10)}%`).join(' L ')}` : ''}
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  className="transition-all duration-1000"
                />
                <path
                  d={chartData.length > 1 ? `M ${chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100}% ${100 - (d.val * 80 + 10)}%`).join(' L ')} L 100% 100% L 0% 100% Z` : ''}
                  fill="url(#chartGradient)"
                  className="transition-all duration-1000"
                />
                {chartData.map((d, i) => (
                  <circle
                    key={i}
                    cx={`${(i / (chartData.length - 1)) * 100}%`}
                    cy={`${100 - (d.val * 80 + 10)}%`}
                    r="5"
                    fill="#05060d"
                    stroke="#9333ea"
                    strokeWidth="3"
                    className="hover:r-8 cursor-pointer transition-all duration-300"
                  />
                ))}
              </svg>
            </div>

            <div className="flex justify-between mt-10 px-2 border-t border-white/5 pt-6">
              {chartData.map((d, i) => (
                <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                  {d.day}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card !p-0 overflow-hidden">
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tight text-white/90">Últimos Turnos</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Citas agendadas recientemente</p>
              </div>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black border-b border-white/5">
                    <th className="pb-6 px-4">Cliente</th>
                    <th className="pb-6 px-4">Fecha</th>
                    <th className="pb-6 px-4">Estado</th>
                    <th className="pb-6 px-4 text-right">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentAppointments.length > 0 ? recentAppointments.map((app) => (
                    <tr key={app.id} className="group hover:bg-white/5 transition-all duration-300">
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-xl glass-card !p-0 flex items-center justify-center font-black text-primary text-xs uppercase bg-primary/5 group-hover:scale-110 transition-transform">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white group-hover:text-primary-light transition-colors">{app.clients?.name || 'Nuevo Cliente'}</p>
                            <p className="text-[10px] text-slate-500 font-bold italic select-all">{(app.clients as any)?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-300">
                            {format(new Date(app.start_at), "d MMMM", { locale: es })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                            {format(new Date(app.start_at), "HH:mm", { locale: es })} hs
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                            Confirmado
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <button className="p-2 text-slate-500 hover:text-white transition-all hover:rotate-90">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500 text-xs font-black uppercase tracking-[0.3em] italic">No hay actividad reciente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Connection */}
        <div className="space-y-8">
          <div className="glass-card text-center relative overflow-hidden group border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="p-2 rounded-full border border-white/5 bg-white/5 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-4">Estado de Conexión</h3>
              </div>

              <div className="mb-12 flex justify-center relative">
                {status === 'connected' ? (
                  <div className="size-56 rounded-full border border-primary/20 flex flex-col items-center justify-center relative bg-primary/5">
                    <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin duration-[4s] shadow-[0_0_20px_rgba(147,51,234,0.3)]"></div>
                    <div className="size-48 rounded-full border border-white/5 flex flex-col items-center justify-center bg-background-dark/80 glass-blur">
                      <Smartphone size={56} className="text-primary mb-3 floating filter drop-shadow-[0_0_10px_rgba(147,51,234,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Conectado</span>
                    </div>
                  </div>
                ) : (
                  <div className="size-56 rounded-3xl glass-card flex flex-col items-center justify-center relative border-white/20 group-hover:rotate-1 transition-all duration-500 shadow-2xl">
                    {qrCode ? (
                      <div className="relative group/qr">
                        <div className="absolute -inset-10 bg-primary/30 blur-[60px] rounded-full opacity-0 group-hover/qr:opacity-100 transition-opacity duration-1000"></div>
                        <img
                          src={qrCode.startsWith('data:') ? qrCode : `/whatsapp-qr.png?t=${Date.now()}`}
                          alt="WhatsApp QR"
                          className="size-44 rounded-2xl relative z-10 brightness-110 contrast-125"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin size-12 border-[4px] border-primary border-t-transparent rounded-full mb-6 shadow-[0_0_25px_#9333ea]"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Generando QR...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full space-y-4 px-4 relative z-10">
                <div className={`py-4 px-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] border transition-all duration-500 ${status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-primary/20 text-white border-primary/40 shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:bg-primary transition-all cursor-pointer select-none active:scale-95'}`}>
                  {status === 'connected' ? 'WhatsApp Online' : 'Vincular WhatsApp'}
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-2">
                  {status === 'connected' ? 'El asistente está activo y respondiendo mensajes.' : 'Escanea el código QR con tu WhatsApp para conectar el asistente.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="pt-8 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-black uppercase tracking-widest relative z-10">
        <p>© 2026 VaseLabs AI Research.</p>
      </footer>
    </div>
  );
}
