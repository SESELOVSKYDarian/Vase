'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    User, Building2, Bot, ArrowRight, ArrowLeft,
    Sparkles, CheckCircle2, ShieldCheck, Zap,
    Phone, Mail, FileText, Globe, Upload, Search,
    Loader2, Check, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { generateOTP, processTrainingFiles, scrapeWebsiteUrl } from '@/lib/onboarding-utils';

export default function SignupPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        phone: '',
        business_name: '',
        business_type: '',
        bot_tone: 'cercano',
        bot_objective: 'ventas',
        website_url: '',
    });

    const [otp, setOtp] = useState('');
    const [tempUserId, setTempUserId] = useState<string | null>(null); // Para almacenar el userId temporal
    const [files, setFiles] = useState<File[]>([]);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeResult, setScrapeResult] = useState<any>(null);

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleInitialSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Simplemente validar y avanzar al siguiente paso
        // La creación del usuario se hará después de la verificación
        setTimeout(() => {
            setLoading(false);
            nextStep();
        }, 500);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError(null);

        // Verificación simple con código maestro
        if (otp === '123456') {
            setTimeout(() => {
                setVerifying(false);
                nextStep();
            }, 500);
        } else {
            setError('Código inválido. Usa 123456 para continuar.');
            setVerifying(false);
        }
    };

    const handleScrape = async () => {
        if (!formData.website_url) return;
        setIsScraping(true);
        const result = await scrapeWebsiteUrl(formData.website_url);
        setScrapeResult(result);
        setIsScraping(false);
    };

    const handleFinalize = async () => {
        setLoading(true);
        setError(null);

        try {
            // Llamar a la API para completar el signup (bypassa RLS)
            const response = await fetch('/api/auth/complete-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    business_name: formData.business_name,
                    business_type: formData.business_type,
                    phone: formData.phone,
                    bot_tone: formData.bot_tone,
                    bot_objective: formData.bot_objective,
                    website_url: formData.website_url,
                    files_count: files.length,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al completar el registro');
            }

            // Redirigir al login con mensaje de éxito
            alert('¡Cuenta creada exitosamente! Por favor inicia sesión.');
            router.push('/login');
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-secondary/20 blur-[100px]"></div>
            </div>

            <div className="w-full max-w-2xl relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">
                        <Zap size={14} className="text-secondary" />
                        Paso {step} de 5
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">Neural Onboarding</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">Configura tu ecosistema VaseLabs</p>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8 px-10">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-primary shadow-[0_0_10px_#9333ea]' : 'bg-white/5'}`}
                        ></div>
                    ))}
                </div>

                <div className="glass-card">
                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                        <form onSubmit={handleInitialSignup} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Identidad Core</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Ingresa tus credenciales maestras.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Email Corporativo</label>
                                    <input
                                        type="email" required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        placeholder="admin@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Contraseña</label>
                                    <input
                                        type="password" required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Teléfono / WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="tel" required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            placeholder="+54 9 11 ..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="glow-button w-full py-4 uppercase tracking-[0.2em] text-xs">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Siguiente Fase <ArrowRight size={16} /></>}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: VERIFICATION */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Verificación Manual</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Valida tu conexión neural.</p>
                                </div>
                            </div>

                            <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                <Mail className="mx-auto text-primary mb-4" size={32} />
                                {error && (
                                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex items-center justify-center gap-2">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}

                                <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-3 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Mail size={40} className="text-primary" />
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                            <AlertCircle size={18} className="text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-primary/80 font-black uppercase tracking-[0.2em]">Entorno de Pruebas</p>
                                            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                                                Para agilizar el registro, usa el código maestro: <br />
                                                <span className="text-white font-black text-sm tracking-[0.3em]">123456</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-32 bg-white/5 border-2 border-primary/20 rounded-xl py-3 text-center text-xl font-black tracking-[0.5em] text-white focus:border-primary focus:outline-none"
                                    placeholder="000000"
                                />
                            </div>

                            {error && <div className="text-red-400 text-[10px] font-black uppercase text-center">{error}</div>}

                            <div className="flex gap-4">
                                <button onClick={prevStep} className="px-6 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">Volver</button>
                                <button onClick={handleVerify} disabled={verifying} className="glow-button flex-1 py-4 uppercase tracking-[0.2em] text-xs">
                                    {verifying ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Validar Identidad'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: BUSINESS */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Perfil Corporativo</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Contextualiza tu entorno operativo.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Nombre de la Empresa</label>
                                    <input
                                        type="text" required
                                        value={formData.business_name}
                                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                                        placeholder="VaseLabs Corp"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Rubro / Sector</label>
                                    <select
                                        value={formData.business_type}
                                        onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                                    >
                                        <option value="">Seleccionar Sector</option>
                                        <option value="fitness">Fitness & Salud</option>
                                        <option value="retail">Retail / E-commerce</option>
                                        <option value="services">Servicios Integrales</option>
                                    </select>
                                </div>
                            </div>

                            <button onClick={nextStep} className="glow-button w-full py-4 uppercase tracking-[0.2em] text-xs">Continuar Fase</button>
                        </div>
                    )}

                    {/* STEP 4: AI IDENTITY */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Identidad Neural</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Define el comportamiento del asistente.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">Tono</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, bot_tone: 'cercano' })}
                                            className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${formData.bot_tone === 'cercano' ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}
                                        >
                                            Cercano / Cálido
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, bot_tone: 'formal' })}
                                            className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${formData.bot_tone === 'formal' ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}
                                        >
                                            Formal / Corporativo
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block italic">Objetivo</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, bot_objective: 'ventas' })}
                                            className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${formData.bot_objective === 'ventas' ? 'border-secondary bg-secondary/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}
                                        >
                                            Conversión & Ventas
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, bot_objective: 'soporte' })}
                                            className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${formData.bot_objective === 'soporte' ? 'border-secondary bg-secondary/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}
                                        >
                                            Atención al Cliente
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button onClick={nextStep} className="glow-button w-full py-4 uppercase tracking-[0.2em] text-xs font-black">Configurar Entrenamiento</button>
                        </div>
                    )}

                    {/* STEP 5: TRAINING */}
                    {step === 5 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                                    <Loader2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Entrenamiento Neural</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Alimenta el nodo central de datos.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* File Upload */}
                                <div className="p-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-center hover:border-primary/50 transition-all group">
                                    <Upload className="mx-auto text-slate-500 group-hover:text-primary transition-colors mb-4" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cargar Documentos (PDF, Txt)</p>
                                    <input
                                        type="file" multiple
                                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                        className="hidden" id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="inline-block px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase cursor-pointer hover:bg-white/10">Seleccionar Archivos</label>
                                    {files.length > 0 && <p className="mt-4 text-[9px] text-green-400 font-black italic uppercase">{files.length} archivos preparados</p>}
                                </div>

                                <div className="h-px bg-white/10 w-full"></div>

                                {/* Scraper */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Escanear Sitio Web (URL)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={formData.website_url}
                                            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            placeholder="https://empresa.com"
                                        />
                                        <button
                                            onClick={handleScrape} disabled={isScraping}
                                            className="px-6 rounded-xl bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all font-black"
                                        >
                                            {isScraping ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                        </button>
                                    </div>
                                    {scrapeResult && (
                                        <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                                            <CheckCircle2 size={16} className="text-green-400" />
                                            <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest italic">{scrapeResult.pages_found} páginas analizadas exitosamente</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center flex items-center justify-center gap-2 uppercase font-black tracking-widest">
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}

                            <button onClick={handleFinalize} disabled={loading} className="glow-button w-full py-4 uppercase tracking-[0.2em] text-xs">
                                {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Finalizar y Desplegar IA'}
                            </button>
                        </div>
                    )}
                </div>

                <footer className="mt-8 text-center">
                    <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em]">© 2026 VaseLabs AI Research</p>
                </footer>
            </div>
        </div>
    );
}
