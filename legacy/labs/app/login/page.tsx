'use client';

import { useState, useTransition } from 'react';
import { login } from './actions';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setError(null);
        startTransition(async () => {
            const result = await login(formData);
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                        <ShieldCheck size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceso Seguro</span>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-2">VaseLabs</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">Neural Management Portal</p>
                </div>

                <div className="glass-card">
                    <form action={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Identidad de Usuario</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    name="email"
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="nombre@empresa.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block italic">Clave de Acceso</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    name="password"
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest text-center animate-pulse">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="glow-button w-full py-4 uppercase tracking-[0.2em] text-xs"
                        >
                            {isPending ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                            ) : (
                                <>Iniciar Secuencia <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            ¿No tienes una cuenta? <br />
                            <Link href="/signup" className="text-primary hover:text-primary-light transition-colors flex items-center justify-center gap-2 mt-2">
                                Crear Identidad Neural <Sparkles size={14} />
                            </Link>
                        </p>
                    </div>
                </div>

                <footer className="mt-10 text-center">
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em]">© 2026 VaseLabs AI Research</p>
                </footer>
            </div>
        </div>
    );
}
