'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Smartphone, RefreshCw, CheckCircle,
    AlertCircle, ShieldCheck, Zap, Info,
    ExternalLink, ArrowRight, Wifi
} from 'lucide-react';

export default function ConnectionPage() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'pairing'>('disconnected');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();

        const statusChannel = supabase
            .channel('connection_status_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_status' }, (payload) => {
                if (payload.new.key === 'qr_code') setQrCode(JSON.parse(payload.new.value));
                if (payload.new.key === 'bot_status') setStatus(JSON.parse(payload.new.value));
            })
            .subscribe();

        return () => { supabase.removeChannel(statusChannel); };
    }, []);

    async function fetchStatus() {
        setLoading(true);
        const { data: qrData } = await supabase.from('system_status').select('value').eq('key', 'qr_code').single();
        const { data: statusData } = await supabase.from('system_status').select('value').eq('key', 'bot_status').single();

        if (qrData?.value) setQrCode(JSON.parse(qrData.value));
        if (statusData?.value) setStatus(JSON.parse(statusData.value));
        setLoading(false);
    }

    return (
        <div className="space-y-10 relative z-10 max-w-5xl mx-auto">
            <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                    <Wifi size={12} /> Sync Online
                </div>
                <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Conexión WhatsApp</h1>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Vincula tu dispositivo para activar el asistente.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Connection Visualizer */}
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        {/* Background Glows */}
                        <div className={`absolute -inset-20 blur-[100px] rounded-full opacity-20 transition-all duration-1000 ${status === 'connected' ? 'bg-emerald-500' : 'bg-primary'}`}></div>

                        <div className={`size-80 rounded-[4rem] glass-card flex flex-col items-center justify-center relative z-10 border-white/20 shadow-2xl transition-all duration-700 ${status === 'connected' ? 'rotate-0 scale-100' : 'rotate-2 scale-95'}`}>
                            {status === 'connected' ? (
                                <div className="flex flex-col items-center animate-in zoom-in duration-700">
                                    <div className="size-48 rounded-full border border-emerald-500/20 flex items-center justify-center bg-emerald-500/5 relative mb-6">
                                        <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin duration-[5s]"></div>
                                        <Smartphone size={80} className="text-emerald-500 filter drop-shadow-[0_0_20px_#10b981]" />
                                    </div>
                                    <div className="px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em]">Activado</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center w-full p-8 animate-in fade-in duration-1000">
                                    {qrCode ? (
                                        <div className="relative group/qr">
                                            <div className="absolute -inset-10 bg-primary/40 blur-[50px] rounded-full opacity-30 group-hover/qr:opacity-60 transition-opacity"></div>
                                            <img
                                                src={qrCode.startsWith('data:') ? qrCode : `/whatsapp-qr.png?t=${Date.now()}`}
                                                alt="WhatsApp QR"
                                                className="size-56 rounded-3xl relative z-10 brightness-110 contrast-125 select-none"
                                                style={{ imageRendering: 'pixelated' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="animate-spin size-16 border-[4px] border-primary border-t-transparent rounded-full mb-8 shadow-[0_0_30px_#9333ea]"></div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse italic">Generando Código...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-12 space-y-4 w-full">
                        <button
                            onClick={fetchStatus}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? 'Sincronizando...' : 'Actualizar Estado'}
                        </button>
                    </div>
                </div>

                {/* Instructions & Status */}
                <div className="space-y-8">
                    <div className="glass-card bg-gradient-to-br from-white/[0.03] to-transparent border-white/10">
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/90 mb-8 border-b border-white/5 pb-4">Instrucciones</h3>
                        <div className="space-y-8">
                            {[
                                { step: '01', title: 'Abrir WhatsApp', desc: 'Abre la aplicación WhatsApp en tu teléfono.' },
                                { step: '02', title: 'Dispositivos Vinculados', desc: 'Ve a Configuración > Dispositivos vinculados > Vincular un dispositivo.' },
                                { step: '03', title: 'Escanear QR', desc: 'Apunta la cámara de tu teléfono al código QR que ves en pantalla.' },
                                { step: '04', title: 'Confirmar', desc: 'Espera unos segundos hasta que el estado cambie a "Activado".' }
                            ].map((s, i) => (
                                <div key={i} className="flex gap-6 group">
                                    <span className="text-2xl font-black text-primary/30 group-hover:text-primary transition-colors italic tracking-tighter">{s.step}</span>
                                    <div className="space-y-1">
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">{s.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold italic leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`glass-card border-dashed p-8 text-center transition-all duration-700 ${status === 'connected' ? 'border-emerald-500/30' : 'border-white/10'}`}>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className={`size-3 rounded-full animate-ping ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <h4 className={`text-[11px] font-black uppercase tracking-[0.3em] ${status === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {status === 'connected' ? 'Sistema Operativo' : 'Esperando Conexión'}
                            </h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold italic leading-relaxed uppercase tracking-tighter">
                            Tu asistente {status === 'connected' ? 'está conectado y respondiendo mensajes' : 'está inactivo. Por favor escanea el código'}.
                        </p>

                        {status !== 'connected' && (
                            <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-4 text-left">
                                <AlertCircle size={20} className="text-primary shrink-0" />
                                <p className="text-[10px] font-black text-slate-300 uppercase leading-relaxed tracking-wider">
                                    Nota: Si el código QR no carga, intenta recargar la página.
                                </p>
                            </div>
                        )}

                        {status === 'connected' && (
                            <button
                                onClick={async () => {
                                    if (!confirm('¿Seguro que quieres desconectar el bot? Esto detendrá las respuestas automáticas.')) return;
                                    setLoading(true);
                                    await supabase.from('system_status').upsert({ key: 'bot_status', value: JSON.stringify('disconnected') });
                                    await supabase.from('system_status').upsert({ key: 'qr_code', value: JSON.stringify(null) });
                                    setStatus('disconnected');
                                    setQrCode(null);
                                    setLoading(false);
                                }}
                                className="mt-8 w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3"
                            >
                                <Zap size={16} /> Desconectar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
