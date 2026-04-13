'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bot, Save, Sparkles, AlertCircle, CheckCircle, Info, Activity, Globe } from 'lucide-react';

export default function AITrainingPage() {
    const [config, setConfig] = useState<any>({
        system_prompt: '',
        temperature: 0.7,
        knowledge_base: {
            services: [],
            prices: {}
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    async function fetchConfig() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('value')
                .eq('user_id', user.id)
                .eq('key', 'config')
                .single();

            if (data) {
                setConfig(data.value);
            }
        }
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        setMessage(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setMessage({ type: 'error', text: 'Sesión expirada' });
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from('ai_settings')
            .upsert({
                user_id: user.id,
                key: 'config',
                value: config,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Save error:', error);
            setMessage({ type: 'error', text: 'Error al guardar.' });
        } else {
            setMessage({ type: 'success', text: 'Configuración actualizada.' });
            setTimeout(() => setMessage(null), 3000);
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary shadow-[0_0_15px_#9333ea]"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white italic tracking-tight uppercase flex items-center gap-4">
                        <Bot className="text-primary size-10" /> Entrenamiento IA
                    </h1>
                    <p className="text-slate-400 font-bold mt-2">Configura cómo se comporta y qué sabe tu asistente virtual.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="glow-button min-w-[200px]"
                >
                    {saving ? <div className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border shadow-2xl animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: System Prompt */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-3">
                                <Sparkles size={20} className="text-primary" /> Personalidad (Prompt del Sistema)
                            </h2>
                        </div>

                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6 italic border-l-2 border-primary/30 pl-4">
                            Define quién es el asistente, cómo debe responder y cuáles son sus objetivos principales.
                        </p>

                        <textarea
                            value={config.system_prompt}
                            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                            className="flex-1 w-full p-6 rounded-2xl border border-white/5 bg-background-dark/50 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none shadow-inner leading-relaxed"
                            placeholder="Ej: Eres un asistente experto en fitness..."
                        />
                    </div>

                    <div className="glass-card">
                        <h2 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-3 mb-8">
                            <Info size={20} className="text-secondary" /> Base de Conocimiento
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Servicios (Lista simple)</label>
                                    <Activity size={12} className="text-slate-500 animate-pulse" />
                                </div>
                                <textarea
                                    value={config.knowledge_base.services.join('\n')}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        knowledge_base: { ...config.knowledge_base, services: e.target.value.split('\n').filter(s => s.trim() !== '') }
                                    })}
                                    className="w-full h-32 p-4 rounded-2xl border border-white/5 bg-background-dark/50 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                    placeholder="Entrenamiento Personal\nPlanificación Nutricional..."
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Aprender de Sitio Web (URL)</label>
                                    <Globe size={12} className="text-secondary animate-pulse" />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={config.knowledge_base.scraped_url || ''}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            knowledge_base: { ...config.knowledge_base, scraped_url: e.target.value }
                                        })}
                                        className="flex-1 p-4 rounded-2xl border border-white/5 bg-background-dark/50 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="https://misitio.com"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!config.knowledge_base.scraped_url) return;
                                            setSaving(true);
                                            setMessage({ type: 'success', text: 'Analizando sitio...' });
                                            try {
                                                const res = await fetch('/api/ai/scrape', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ url: config.knowledge_base.scraped_url })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    setConfig({
                                                        ...config,
                                                        knowledge_base: { ...config.knowledge_base, scraped_content: data.content }
                                                    });
                                                    setMessage({ type: 'success', text: 'Contenido extraído exitosamente.' });
                                                } else {
                                                    setMessage({ type: 'error', text: data.error || 'Error al leer sitio' });
                                                }
                                            } catch (e) {
                                                setMessage({ type: 'error', text: 'Falló el análisis.' });
                                            }
                                            setSaving(false);
                                        }}
                                        disabled={saving || !config.knowledge_base.scraped_url}
                                        className="px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all disabled:opacity-50"
                                    >
                                        <Globe size={18} />
                                    </button>
                                </div>
                            </div>

                            {config.knowledge_base.scraped_content && (
                                <div className="animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Contenido Analizado</label>
                                        <span className="text-[9px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-bold uppercase">Listo</span>
                                    </div>
                                    <textarea
                                        value={config.knowledge_base.scraped_content}
                                        readOnly
                                        className="w-full h-48 p-4 rounded-2xl border border-white/5 bg-background-dark/30 text-slate-400 text-xs font-mono leading-relaxed focus:outline-none resize-none"
                                    />
                                    <p className="text-[9px] text-slate-600 mt-2 text-right uppercase tracking-widest">
                                        {config.knowledge_base.scraped_content.length} caracteres
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Parameters & Info */}
                <div className="space-y-8">
                    <div className="glass-card space-y-8">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5 pb-4 italic">Variables Operativas</h2>

                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-white/90">Creatividad</label>
                                    <span className="text-primary font-black animate-pulse">{config.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1.5"
                                    step="0.1"
                                    value={config.temperature}
                                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                    className="w-full accent-primary h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between mt-3 px-1">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Preciso</span>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Creativo</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold italic mt-4 leading-relaxed">
                                    Valores bajos (0.2) dan respuestas más concretas. Valores altos (0.8+) son más conversacionales.
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                    <CheckCircle size={16} />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Estado del Modelo</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                                El modelo utilizará el prompt y el conocimiento proporcionado para responder.
                            </p>
                        </div>
                    </div>

                    <div className="glass-card bg-gradient-to-br from-primary/10 to-accent/5 border-white/10 group">
                        <h2 className="text-[10px] font-black text-primary mb-3 uppercase tracking-[0.3em] italic">Tip de Optimización</h2>
                        <p className="text-[10px] text-slate-400 font-bold leading-loose uppercase tracking-tighter group-hover:text-slate-300 transition-colors">
                            Define explícitamente qué temas NO debe tratar el bot para evitar respuestas incorrectas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
